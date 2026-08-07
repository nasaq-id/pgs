import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { kelas } from "./kelas"

export const absensiHari = pgTable("absensi_hari", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  jenis: text("jenis", { enum: ["siswa", "guru"] }).notNull(),
  kelasId: text("kelas_id").references(() => kelas.id, { onDelete: "cascade" }),
  tanggal: timestamp("tanggal").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("absensi_hari_jenis_kelas_tanggal_idx").on(table.sekolahId, table.jenis, table.kelasId, table.tanggal),
  index("absensi_hari_sekolah_id_idx").on(table.sekolahId),
  index("absensi_hari_tanggal_idx").on(table.tanggal),
])

export const absensiHariRelations = relations(absensiHari, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [absensiHari.sekolahId],
    references: [sekolah.id],
  }),
  kelas: one(kelas, {
    fields: [absensiHari.kelasId],
    references: [kelas.id],
  }),
}))
