import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, sql, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { payment, invoice, invoiceStatusHistory } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"


async function updateInvoiceStatus(invoiceId: string, userId: string) {
  const invResult = await db.select().from(invoice).where(eq(invoice.id, invoiceId)).limit(1)
  if (!invResult[0]) return
  const inv = invResult[0]

  const paidAmount = Number(inv.paidAmount)
  const totalAmount = Number(inv.totalAmount)
  let newStatus: string
  if (paidAmount >= totalAmount) newStatus = "paid"
  else if (paidAmount > 0) newStatus = "partially_paid"
  else newStatus = "issued"

  await db.update(invoice).set({ status: newStatus as any }).where(eq(invoice.id, invoiceId))
  await db.insert(invoiceStatusHistory).values({
    id: crypto.randomUUID(),
    sekolahId: inv.sekolahId,
    invoiceId,
    fromStatus: inv.status,
    toStatus: newStatus as any,
    changedBy: userId,
    note: `Payment updated: paidAmount=${paidAmount}`,
  })
}

// TODO: payment gateway webhook handler — auto-verify payments on callback
export const paymentRouter = router({
  // ─── LIST PENDING VERIFICATIONS ──────────────────────────
  listPending: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      let data = await db
        .select()
        .from(payment)
        .where(eq(payment.status, "pending_verification"))
        .orderBy(desc(payment.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      // Multi-tenant filter via invoice → siswa → sekolah
      if (sekolahIdFilter) {
        const invoiceIds = [...new Set(data.map((p) => p.invoiceId))]
        const invoices = await db.select().from(invoice).where(inArray(invoice.id, invoiceIds.length > 0 ? invoiceIds : [""]))

        // Get siswa for sekolah check
        const validSiswaIds = new Set(
          (await db.query.siswa.findMany({
            where: (siswa: any, { eq }: any) => eq(siswa.sekolahId, sekolahIdFilter),
            columns: { id: true },
          })).map((s: any) => s.id),
        )

        const validInvs = invoices.filter((i) => validSiswaIds.has(i.studentId))
        const finalValidIds = new Set(validInvs.map((i) => i.id))
        data = data.filter((p) => finalValidIds.has(p.invoiceId))
      }

      return data
    }),

  // ─── GET PENDING COUNT (for badge) ───────────────────────
  getPendingCount: protectedProcedure
    .query(async ({ ctx }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(payment.status, "pending_verification")]
      if (sekolahIdFilter) {
        conditions.push(eq(payment.sekolahId, sekolahIdFilter))
      }
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(payment)
        .where(and(...conditions))
      return Number(result[0]?.count || 0)
    }),

  // ─── VERIFY PAYMENT ──────────────────────────────────────
  verify: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), receiptNumber: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!
      const sekolahId = requireSekolahId(ctx)
      const existing = await db.select().from(payment).where(eq(payment.id, input.id)).limit(1)
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
      const pay = existing[0]
      if (pay.sekolahId !== sekolahId) throw new TRPCError({ code: "NOT_FOUND" })
      if (pay.status !== "pending_verification") throw new TRPCError({ code: "BAD_REQUEST", message: "Pembayaran sudah diverifikasi" })

      await db
        .update(payment)
        .set({
          status: "verified",
          verifiedBy: userId,
          verifiedAt: new Date(),
          receiptNumber: input.receiptNumber || pay.receiptNumber,
        })
        .where(eq(payment.id, input.id))

      // Update invoice paidAmount
      const invResult = await db.select().from(invoice).where(eq(invoice.id, pay.invoiceId)).limit(1)
      if (invResult[0]) {
        const inv = invResult[0]
        const newPaidAmount = Number(inv.paidAmount) + Number(pay.amount)
        await db
          .update(invoice)
          .set({ paidAmount: String(newPaidAmount) as any })
          .where(eq(invoice.id, pay.invoiceId))

        await updateInvoiceStatus(pay.invoiceId, userId)
      }

      await logAudit(ctx, { action: "verify_payment", entity: "payment", entityId: input.id })
      return { success: true }
    }),

  // ─── REJECT PAYMENT ──────────────────────────────────────
  reject: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), reason: z.string().min(1, "Alasan reject wajib") })))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!
      const sekolahId = requireSekolahId(ctx)
      const existing = await db.select().from(payment).where(eq(payment.id, input.id)).limit(1)
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
      if (existing[0].sekolahId !== sekolahId) throw new TRPCError({ code: "NOT_FOUND" })
      if (existing[0].status !== "pending_verification") throw new TRPCError({ code: "BAD_REQUEST", message: "Pembayaran sudah diverifikasi" })

      await db
        .update(payment)
        .set({ status: "rejected", verifiedBy: userId, verifiedAt: new Date(), rejectReason: input.reason })
        .where(eq(payment.id, input.id))

      await logAudit(ctx, { action: "reject_payment", entity: "payment", entityId: input.id, metadata: { reason: input.reason } })
      return { success: true }
    }),

  // ─── RECORD CASH PAYMENT ─────────────────────────────────
  recordCash: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(
      z.object({
        invoiceId: z.string(),
        amount: z.number().positive(),
        receiptNumber: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!
      const sekolahId = requireSekolahId(ctx)
      const invResult = await db.select().from(invoice).where(eq(invoice.id, input.invoiceId)).limit(1)
      if (!invResult[0]) throw new TRPCError({ code: "NOT_FOUND" })
      const inv = invResult[0]
      if (inv.sekolahId !== sekolahId) throw new TRPCError({ code: "NOT_FOUND" })

      const payId = crypto.randomUUID()
      await db.insert(payment).values({
        id: payId,
        sekolahId: inv.sekolahId,
        invoiceId: input.invoiceId,
        amount: String(input.amount) as any,
        method: "cash",
        status: "verified",
        verifiedBy: userId,
        verifiedAt: new Date(),
        paidAt: new Date(),
        receiptNumber: input.receiptNumber || `REC-${Date.now()}`,
      })

      // Update invoice paidAmount
      const newPaidAmount = Number(inv.paidAmount) + input.amount
      await db
        .update(invoice)
        .set({ paidAmount: String(newPaidAmount) as any })
        .where(eq(invoice.id, input.invoiceId))

      await updateInvoiceStatus(input.invoiceId, userId)
      await logAudit(ctx, { action: "record_cash", entity: "payment", entityId: payId, metadata: { invoiceId: input.invoiceId, amount: input.amount } })

      return { success: true, paymentId: payId }
    }),

  // ─── PAYMENT HISTORY FOR INVOICE ─────────────────────────
  getHistory: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      return db
        .select()
        .from(payment)
        .where(and(
          eq(payment.invoiceId, input.invoiceId),
          sekolahIdFilter ? eq(payment.sekolahId, sekolahIdFilter) : undefined,
        ))
        .orderBy(desc(payment.paidAt))
    }),
})
