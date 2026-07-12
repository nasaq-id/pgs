import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const tahunAjaran = pgTable("tahun_ajaran", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  namaTahunAjaran: text("nama_tahun_ajaran").notNull(),
  tanggalMulai: timestamp("tanggal_mulai"),
  tanggalSelesai: timestamp("tanggal_selesai"),
  semester: text("semester", { enum: ["ganjil", "genap"] }).notNull(),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("tahun_ajaran_sekolah_id_idx").on(table.sekolahId),
])

export const tahunAjaranRelations = relations(tahunAjaran, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [tahunAjaran.sekolahId],
    references: [sekolah.id],
  }),
}))
