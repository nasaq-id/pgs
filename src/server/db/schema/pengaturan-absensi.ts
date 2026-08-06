import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const pengaturanAbsensi = pgTable("pengaturan_absensi", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().unique().references(() => sekolah.id, { onDelete: "cascade" }),
  jamMasuk: text("jam_masuk").notNull().default("07:00"),
  jamPulang: text("jam_pulang").notNull().default("14:00"),
  toleransi: integer("toleransi").notNull().default(15),
  jamMasukSiswa: text("jam_masuk_siswa").notNull().default("07:00"),
  jamPulangSiswa: text("jam_pulang_siswa").notNull().default("14:00"),
  toleransiSiswa: integer("toleransi_siswa").notNull().default(15),
  latitude: text("latitude"),
  longitude: text("longitude"),
  radius: integer("radius").notNull().default(100),
  aturanGuru: text("aturan_guru").notNull().default("per_jp"),
  hariLibur: text("hari_libur").notNull().default('["sabtu", "minggu"]'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("pengaturan_absensi_sekolah_id_idx").on(table.sekolahId),
])

export const pengaturanAbsensiRelations = relations(pengaturanAbsensi, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [pengaturanAbsensi.sekolahId],
    references: [sekolah.id],
  }),
}))
