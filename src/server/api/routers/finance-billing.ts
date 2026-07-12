import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, or, inArray, sql, desc } from "drizzle-orm"
import { db } from "@/server/db"
import { invoice, invoiceStatusHistory, billingType, feeStructure, discount } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const invoiceSchema = z.object({
  studentId: z.string(),
  billingTypeId: z.string(),
  academicYearId: z.string(),
  periodMonth: z.number().int().min(1).max(12).nullable().optional(),
  periodYear: z.number().int().nullable().optional(),
  amount: z.number().positive(),
  discountAmount: z.number().min(0).default(0),
  lateFeeAmount: z.number().min(0).default(0),
  totalAmount: z.number().positive(),
  dueDate: z.coerce.date(),
})

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

async function writeStatusHistory(sekolahId: string, invoiceId: string, fromStatus: string | null, toStatus: string, changedBy: string, note?: string) {
  await db.insert(invoiceStatusHistory).values({
    id: crypto.randomUUID(),
    sekolahId,
    invoiceId,
    fromStatus: fromStatus as any,
    toStatus: toStatus as any,
    changedBy,
    note,
  })
}

export const billingRouter = router({
  // ─── GET ALL INVOICES (with siswa name & kelas) ──────────
  getAll: protectedProcedure
    .input(
      z.object({
        billingTypeId: z.string().optional(),
        status: z.string().optional(),
        kelasId: z.string().optional(),
        periodMonth: z.number().optional(),
        periodYear: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions: any[] = []

      if (input.billingTypeId) conditions.push(eq(invoice.billingTypeId, input.billingTypeId))
      if (input.status) conditions.push(eq(invoice.status, input.status as any))
      if (input.periodMonth) conditions.push(eq(invoice.periodMonth, input.periodMonth))
      if (input.periodYear) conditions.push(eq(invoice.periodYear, input.periodYear))

      // Multi-tenant: inject allowed siswa IDs into SQL WHERE
      if (sekolahIdFilter) {
        const siswaRecords = await db.query.siswa.findMany({
          where: (siswa: any, { eq }: any) => eq(siswa.sekolahId, sekolahIdFilter),
          columns: { id: true },
        })
        conditions.push(inArray(invoice.studentId, siswaRecords.map((s: any) => s.id)))
      }

      const data = await db
        .select()
        .from(invoice)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(invoice.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      return data
    }),

  // ─── GET INVOICES BY STUDENT ─────────────────────────────
  getByStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const siswaRecord = await db.query.siswa.findFirst({
          where: (siswa: any, { eq }: any) => and(eq(siswa.id, input.studentId), eq(siswa.sekolahId, sekolahIdFilter)),
        })
        if (!siswaRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      }
      return db
        .select()
        .from(invoice)
        .where(eq(invoice.studentId, input.studentId))
        .orderBy(desc(invoice.periodYear), desc(invoice.periodMonth))
    }),

  // ─── GET INVOICE DETAIL ──────────────────────────────────
  getDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await db
        .select()
        .from(invoice)
        .where(eq(invoice.id, input.id))
        .limit(1)
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" })
      const inv = result[0]

      const statusHistory = await db
        .select()
        .from(invoiceStatusHistory)
        .where(eq(invoiceStatusHistory.invoiceId, input.id))
        .orderBy(invoiceStatusHistory.changedAt)

      return { invoice: inv, statusHistory }
    }),

  // ─── GENERATE INVOICES (bulk) ────────────────────────────
  generate: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(
      z.object({
        billingTypeId: z.string(),
        studentIds: z.array(z.string()).optional(),
        kelasId: z.string().optional(),
        periodeBulan: z.number().int().min(1).max(12),
        periodeTahun: z.number().int(),
        dueDate: z.coerce.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!
      if (!ctx.session.user.sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const sekolahId = ctx.session.user.sekolahId
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)

      // Resolve target students
      let targetSiswaIds = input.studentIds || []

      if (input.kelasId && targetSiswaIds.length === 0) {
        const kelasSiswa = await db.query.siswa.findMany({
          where: (siswa: any, { eq }: any) => eq(siswa.kelasId, input.kelasId),
          columns: { id: true },
        })
        targetSiswaIds = kelasSiswa.map((s: any) => s.id)
      }

      if (targetSiswaIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tidak ada siswa target" })
      }

      // Multi-tenant filter
      if (sekolahIdFilter) {
        const validSiswa = await db.query.siswa.findMany({
          where: (siswa: any, { eq }: any) => and(eq(siswa.sekolahId, sekolahId), inArray(siswa.id, targetSiswaIds)),
          columns: { id: true },
        })
        targetSiswaIds = validSiswa.map((s: any) => s.id)
      }

      // Get billing type
      const btResult = await db.select().from(billingType).where(eq(billingType.id, input.billingTypeId)).limit(1)
      if (!btResult[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Jenis tagihan tidak ditemukan" })

      // Get fee structure
      const feeResult = await db.select().from(feeStructure).where(eq(feeStructure.billingTypeId, input.billingTypeId)).limit(1)
      const amount = feeResult[0]?.amount || "0"

      // Check existing invoices for idempotency
      const existingInvs = await db
        .select({ studentId: invoice.studentId })
        .from(invoice)
        .where(
          and(
            eq(invoice.billingTypeId, input.billingTypeId),
            eq(invoice.periodMonth, input.periodeBulan),
            eq(invoice.periodYear, input.periodeTahun),
            inArray(invoice.studentId, targetSiswaIds),
          ),
        )
      const existingSet = new Set(existingInvs.map((i: any) => i.studentId))
      const newSiswaIds = targetSiswaIds.filter((id) => !existingSet.has(id))

      // Get active discounts for these students
      const activeDiscounts = await db
        .select()
        .from(discount)
        .where(
          and(
            inArray(discount.studentId, newSiswaIds),
            eq(discount.isActive, true),
          ),
        )

      const discountMap = new Map<string, typeof activeDiscounts[0]>()
      for (const d of activeDiscounts) {
        if (!discountMap.has(d.studentId)) discountMap.set(d.studentId, d)
      }

      // Find active academic year
      const tahunAjaranActive = await db.query.tahunAjaran.findFirst({
        where: (ta: any, { eq }: any) => eq(ta.active, true),
      })
      const academicYearId = tahunAjaranActive?.id || ""

      const created: any[] = []
      for (const studentId of newSiswaIds) {
        const baseAmount = Number(amount)
        let discountAmount = 0
        const studentDiscount = discountMap.get(studentId)
        if (studentDiscount) {
          if (studentDiscount.valueType === "fixed") {
            discountAmount = Math.min(Number(studentDiscount.value), baseAmount)
          } else if (studentDiscount.valueType === "percent") {
            discountAmount = Math.round(baseAmount * Number(studentDiscount.value) / 100)
          }
        }
        const totalAmount = baseAmount - discountAmount

        const invId = crypto.randomUUID()
        await db.insert(invoice).values({
          id: invId,
          sekolahId,
          studentId,
          billingTypeId: input.billingTypeId,
          academicYearId,
          periodMonth: input.periodeBulan,
          periodYear: input.periodeTahun,
          amount: String(baseAmount) as any,
          discountAmount: String(discountAmount) as any,
          lateFeeAmount: "0",
          totalAmount: String(totalAmount) as any,
          paidAmount: "0",
          dueDate: input.dueDate,
          status: "issued",
          generatedBy: userId,
        })

        await writeStatusHistory(sekolahId, invId, null, "issued", userId, "Generated bulk")

        created.push({ id: invId, studentId, totalAmount })
      }

      await logAudit(ctx, {
        action: "generate_bulk",
        entity: "invoice",
        metadata: {
          billingTypeId: input.billingTypeId,
          periodeBulan: input.periodeBulan,
          periodeTahun: input.periodeTahun,
          count: created.length,
          skipped: targetSiswaIds.length - created.length,
        },
      })

      return { created: created.length, skipped: targetSiswaIds.length - created.length, invoices: created }
    }),

  // TODO: scheduled job — auto-update status to OVERDUE after dueDate + grace period (based on lateFeeRule)

  // ─── CANCEL INVOICE ──────────────────────────────────────
  cancel: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), reason: z.string().min(1, "Alasan wajib diisi") }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!
      const existing = await db.select().from(invoice).where(eq(invoice.id, input.id)).limit(1)
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
      const inv = existing[0]

      if (inv.status === "paid" || inv.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice yang sudah lunas/dibatalkan tidak bisa dibatalkan" })
      }

      await db
        .update(invoice)
        .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: input.reason })
        .where(eq(invoice.id, input.id))

      await writeStatusHistory(inv.sekolahId, input.id, inv.status, "cancelled", userId, input.reason)
      await logAudit(ctx, { action: "cancel", entity: "invoice", entityId: input.id, metadata: { reason: input.reason } })

      return { success: true }
    }),
})
