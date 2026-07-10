import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core"

// ─── CASH LEDGER ───────────────────────────────────────────

export const cashLedger = pgTable("cash_ledger", {
  id: text("id").primaryKey(),
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
