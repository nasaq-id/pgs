import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { kelas } from "./kelas"
import { mataPelajaran } from "./mata-pelajaran"
import { guru } from "./guru"

export const jadwalPelajaran = pgTable("jadwal_pelajaran", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  kelasId: text("kelas_id").notNull().references(() => kelas.id, { onDelete: "cascade" }),
  mataPelajaranId: text("mata_pelajaran_id").notNull().references(() => mataPelajaran.id, { onDelete: "cascade" }),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  hari: text("hari", { enum: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] }).notNull(),
  jamMulai: timestamp("jam_mulai"),
  jamSelesai: timestamp("jam_selesai"),
  jpMulai: integer("jp_mulai"),
  jpCount: integer("jp_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("jadwal_pelajaran_sekolah_id_idx").on(table.sekolahId),
  index("jadwal_pelajaran_kelas_id_hari_idx").on(table.kelasId, table.hari),
  index("jadwal_pelajaran_guru_id_idx").on(table.guruId),
])

export const jadwalPelajaranRelations = relations(jadwalPelajaran, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [jadwalPelajaran.sekolahId],
    references: [sekolah.id],
  }),
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
