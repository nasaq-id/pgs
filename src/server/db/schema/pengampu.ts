import { pgTable, text, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { guru } from "./guru"
import { mataPelajaran } from "./mata-pelajaran"
import { kelas } from "./kelas"
import { tahunAjaran } from "./tahun-ajaran"

export const pengampu = pgTable("pengampu", {
  id: text("id").primaryKey(),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  tahunAjaranId: text("tahun_ajaran_id").references(() => tahunAjaran.id, { onDelete: "set null" }),
  jumlahJam: integer("jumlah_jam").notNull().default(4),
})

export const pengampuRelations = relations(pengampu, ({ one }) => ({
  guru: one(guru, { fields: [pengampu.guruId], references: [guru.id] }),
  mataPelajaran: one(mataPelajaran, { fields: [pengampu.mataPelajaranId], references: [mataPelajaran.id] }),
  kelas: one(kelas, { fields: [pengampu.kelasId], references: [kelas.id] }),
  tahunAjaran: one(tahunAjaran, { fields: [pengampu.tahunAjaranId], references: [tahunAjaran.id] }),
}))
