import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { siswa } from "./siswa"

export const tagihanSpp = pgTable("tagihan_spp", {
  id: text("id").primaryKey(),
  siswaId: text("siswa_id").notNull().references(() => siswa.id, { onDelete: "cascade" }),
  noTagihan: text("no_tagihan"),
  bulan: integer("bulan").notNull(),
  tahun: integer("tahun").notNull(),
  jumlah: integer("jumlah").notNull(),
  statusPembayaran: text("status_pembayaran", { enum: ["pending", "lunas", "tertunggak"] }).notNull().default("pending"),
  tanggalBayar: timestamp("tanggal_bayar"),
})

export const tagihanSppRelations = relations(tagihanSpp, ({ one }) => ({
  siswa: one(siswa, {
    fields: [tagihanSpp.siswaId],
    references: [siswa.id],
  }),
}))
