import { pgTable, text, integer, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { pengaturanJadwal } from "./pengaturan-jadwal"

export const timelineItem = pgTable("timeline_item", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  pengaturanJadwalId: text("pengaturan_jadwal_id").notNull().references(() => pengaturanJadwal.id, { onDelete: "cascade" }),
  hari: text("hari", { enum: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] }).notNull(),
  tipe: text("tipe", { enum: ["jp", "pembiasaan", "upacara", "istirahat", "sholat", "lainnya"] }).notNull().default("jp"),
  label: text("label"),
  jamMulai: text("jam_mulai").notNull(),
  jamSelesai: text("jam_selesai").notNull(),
  urutan: integer("urutan").notNull().default(0),
  warna: text("warna"),
}, (table) => [
  index("timeline_item_sekolah_id_idx").on(table.sekolahId),
])

export const timelineItemRelations = relations(timelineItem, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [timelineItem.sekolahId],
    references: [sekolah.id],
  }),
  pengaturanJadwal: one(pengaturanJadwal, {
    fields: [timelineItem.pengaturanJadwalId],
    references: [pengaturanJadwal.id],
  }),
}))
