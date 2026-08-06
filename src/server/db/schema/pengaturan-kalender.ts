import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const pengaturanKalender = pgTable("pengaturan_kalender", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  tanggalMulaiGanjil: text("tanggal_mulai_ganjil").notNull().default("07-15"),
  tanggalSelesaiGanjil: text("tanggal_selesai_ganjil").notNull().default("12-22"),
  tanggalMulaiGenap: text("tanggal_mulai_genap").notNull().default("01-02"),
  tanggalSelesaiGenap: text("tanggal_selesai_genap").notNull().default("06-30"),
  selaraskanSenin: boolean("selaraskan_senin").notNull().default(true),
  hariLiburMingguan: text("hari_libur_mingguan").notNull().default('["sabtu", "minggu"]'),
  hariLiburMingguanGuru: text("hari_libur_mingguan_guru").notNull().default('["sabtu", "minggu"]'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("pengaturan_kalender_sekolah_id_idx").on(table.sekolahId),
])

export const pengaturanKalenderRelations = relations(pengaturanKalender, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [pengaturanKalender.sekolahId],
    references: [sekolah.id],
  }),
}))
