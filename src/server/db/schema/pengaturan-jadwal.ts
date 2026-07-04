import { pgTable, text, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const pengaturanJadwal = pgTable("pengaturan_jadwal", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  durasiJP: integer("durasi_jp").notNull().default(40),
  jamMulai: text("jam_mulai").notNull().default("07:00"),
})

export const pengaturanJadwalRelations = relations(pengaturanJadwal, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [pengaturanJadwal.sekolahId],
    references: [sekolah.id],
  }),
}))
