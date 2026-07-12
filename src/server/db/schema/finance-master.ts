import { pgTable, text, numeric, integer, boolean, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

// ─── BILLING TYPE ──────────────────────────────────────────

export const billingType = pgTable("billing_type", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: ["recurring", "one_time"] }).notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("billing_type_sekolah_id_idx").on(table.sekolahId),
])

// ─── FEE STRUCTURE ─────────────────────────────────────────

export const feeStructure = pgTable("fee_structure", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  billingTypeId: text("billing_type_id").notNull().references(() => billingType.id, { onDelete: "cascade" }),
  academicYearId: text("academic_year_id").notNull(),
  gradeLevel: text("grade_level").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("fee_structure_sekolah_id_idx").on(table.sekolahId),
])

// ─── LATE FEE RULE ─────────────────────────────────────────

export const lateFeeRule = pgTable("late_fee_rule", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  billingTypeId: text("billing_type_id").notNull().references(() => billingType.id, { onDelete: "cascade" }),
  gracePeriodDays: integer("grace_period_days").notNull().default(0),
  feeType: text("fee_type", { enum: ["fixed", "percent", "per_day"] }).notNull(),
  value: numeric("value", { precision: 14, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("late_fee_rule_sekolah_id_idx").on(table.sekolahId),
])

// ─── RELATIONS ─────────────────────────────────────────────

export const billingTypeRelations = relations(billingType, ({ one, many }) => ({
  sekolah: one(sekolah, {
    fields: [billingType.sekolahId],
    references: [sekolah.id],
  }),
  feeStructures: many(feeStructure),
  lateFeeRules: many(lateFeeRule),
}))

export const feeStructureRelations = relations(feeStructure, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [feeStructure.sekolahId],
    references: [sekolah.id],
  }),
  billingType: one(billingType, {
    fields: [feeStructure.billingTypeId],
    references: [billingType.id],
  }),
}))

export const lateFeeRuleRelations = relations(lateFeeRule, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [lateFeeRule.sekolahId],
    references: [sekolah.id],
  }),
  billingType: one(billingType, {
    fields: [lateFeeRule.billingTypeId],
    references: [billingType.id],
  }),
}))
