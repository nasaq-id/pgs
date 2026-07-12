import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { siswa } from "./siswa"
import { sekolah } from "./sekolah"

export const tagihanSpp = pgTable("tagihan_spp", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  noTagihan: text("no_tagihan"),
  bulan: integer("bulan").notNull(),
  tahun: integer("tahun").notNull(),
  jumlah: integer("jumlah").notNull(),
  statusPembayaran: text("status_pembayaran", { enum: ["pending", "lunas", "tertunggak"] }).notNull().default("pending"),
  tanggalBayar: timestamp("tanggal_bayar"),
}, (table) => [
  index("tagihan_spp_sekolah_id_idx").on(table.sekolahId),
])

export const tagihanSppRelations = relations(tagihanSpp, ({ one }) => ({
  siswa: one(siswa, {
    fields: [tagihanSpp.siswaId],
    references: [siswa.id],
  }),
  sekolah: one(sekolah, {
    fields: [tagihanSpp.sekolahId],
    references: [sekolah.id],
  }),
}))
