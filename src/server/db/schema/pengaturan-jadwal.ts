import { pgTable, text, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const pengaturanJadwal = pgTable("pengaturan_jadwal", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  durasiJP: integer("durasi_jp").notNull().default(40),
  hariAktif: text("hari_aktif").notNull().default('["senin","selasa","rabu","kamis","jumat"]'),
  jamMulai: text("jam_mulai").notNull().default("07:00"),
  jamPulang: text("jam_pulang").notNull().default("15:00"),
})

export const pengaturanJadwalRelations = relations(pengaturanJadwal, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [pengaturanJadwal.sekolahId],
    references: [sekolah.id],
  }),
}))

export const agendaKhusus = pgTable("agenda_khusus", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  hari: text("hari", { enum: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] }).notNull(),
  nama: text("nama").notNull(),
  icon: text("icon").default("clock"),
  jamMulai: text("jam_mulai").notNull(),
  jamSelesai: text("jam_selesai").notNull(),
  urutan: integer("urutan").notNull().default(0),
})

export const agendaKhususRelations = relations(agendaKhusus, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [agendaKhusus.sekolahId],
    references: [sekolah.id],
  }),
}))
