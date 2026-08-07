import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { guru } from "./guru"
import { mataPelajaran } from "./mata-pelajaran"
import { kelas } from "./kelas"
import { tahunAjaran } from "./tahun-ajaran"

export const pengampu = pgTable("pengampu", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  tahunAjaranId: text("tahun_ajaran_id").references(() => tahunAjaran.id, { onDelete: "set null" }),
  jumlahJam: integer("jumlah_jam").notNull().default(4),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("pengampu_sekolah_id_idx").on(table.sekolahId),
  index("pengampu_mata_pelajaran_id_idx").on(table.mataPelajaranId),
  index("pengampu_kelas_id_idx").on(table.kelasId),
])

export const pengampuRelations = relations(pengampu, ({ one }) => ({
  sekolah: one(sekolah, { fields: [pengampu.sekolahId], references: [sekolah.id] }),
  guru: one(guru, { fields: [pengampu.guruId], references: [guru.id] }),
  mataPelajaran: one(mataPelajaran, { fields: [pengampu.mataPelajaranId], references: [mataPelajaran.id] }),
  kelas: one(kelas, { fields: [pengampu.kelasId], references: [kelas.id] }),
  tahunAjaran: one(tahunAjaran, { fields: [pengampu.tahunAjaranId], references: [tahunAjaran.id] }),
}))
