import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { siswa } from "./siswa"
import { guru } from "./guru"
import { poinKategori } from "./poin-kategori"
import { poinTindakLanjut } from "./poin-tindak-lanjut"

export const poinSikap = pgTable("poin_sikap", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  kategoriId: text("kategori_id").notNull().references(() => poinKategori.id),
  poin: integer("poin").notNull(),
  tindakLanjutId: text("tindak_lanjut_id").references(() => poinTindakLanjut.id),
  deskripsi: text("deskripsi"),
  guruId: text("guru_id").notNull().references(() => guru.id),
  status: text("status", { enum: ["belum_diproses", "sedang_diproses", "selesai"] }).notNull().default("belum_diproses"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const poinSikapRelations = relations(poinSikap, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [poinSikap.sekolahId],
    references: [sekolah.id],
  }),
  siswa: one(siswa, {
    fields: [poinSikap.siswaId],
    references: [siswa.id],
  }),
  kategori: one(poinKategori, {
    fields: [poinSikap.kategoriId],
    references: [poinKategori.id],
  }),
  tindakLanjut: one(poinTindakLanjut, {
    fields: [poinSikap.tindakLanjutId],
    references: [poinTindakLanjut.id],
  }),
  guru: one(guru, {
    fields: [poinSikap.guruId],
    references: [guru.id],
  }),
}))
