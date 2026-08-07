import { pgTable, text, integer, boolean, index, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { siswa } from "./siswa"
import { mataPelajaran } from "./mata-pelajaran"
import { tahunAjaran } from "./tahun-ajaran"

export const nilai = pgTable("nilai", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  tahunAjaranId: text("tahun_ajaran_id").references(() => tahunAjaran.id, { onDelete: "set null" }),
  nilaiTugas: integer("nilai_tugas"),
  nilaiUts: integer("nilai_uts"),
  nilaiUas: integer("nilai_uas"),
  nilaiSas: integer("nilai_sas"),
  nilaiSumatif: integer("nilai_sumatif"),
  nilaiAkhir: integer("nilai_akhir"),
  deskripsi: text("deskripsi"),
  statusPublish: boolean("status_publish").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("nilai_sekolah_id_idx").on(table.sekolahId),
  index("nilai_siswa_id_mapel_idx").on(table.siswaId, table.mataPelajaranId),
])

export const nilaiRelations = relations(nilai, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [nilai.sekolahId],
    references: [sekolah.id],
  }),
  siswa: one(siswa, {
    fields: [nilai.siswaId],
    references: [siswa.id],
  }),
  mataPelajaran: one(mataPelajaran, {
    fields: [nilai.mataPelajaranId],
    references: [mataPelajaran.id],
  }),
  tahunAjaran: one(tahunAjaran, {
    fields: [nilai.tahunAjaranId],
    references: [tahunAjaran.id],
  }),
}))
