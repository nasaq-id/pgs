import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { discount } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"


export const discountRouter = router({
  // ─── LIST DISCOUNTS ──────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ studentId: z.string().optional(), isActive: z.boolean().optional(), limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const conditions: any[] = []
      if (input.studentId) conditions.push(eq(discount.studentId, input.studentId))
      if (input.isActive !== undefined) conditions.push(eq(discount.isActive, input.isActive))

      const sekolahIdFilter = getSekolahIdFilter(ctx)
      let data = await db
        .select()
        .from(discount)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(discount.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      // Multi-tenant filter
      if (sekolahIdFilter) {
        const validSiswaIds = new Set(
          (await db.query.siswa.findMany({
            where: (siswa: any, { eq }: any) => eq(siswa.sekolahId, sekolahIdFilter),
            columns: { id: true },
          })).map((s: any) => s.id),
        )
        data = data.filter((d) => validSiswaIds.has(d.studentId))
      }

      return data
    }),

  // ─── CREATE DISCOUNT ─────────────────────────────────────
  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(
      z.object({
        studentId: z.string(),
        type: z.enum(["sibling", "scholarship", "yayasan", "other"]),
        valueType: z.enum(["percent", "fixed"]),
        value: z.number().positive(),
        validFrom: z.coerce.date(),
        validUntil: z.coerce.date().nullable().optional(),
        note: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!

      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })

      const id = crypto.randomUUID()
      await db.insert(discount).values({
        id,
        sekolahId,
        studentId: input.studentId,
        type: input.type,
        valueType: input.valueType,
        value: String(input.value) as any,
        requestedBy: userId,
        validFrom: input.validFrom,
        validUntil: input.validUntil ?? null,
        note: input.note ?? null,
      })

      await logAudit(ctx, { action: "create_discount", entity: "discount", entityId: id, metadata: { studentId: input.studentId } })
      return { id }
    }),

  // ─── APPROVE DISCOUNT ────────────────────────────────────
  approve: roleProtectedProcedure(["super_admin", "admin_sekolah", "yayasan"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id!
      const existing = await db.select().from(discount).where(eq(discount.id, input.id)).limit(1)
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
      if (existing[0].approvedBy) throw new TRPCError({ code: "BAD_REQUEST", message: "Diskon sudah diapprove" })

      await db
        .update(discount)
        .set({ approvedBy: userId, approvedAt: new Date() })
        .where(eq(discount.id, input.id))

      await logAudit(ctx, { action: "approve_discount", entity: "discount", entityId: input.id })
      return { success: true }
    }),

  // ─── TOGGLE DISCOUNT ACTIVE ──────────────────────────────
  toggle: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.select().from(discount).where(eq(discount.id, input.id)).limit(1)
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })

      await db
        .update(discount)
        .set({ isActive: !existing[0].isActive })
        .where(eq(discount.id, input.id))

      await logAudit(ctx, { action: "toggle_discount", entity: "discount", entityId: input.id })
      return { isActive: !existing[0].isActive }
    }),
})
