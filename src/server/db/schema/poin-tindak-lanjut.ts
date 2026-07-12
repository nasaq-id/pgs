import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const poinTindakLanjut = pgTable("poin_tindak_lanjut", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  jenis: text("jenis", { enum: ["positif", "negatif"] }).notNull(),
  nama: text("nama").notNull(),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("poin_tindak_lanjut_sekolah_id_idx").on(table.sekolahId),
])

export const poinTindakLanjutRelations = relations(poinTindakLanjut, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [poinTindakLanjut.sekolahId],
    references: [sekolah.id],
  }),
}))
