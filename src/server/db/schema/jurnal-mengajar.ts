import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { guru } from "./guru"
import { kelas } from "./kelas"
import { mataPelajaran } from "./mata-pelajaran"
import { jadwalPelajaran } from "./jadwal-pelajaran"

export const jurnalMengajar = pgTable("jurnal_mengajar", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  jadwalPelajaranId: text("jadwal_pelajaran_id").references(() => jadwalPelajaran.id, { onDelete: "set null" }),
  tanggal: timestamp("tanggal").notNull(),
  judulJurnal: text("judul_jurnal"),
  tujuanPembelajaran: text("tujuan_pembelajaran"),
  materiKonten: text("materi_konten"),
  kegiatanPembelajaran: text("kegiatan_pembelajaran"),
  catatan: text("catatan"),
  statusKehadiran: text("status_kehadiran"),
  detailKehadiran: text("detail_kehadiran"),
  status: text("status", { enum: ["draft", "selesai"] }).notNull().default("draft"),
  jamMulai: timestamp("jam_mulai"),
  jamSelesai: timestamp("jam_selesai"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("jurnal_mengajar_sekolah_id_idx").on(table.sekolahId),
])

export const jurnalMengajarRelations = relations(jurnalMengajar, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [jurnalMengajar.sekolahId],
    references: [sekolah.id],
  }),
  guru: one(guru, {
    fields: [jurnalMengajar.guruId],
    references: [guru.id],
  }),
  kelas: one(kelas, {
    fields: [jurnalMengajar.kelasId],
    references: [kelas.id],
  }),
  mataPelajaran: one(mataPelajaran, {
    fields: [jurnalMengajar.mataPelajaranId],
    references: [mataPelajaran.id],
  }),
  jadwalPelajaran: one(jadwalPelajaran, {
    fields: [jurnalMengajar.jadwalPelajaranId],
    references: [jadwalPelajaran.id],
  }),
}))
