import { pgTable, text } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { guru } from "./guru"

export const ekstrakurikuler = pgTable("ekstrakurikuler", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  namaEkskul: text("nama_ekskul").notNull(),
  pembinaId: text("pembina_id").references(() => guru.id, { onDelete: "set null" }),
  deskripsi: text("deskripsi"),
  hari: text("hari"),
  jam: text("jam"),
})

export const ekstrakurikulerRelations = relations(ekstrakurikuler, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [ekstrakurikuler.sekolahId],
    references: [sekolah.id],
  }),
  pembina: one(guru, {
    fields: [ekstrakurikuler.pembinaId],
    references: [guru.id],
  }),
}))
