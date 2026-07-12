import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { siswa } from "./siswa"

export const catatanMutasi = pgTable("catatan_mutasi", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  tanggalMutasi: timestamp("tanggal_mutasi").notNull(),
  jenisMutasi: text("jenis_mutasi", { enum: ["Pindah Sekolah", "Mengundurkan Diri", "Dikeluarkan", "Meninggal Dunia"] }).notNull(),
  alasanMutasi: text("alasan_mutasi").notNull(),
  sekolahTujuan: text("sekolah_tujuan"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const catatanMutasiRelations = relations(catatanMutasi, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [catatanMutasi.sekolahId],
    references: [sekolah.id],
  }),
  siswa: one(siswa, {
    fields: [catatanMutasi.siswaId],
    references: [siswa.id],
  }),
}))
