import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { siswa } from "./siswa"
import { kelas } from "./kelas"

export const absensiSiswa = pgTable("absensi_siswa", {
  id: text("id").primaryKey(),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  tanggal: timestamp("tanggal").notNull(),
  status: text("status", { enum: ["hadir", "izin", "sakit", "alpha"] }).notNull(),
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
}))
