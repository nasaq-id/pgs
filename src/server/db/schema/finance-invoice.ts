import { pgTable, text, numeric, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { billingType } from "./finance-master"

// ─── INVOICE ───────────────────────────────────────────────

export const invoice = pgTable("invoice", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull(),
  billingTypeId: text("billing_type_id").notNull().references(() => billingType.id, { onDelete: "restrict" }),
  academicYearId: text("academic_year_id").notNull(),
  periodMonth: integer("period_month"),
  periodYear: integer("period_year"),

  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  lateFeeAmount: numeric("late_fee_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).notNull().default("0"),

  dueDate: timestamp("due_date").notNull(),
  status: text("status", {
    enum: ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"],
  }).notNull().default("draft"),

  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),

  generatedBy: text("generated_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("invoice_sekolah_id_idx").on(table.sekolahId),
  uniqueIndex("idx_unique_invoice").on(
    table.studentId, table.billingTypeId, table.academicYearId, table.periodMonth, table.periodYear,
  ),
])

// ─── INVOICE STATUS HISTORY ────────────────────────────────

export const invoiceStatusHistory = pgTable("invoice_status_history", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").notNull().references(() => invoice.id, { onDelete: "cascade" }),
  fromStatus: text("from_status", {
    enum: ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"],
  }),
  toStatus: text("to_status", {
    enum: ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"],
  }).notNull(),
  changedBy: text("changed_by").notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  note: text("note"),
}, (table) => [
  index("invoice_status_history_sekolah_id_idx").on(table.sekolahId),
])

// ─── RELATIONS ─────────────────────────────────────────────

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  sekolah: one(sekolah, {
    fields: [invoice.sekolahId],
    references: [sekolah.id],
  }),
  statusHistory: many(invoiceStatusHistory),
}))

export const invoiceStatusHistoryRelations = relations(invoiceStatusHistory, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [invoiceStatusHistory.sekolahId],
    references: [sekolah.id],
  }),
  invoice: one(invoice, {
    fields: [invoiceStatusHistory.invoiceId],
    references: [invoice.id],
  }),
}))
