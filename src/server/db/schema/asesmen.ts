import { pgTable, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { users } from "./users"
import { guru } from "./guru"
import { siswa } from "./siswa"
import { kelas } from "./kelas"
import { mataPelajaran } from "./mata-pelajaran"
import { jurnalMengajar } from "./jurnal-mengajar"

export const asesmen = pgTable("asesmen", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  jurnalMengajarId: text("jurnal_mengajar_id").references(() => jurnalMengajar.id, { onDelete: "set null" }),

  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),

  kategori: text("kategori", { enum: ["formatif_awal", "formatif_proses", "sumatif"] }).notNull().default("formatif_proses"),
  teknik: text("teknik", { enum: ["tes_tertulis", "tes_lisan", "penugasan", "praktik", "proyek", "portofolio"] }).notNull().default("tes_tertulis"),
  jenisPengumpulan: text("jenis_pengumpulan", { enum: ["unggah_file", "teks", "cbt", "langsung"] }).notNull().default("unggah_file"),

  kktp: integer("kktp").notNull().default(70),
  deadline: timestamp("deadline"),

  status: text("status", { enum: ["aktif", "ditutup"] }).notNull().default("aktif"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("asesmen_sekolah_id_idx").on(table.sekolahId),
])

export const asesmenRelations = relations(asesmen, ({ one, many }) => ({
  sekolah: one(sekolah, { fields: [asesmen.sekolahId], references: [sekolah.id] }),
  guru: one(guru, { fields: [asesmen.guruId], references: [guru.id] }),
  kelas: one(kelas, { fields: [asesmen.kelasId], references: [kelas.id] }),
  mataPelajaran: one(mataPelajaran, { fields: [asesmen.mataPelajaranId], references: [mataPelajaran.id] }),
  jurnalMengajar: one(jurnalMengajar, { fields: [asesmen.jurnalMengajarId], references: [jurnalMengajar.id] }),
  siswaEntries: many(asesmenSiswa),
  komentar: many(asesmenKomentar),
}))

export const asesmenSiswa = pgTable("asesmen_siswa", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  asesmenId: text("asesmen_id").notNull().references(() => asesmen.id, { onDelete: "cascade" }),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),

  status: text("status", { enum: ["belum_dikerjakan", "sudah_mengumpulkan", "sudah_dinilai"] }).notNull().default("belum_dikerjakan"),

  jawabanTeks: text("jawaban_teks"),
  berkasUrl: text("berkas_url"),

  nilai: integer("nilai"),
  statusKetuntasan: text("status_ketuntasan", { enum: ["tuntas", "belum_tuntas"] }),
  feedback: text("feedback"),

  submittedAt: timestamp("submitted_at"),
  dinilaiAt: timestamp("dinilai_at"),
  dinilaiOleh: text("dinilai_oleh"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("asesmen_siswa_sekolah_id_idx").on(table.sekolahId),
])

export const asesmenSiswaRelations = relations(asesmenSiswa, ({ one }) => ({
  sekolah: one(sekolah, { fields: [asesmenSiswa.sekolahId], references: [sekolah.id] }),
  asesmen: one(asesmen, { fields: [asesmenSiswa.asesmenId], references: [asesmen.id] }),
  siswa: one(siswa, { fields: [asesmenSiswa.siswaId], references: [siswa.id] }),
}))

export const asesmenKomentar = pgTable("asesmen_komentar", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  asesmenId: text("asesmen_id").notNull().references(() => asesmen.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pesan: text("pesan").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("asesmen_komentar_sekolah_id_idx").on(table.sekolahId),
])

export const asesmenKomentarRelations = relations(asesmenKomentar, ({ one }) => ({
  sekolah: one(sekolah, { fields: [asesmenKomentar.sekolahId], references: [sekolah.id] }),
  asesmen: one(asesmen, { fields: [asesmenKomentar.asesmenId], references: [asesmen.id] }),
  user: one(users, { fields: [asesmenKomentar.userId], references: [users.id] }),
}))
