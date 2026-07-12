import { pgTable, text, numeric, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { invoice } from "./finance-invoice"

// ─── PAYMENT ───────────────────────────────────────────────

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").notNull().references(() => invoice.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  method: text("method", {
    enum: ["cash", "bank_transfer", "virtual_account", "qris", "e_wallet"],
  }).notNull(),
  paymentProofUrl: text("payment_proof_url"),
  status: text("status", {
    enum: ["pending_verification", "verified", "rejected"],
  }).notNull().default("pending_verification"),

  verifiedBy: text("verified_by"),
  verifiedAt: timestamp("verified_at"),
  rejectReason: text("reject_reason"),

  paidAt: timestamp("paid_at").notNull().defaultNow(),
  receiptNumber: text("receipt_number").unique(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("payment_sekolah_id_idx").on(table.sekolahId),
])

// ─── RELATIONS ─────────────────────────────────────────────

export const paymentRelations = relations(payment, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [payment.sekolahId],
    references: [sekolah.id],
  }),
  invoice: one(invoice, {
    fields: [payment.invoiceId],
    references: [invoice.id],
  }),
}))
