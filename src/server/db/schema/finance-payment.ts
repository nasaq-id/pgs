import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { invoice } from "./finance-invoice"

// ─── PAYMENT ───────────────────────────────────────────────

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
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
})

// ─── RELATIONS ─────────────────────────────────────────────

export const paymentRelations = relations(payment, ({ one }) => ({
  invoice: one(invoice, {
    fields: [payment.invoiceId],
    references: [invoice.id],
  }),
}))
