import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const poinAturan = pgTable("poin_aturan", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  poinMin: integer("poin_min").notNull(),
  poinMax: integer("poin_max").notNull(),
  tindakLanjut: text("tindak_lanjut").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("poin_aturan_sekolah_id_idx").on(table.sekolahId),
])

export const poinAturanRelations = relations(poinAturan, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [poinAturan.sekolahId],
    references: [sekolah.id],
  }),
}))
