import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { guru } from "./guru"
import { kelas } from "./kelas"
import { mataPelajaran } from "./mata-pelajaran"
import { jurnalMengajar } from "./jurnal-mengajar"

export const tugas = pgTable("tugas", {
  id: text("id").primaryKey(),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  jurnalMengajarId: text("jurnal_mengajar_id").references(() => jurnalMengajar.id, { onDelete: "set null" }),
  judulTugas: text("judul_tugas").notNull(),
  deskripsi: text("deskripsi"),
  jenisTugas: text("jenis_tugas"),
  tanggalDiberikan: timestamp("tanggal_diberikan"),
  deadline: timestamp("deadline"),
  status: text("status", { enum: ["aktif", "ditutup"] }).notNull().default("aktif"),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const tugasRelations = relations(tugas, ({ one }) => ({
  guru: one(guru, {
    fields: [tugas.guruId],
    references: [guru.id],
  }),
  kelas: one(kelas, {
    fields: [tugas.kelasId],
    references: [kelas.id],
  }),
  mataPelajaran: one(mataPelajaran, {
    fields: [tugas.mataPelajaranId],
    references: [mataPelajaran.id],
  }),
  jurnalMengajar: one(jurnalMengajar, {
    fields: [tugas.jurnalMengajarId],
    references: [jurnalMengajar.id],
  }),
}))
