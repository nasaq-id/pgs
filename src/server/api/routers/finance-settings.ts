import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, desc } from "drizzle-orm"
import { db } from "@/server/db"
import { billingType, feeStructure, lateFeeRule } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

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
      .query(async ({ input }) => {
        if (input?.isActive !== undefined) {
          return db.select().from(billingType).where(eq(billingType.isActive, input.isActive)).orderBy(billingType.name)
        }
        return db.select().from(billingType).orderBy(billingType.name)
      }),

    create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(billingTypeSchema)
      .mutation(async ({ ctx, input }) => {
        const id = crypto.randomUUID()
        await db.insert(billingType).values({ id, ...input, category: input.category })
        await logAudit(ctx, { action: "create_billing_type", entity: "billing_type", entityId: id })
        return { id }
      }),

    update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string(), data: billingTypeSchema.partial() }))
      .mutation(async ({ ctx, input }) => {
        await db.update(billingType).set(input.data).where(eq(billingType.id, input.id))
        await logAudit(ctx, { action: "update_billing_type", entity: "billing_type", entityId: input.id })
        return { success: true }
      }),

    toggle: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.select().from(billingType).where(eq(billingType.id, input.id)).limit(1)
        if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
        await db.update(billingType).set({ isActive: !existing[0].isActive }).where(eq(billingType.id, input.id))
        return { isActive: !existing[0].isActive }
      }),
  }),

  // ─── FEE STRUCTURE CRUD ──────────────────────────────────
  feeStructure: router({
    list: protectedProcedure
      .input(z.object({ billingTypeId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        if (input?.billingTypeId) {
          return db
            .select()
            .from(feeStructure)
            .where(eq(feeStructure.billingTypeId, input.billingTypeId))
            .orderBy(desc(feeStructure.effectiveFrom))
        }
        return db.select().from(feeStructure).orderBy(desc(feeStructure.effectiveFrom))
      }),

    create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(feeStructureSchema)
      .mutation(async ({ ctx, input }) => {
        const id = crypto.randomUUID()
        await db.insert(feeStructure).values({
          id,
          ...input,
          amount: String(input.amount) as any,
        })
        await logAudit(ctx, { action: "create_fee_structure", entity: "fee_structure", entityId: id })
        return { id }
      }),

    update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string(), data: feeStructureSchema.partial() }))
      .mutation(async ({ ctx, input }) => {
        const updateData: any = { ...input.data }
        if (updateData.amount) updateData.amount = String(updateData.amount) as any
        await db.update(feeStructure).set(updateData).where(eq(feeStructure.id, input.id))
        await logAudit(ctx, { action: "update_fee_structure", entity: "fee_structure", entityId: input.id })
        return { success: true }
      }),
  }),

  // ─── LATE FEE RULE CRUD ──────────────────────────────────
  lateFeeRule: router({
    list: protectedProcedure
      .input(z.object({ billingTypeId: z.string().optional() }).optional())
      .query(async ({ input }) => {
        if (input?.billingTypeId) {
          return db.select().from(lateFeeRule).where(eq(lateFeeRule.billingTypeId, input.billingTypeId))
        }
        return db.select().from(lateFeeRule)
      }),

    create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(lateFeeRuleSchema)
      .mutation(async ({ ctx, input }) => {
        const id = crypto.randomUUID()
        await db.insert(lateFeeRule).values({ id, ...input, value: String(input.value) as any })
        await logAudit(ctx, { action: "create_late_fee_rule", entity: "late_fee_rule", entityId: id })
        return { id }
      }),

    toggle: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.select().from(lateFeeRule).where(eq(lateFeeRule.id, input.id)).limit(1)
        if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND" })
        await db.update(lateFeeRule).set({ isActive: !existing[0].isActive }).where(eq(lateFeeRule.id, input.id))
        return { isActive: !existing[0].isActive }
      }),
  }),
})
