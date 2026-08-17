import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { mataPelajaran } from "./mata-pelajaran"
import { kelas } from "./kelas"
import { guru } from "./guru"

export const eMateri = pgTable("e_materi", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").references(() => kelas.id, { onDelete: "set null" }),
  tingkat: text("tingkat"),
  judul: text("judul").notNull(),
  bab: text("bab"),
  deskripsi: text("deskripsi"),
  tipeMateri: text("tipe_materi", { enum: ["dokumen", "video", "gambar", "link"] }).notNull().default("dokumen"),
  url: text("url"),
  coverUrl: text("cover_url"),
  guruId: text("guru_id").references(() => guru.id, { onDelete: "set null" }),
  status: text("status", { enum: ["terbit", "draf", "arsip"] }).notNull().default("terbit"),
  pembuatId: text("pembuat_id"),
  pembuatNama: text("pembuat_nama"),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("e_materi_sekolah_id_idx").on(table.sekolahId),
  index("e_materi_mapel_id_idx").on(table.mataPelajaranId),
])

export const eMateriRelations = relations(eMateri, ({ one }) => ({
  sekolah: one(sekolah, { fields: [eMateri.sekolahId], references: [sekolah.id] }),
  mataPelajaran: one(mataPelajaran, { fields: [eMateri.mataPelajaranId], references: [mataPelajaran.id] }),
  kelas: one(kelas, { fields: [eMateri.kelasId], references: [kelas.id] }),
  guru: one(guru, { fields: [eMateri.guruId], references: [guru.id] }),
}))
