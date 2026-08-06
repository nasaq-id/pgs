import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core"
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
}, (table) => [
  index("kalender_event_sekolah_id_idx").on(table.sekolahId),
  index("kalender_event_sekolah_id_tanggal_mulai_idx").on(table.sekolahId, table.tanggalMulai),
])

export const kalenderEventRelations = relations(kalenderEvent, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [kalenderEvent.sekolahId],
    references: [sekolah.id],
  }),
}))