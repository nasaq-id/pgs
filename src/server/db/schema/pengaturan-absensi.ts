import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const pengaturanAbsensi = pgTable("pengaturan_absensi", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().unique().references(() => sekolah.id, { onDelete: "cascade" }),
  jamMasuk: text("jam_masuk").notNull().default("07:00"),
  jamPulang: text("jam_pulang").notNull().default("14:00"),
  toleransi: integer("toleransi").notNull().default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const pengaturanAbsensiRelations = relations(pengaturanAbsensi, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [pengaturanAbsensi.sekolahId],
    references: [sekolah.id],
  }),
}))
