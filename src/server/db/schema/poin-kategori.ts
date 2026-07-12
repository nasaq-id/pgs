import { pgTable, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const poinKategori = pgTable("poin_kategori", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  jenis: text("jenis", { enum: ["positif", "negatif"] }).notNull(),
  poin: integer("poin").notNull(),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("poin_kategori_sekolah_id_idx").on(table.sekolahId),
])

export const poinKategoriRelations = relations(poinKategori, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [poinKategori.sekolahId],
    references: [sekolah.id],
  }),
}))
