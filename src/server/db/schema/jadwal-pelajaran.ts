import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { kelas } from "./kelas"
import { mataPelajaran } from "./mata-pelajaran"
import { guru } from "./guru"

export const jadwalPelajaran = pgTable("jadwal_pelajaran", {
  id: text("id").primaryKey(),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  hari: text("hari", { enum: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] }).notNull(),
  jamMulai: timestamp("jam_mulai"),
  jamSelesai: timestamp("jam_selesai"),
  jpMulai: integer("jp_mulai"),
  jpCount: integer("jp_count"),
})

export const jadwalPelajaranRelations = relations(jadwalPelajaran, ({ one }) => ({
  kelas: one(kelas, {
    fields: [jadwalPelajaran.kelasId],
    references: [kelas.id],
  }),
  mataPelajaran: one(mataPelajaran, {
    fields: [jadwalPelajaran.mataPelajaranId],
    references: [mataPelajaran.id],
  }),
  guru: one(guru, {
    fields: [jadwalPelajaran.guruId],
    references: [guru.id],
  }),
}))
