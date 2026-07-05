import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { siswa } from "./siswa"
import { kelas } from "./kelas"
import { sekolah } from "./sekolah"

export const absensiSiswa = pgTable("absensi_siswa", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").references(() => sekolah.id, { onDelete: "cascade" }),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  tanggal: timestamp("tanggal").notNull(),
  status: text("status", { enum: ["hadir", "izin", "sakit", "alpha", "terlambat"] }).notNull(),
  jamMasuk: timestamp("jam_masuk"),
  jamPulang: timestamp("jam_pulang"),
  keterangan: text("keterangan"),
})

export const absensiSiswaRelations = relations(absensiSiswa, ({ one }) => ({
  siswa: one(siswa, {
    fields: [absensiSiswa.siswaId],
    references: [siswa.id],
  }),
  kelas: one(kelas, {
    fields: [absensiSiswa.kelasId],
    references: [kelas.id],
  }),
  sekolah: one(sekolah, {
    fields: [absensiSiswa.sekolahId],
    references: [sekolah.id],
  }),
}))
