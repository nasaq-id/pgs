import { pgTable, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core"

// ─── DISCOUNT ──────────────────────────────────────────────

export const discount = pgTable("discount", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  type: text("type", {
    enum: ["sibling", "scholarship", "yayasan", "other"],
  }).notNull(),
  valueType: text("value_type", {
    enum: ["percent", "fixed"],
  }).notNull(),
  value: numeric("value", { precision: 14, scale: 2 }).notNull(),

  requestedBy: text("requested_by").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),

  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until"),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
