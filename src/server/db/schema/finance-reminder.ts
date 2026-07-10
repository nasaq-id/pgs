import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { invoice } from "./finance-invoice"

// ─── REMINDER ──────────────────────────────────────────────

export const reminder = pgTable("reminder", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoice.id, { onDelete: "cascade" }),
  channel: text("channel", {
    enum: ["whatsapp", "email", "in_app"],
  }).notNull(),
  status: text("status", {
    enum: ["queued", "sent", "failed"],
  }).notNull().default("queued"),
  sentAt: timestamp("sent_at"),
  errorMsg: text("error_msg"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// TODO: cron job — process QUEUED reminders (whatsapp/email/in_app) and mark as sent/failed

// ─── RELATIONS ─────────────────────────────────────────────

export const reminderRelations = relations(reminder, ({ one }) => ({
  invoice: one(invoice, {
    fields: [reminder.invoiceId],
    references: [invoice.id],
  }),
}))
