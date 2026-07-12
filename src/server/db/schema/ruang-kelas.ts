import { pgTable, text, integer, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const ruangKelas = pgTable("ruang_kelas", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  namaRuang: text("nama_ruang").notNull(),
  kapasitas: integer("kapasitas"),
}, (table) => [
  index("ruang_kelas_sekolah_id_idx").on(table.sekolahId),
])

export const ruangKelasRelations = relations(ruangKelas, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [ruangKelas.sekolahId],
    references: [sekolah.id],
  }),
}))
