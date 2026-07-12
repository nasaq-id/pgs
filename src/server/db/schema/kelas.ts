import { pgTable, text, integer, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { tahunAjaran } from "./tahun-ajaran"
import { guru } from "./guru"

export const kelas = pgTable("kelas", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  tahunAjaranId: text("tahun_ajaran_id").references(() => tahunAjaran.id, { onDelete: "set null" }),
  namaKelas: text("nama_kelas").notNull(),
  tingkat: text("tingkat"),
  waliKelasId: text("wali_kelas_id").references(() => guru.id, { onDelete: "set null" }),
  kapasitas: integer("kapasitas"),
}, (table) => [
  index("kelas_sekolah_id_idx").on(table.sekolahId),
])

export const kelasRelations = relations(kelas, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [kelas.sekolahId],
    references: [sekolah.id],
  }),
  tahunAjaran: one(tahunAjaran, {
    fields: [kelas.tahunAjaranId],
    references: [tahunAjaran.id],
  }),
  waliKelas: one(guru, {
    fields: [kelas.waliKelasId],
    references: [guru.id],
  }),
}))
