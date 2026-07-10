import { pgTable, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─── BILLING TYPE ──────────────────────────────────────────

export const billingType = pgTable("billing_type", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: ["recurring", "one_time"] }).notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─── FEE STRUCTURE ─────────────────────────────────────────

export const feeStructure = pgTable("fee_structure", {
  id: text("id").primaryKey(),
  billingTypeId: text("billing_type_id").notNull().references(() => billingType.id, { onDelete: "cascade" }),
  academicYearId: text("academic_year_id").notNull(),
  gradeLevel: text("grade_level").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─── LATE FEE RULE ─────────────────────────────────────────

export const lateFeeRule = pgTable("late_fee_rule", {
  id: text("id").primaryKey(),
  billingTypeId: text("billing_type_id").notNull().references(() => billingType.id, { onDelete: "cascade" }),
  gracePeriodDays: integer("grace_period_days").notNull().default(0),
  feeType: text("fee_type", { enum: ["fixed", "percent", "per_day"] }).notNull(),
  value: numeric("value", { precision: 14, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─── RELATIONS ─────────────────────────────────────────────

export const billingTypeRelations = relations(billingType, ({ many }) => ({
  feeStructures: many(feeStructure),
  lateFeeRules: many(lateFeeRule),
}))

export const feeStructureRelations = relations(feeStructure, ({ one }) => ({
  billingType: one(billingType, {
    fields: [feeStructure.billingTypeId],
    references: [billingType.id],
  }),
}))

export const lateFeeRuleRelations = relations(lateFeeRule, ({ one }) => ({
  billingType: one(billingType, {
    fields: [lateFeeRule.billingTypeId],
    references: [billingType.id],
  }),
}))
