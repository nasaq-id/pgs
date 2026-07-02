import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const notifikasi = pgTable("notifikasi", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  judul: text("judul").notNull(),
  pesan: text("pesan").notNull(),
  tipe: text("tipe", { enum: ["info", "success", "warning", "error"] }).notNull().default("info"),
  dibaca: boolean("dibaca").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const notifikasiRelations = relations(notifikasi, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [notifikasi.sekolahId],
    references: [sekolah.id],
  }),
}))