import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

// ─── CASH LEDGER ───────────────────────────────────────────

export const cashLedger = pgTable("cash_ledger", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["in", "out"],
  }).notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  recordedBy: text("recorded_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const cashLedgerRelations = relations(cashLedger, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [cashLedger.sekolahId],
    references: [sekolah.id],
  }),
}))
