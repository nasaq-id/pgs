import { pgTable, text, integer, boolean, index, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

import { pengampu } from "./pengampu"

export const mataPelajaran = pgTable("mata_pelajaran", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  namaMapel: text("nama_mapel").notNull(),
  kodeMapel: text("kode_mapel"),
  kelompok: text("kelompok", { enum: ["A", "B", "C", "muatan_lokal"] }),
  kkm: integer("kkm").default(70),
  jumlahJam: integer("jumlah_jam").notNull().default(0),
  aktif: boolean("aktif").notNull().default(true),
  urutan: integer("urutan").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("mata_pelajaran_sekolah_id_idx").on(table.sekolahId),
])

export const mataPelajaranRelations = relations(mataPelajaran, ({ one, many }) => ({
  sekolah: one(sekolah, {
    fields: [mataPelajaran.sekolahId],
    references: [sekolah.id],
  }),
  pengampu: many(pengampu),
}))
