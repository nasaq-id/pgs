import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { siswa } from "./siswa"

export const prestasi = pgTable("prestasi", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  namaPrestasi: text("nama_prestasi").notNull(),
  tingkat: text("tingkat", { enum: ["sekolah", "kecamatan", "kabupaten", "provinsi", "nasional", "internasional"] }),
  juara: text("juara"),
  tanggal: timestamp("tanggal"),
  sertifikat: text("sertifikat"),
})

export const prestasiRelations = relations(prestasi, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [prestasi.sekolahId],
    references: [sekolah.id],
  }),
  siswa: one(siswa, {
    fields: [prestasi.siswaId],
    references: [siswa.id],
  }),
}))
