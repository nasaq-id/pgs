import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { invoice } from "./finance-invoice"

// ─── REMINDER ──────────────────────────────────────────────

export const reminder = pgTable("reminder", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
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
}, (table) => [
  index("reminder_sekolah_id_idx").on(table.sekolahId),
])

// TODO: cron job — process QUEUED reminders (whatsapp/email/in_app) and mark as sent/failed

// ─── RELATIONS ─────────────────────────────────────────────

export const reminderRelations = relations(reminder, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [reminder.sekolahId],
    references: [sekolah.id],
  }),
  invoice: one(invoice, {
    fields: [reminder.invoiceId],
    references: [invoice.id],
  }),
}))
