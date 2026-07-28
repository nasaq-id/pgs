import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { guru } from "./guru"
import { sekolah } from "./sekolah"

export const absensiGuru = pgTable("absensi_guru", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  guruId: text("guru_id").notNull().references(() => guru.id, { onDelete: "cascade" }),
  tanggal: timestamp("tanggal").notNull(),
  status: text("status", { enum: ["hadir", "izin", "sakit", "alpha", "terlambat"] }).notNull(),
  jamMasuk: timestamp("jam_masuk"),
  jamPulang: timestamp("jam_pulang"),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("absensi_guru_sekolah_id_idx").on(table.sekolahId),
  index("absensi_guru_guru_id_tanggal_idx").on(table.guruId, table.tanggal),
])

export const absensiGuruRelations = relations(absensiGuru, ({ one }) => ({
  guru: one(guru, {
    fields: [absensiGuru.guruId],
    references: [guru.id],
  }),
  sekolah: one(sekolah, {
    fields: [absensiGuru.sekolahId],
    references: [sekolah.id],
  }),
}))
