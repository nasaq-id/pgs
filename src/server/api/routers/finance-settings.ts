import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, desc, and } from "drizzle-orm"
import { db } from "@/server/db"
import { billingType, feeStructure, lateFeeRule } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

// ─── BILLING TYPE ──────────────────────────────────────────

const billingTypeSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["recurring", "one_time"]),
  isMandatory: z.boolean().default(true),
})

// ─── FEE STRUCTURE ─────────────────────────────────────────

const feeStructureSchema = z.object({
  billingTypeId: z.string(),
  academicYearId: z.string(),
  gradeLevel: z.string(),
  amount: z.number().positive(),
  effectiveFrom: z.coerce.date(),
})

// ─── LATE FEE RULE ─────────────────────────────────────────

const lateFeeRuleSchema = z.object({
  billingTypeId: z.string(),
  gracePeriodDays: z.number().int().min(0).default(0),
  feeType: z.enum(["fixed", "percent", "per_day"]),
  value: z.number().positive(),
})

export const settingsRouter = router({
  // ─── BILLING TYPE CRUD ───────────────────────────────────
  billingType: router({
    list: protectedProcedure
      .input(z.object({ isActive: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const sekolahIdFilter = getSekolahIdFilter(ctx as any)
        const conditions = []
        if (sekolahIdFilter) conditions.push(eq(billingType.sekolahId, sekolahIdFilter))
        if (input?.isActive !== undefined) conditions.push(eq(billingType.isActive, input.isActive))
        return db.select().from(billingType).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(billingType.name)
      }),

    create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(billingTypeSchema)
      .mutation(async ({ ctx, input }) => {
        const sekolahId = ctx.session.user.sekolahId
        if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })
        const id = crypto.randomUUID()
        await db.insert(billingType).values({ id, sekolahId, ...input, category: input.category })
        await logAudit(ctx, { action: "create_billing_type", entity: "billing_type", entityId: id })
        return { id }
      }),

    update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string(), data: billingTypeSchema.partial() }))
      .mutation(async ({ ctx, input }) => {
        const sekolahIdFilter = getSekolahIdFilter(ctx as any)
        const whereClause = sekolahIdFilter
          ? and(eq(billingType.id, input.id), eq(billingType.sekolahId, sekolahIdFilter))
          : eq(billingType.id, input.id)
        const [updated] = await db.update(billingType).set(input.data).where(whereClause).returning()
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Billing type tidak ditemukan" })
        await logAudit(ctx, { action: "update_billing_type", entity: "billing_type", entityId: input.id })
        return { success: true }
      }),

    toggle: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const sekolahIdFilter = getSekolahIdFilter(ctx as any)
        const whereClause = sekolahIdFilter
          ? and(eq(billingType.id, input.id), eq(billingType.sekolahId, sekolahIdFilter))
          : eq(billingType.id, input.id)
        const existing = await db.select().from(billingType).where(whereClause).limit(1)
        if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
        await db.update(billingType).set({ isActive: !existing[0].isActive }).where(whereClause)
        return { isActive: !existing[0].isActive }
      }),
  }),

  // ─── FEE STRUCTURE CRUD ──────────────────────────────────
  feeStructure: router({
    list: protectedProcedure
      .input(z.object({ billingTypeId: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const sekolahIdFilter = getSekolahIdFilter(ctx as any)
        const conditions = []
        if (sekolahIdFilter) conditions.push(eq(feeStructure.sekolahId, sekolahIdFilter))
        if (input?.billingTypeId) conditions.push(eq(feeStructure.billingTypeId, input.billingTypeId))
        return db.select().from(feeStructure).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(feeStructure.effectiveFrom))
      }),

    create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(feeStructureSchema)
      .mutation(async ({ ctx, input }) => {
        const sekolahId = ctx.session.user.sekolahId
        if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })
        const id = crypto.randomUUID()
        await db.insert(feeStructure).values({
          id,
          sekolahId,
          ...input,
          amount: String(input.amount) as any,
        })
        await logAudit(ctx, { action: "create_fee_structure", entity: "fee_structure", entityId: id })
        return { id }
      }),

    update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string(), data: feeStructureSchema.partial() }))
      .mutation(async ({ ctx, input }) => {
        const sekolahIdFilter = getSekolahIdFilter(ctx as any)
        const whereClause = sekolahIdFilter
          ? and(eq(feeStructure.id, input.id), eq(feeStructure.sekolahId, sekolahIdFilter))
          : eq(feeStructure.id, input.id)
        const updateData: any = { ...input.data }
        if (updateData.amount) updateData.amount = String(updateData.amount) as any
        const [updated] = await db.update(feeStructure).set(updateData).where(whereClause).returning()
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Fee structure tidak ditemukan" })
        await logAudit(ctx, { action: "update_fee_structure", entity: "fee_structure", entityId: input.id })
        return { success: true }
      }),
  }),

  // ─── LATE FEE RULE CRUD ──────────────────────────────────
  lateFeeRule: router({
    list: protectedProcedure
      .input(z.object({ billingTypeId: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const sekolahIdFilter = getSekolahIdFilter(ctx as any)
        const conditions = []
        if (sekolahIdFilter) conditions.push(eq(lateFeeRule.sekolahId, sekolahIdFilter))
        if (input?.billingTypeId) conditions.push(eq(lateFeeRule.billingTypeId, input.billingTypeId))
        return db.select().from(lateFeeRule).where(conditions.length > 0 ? and(...conditions) : undefined)
      }),

    create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(lateFeeRuleSchema)
      .mutation(async ({ ctx, input }) => {
        const sekolahId = ctx.session.user.sekolahId
        if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })
        const id = crypto.randomUUID()
        await db.insert(lateFeeRule).values({ id, sekolahId, ...input, value: String(input.value) as any })
        await logAudit(ctx, { action: "create_late_fee_rule", entity: "late_fee_rule", entityId: id })
        return { id }
      }),

    toggle: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const sekolahIdFilter = getSekolahIdFilter(ctx as any)
        const whereClause = sekolahIdFilter
          ? and(eq(lateFeeRule.id, input.id), eq(lateFeeRule.sekolahId, sekolahIdFilter))
          : eq(lateFeeRule.id, input.id)
        const existing = await db.select().from(lateFeeRule).where(whereClause).limit(1)
        if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
        await db.update(lateFeeRule).set({ isActive: !existing[0].isActive }).where(whereClause)
        return { isActive: !existing[0].isActive }
      }),
  }),
})
