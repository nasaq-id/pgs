import { pgTable, text, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const ruangKelas = pgTable("ruang_kelas", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  namaRuang: text("nama_ruang").notNull(),
  kapasitas: integer("kapasitas"),
})

export const ruangKelasRelations = relations(ruangKelas, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [ruangKelas.sekolahId],
    references: [sekolah.id],
  }),
}))
