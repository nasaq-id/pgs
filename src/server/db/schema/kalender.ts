import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const kalenderEvent = pgTable("kalender_event", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  tanggalMulai: timestamp("tanggal_mulai").notNull(),
  tanggalSelesai: timestamp("tanggal_selesai"),
  tipe: text("tipe", { enum: ["kegiatan", "libur", "lainnya"] }).notNull().default("kegiatan"),
  isLiburNasional: boolean("is_libur_nasional").notNull().default(false),
  warna: text("warna").default("#3b82f6"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const kalenderEventRelations = relations(kalenderEvent, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [kalenderEvent.sekolahId],
    references: [sekolah.id],
  }),
}))