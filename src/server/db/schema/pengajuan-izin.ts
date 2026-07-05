import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"
import { siswa } from "./siswa"
import { guru } from "./guru"

export const pengajuanIzin = pgTable("pengajuan_izin", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  tipePengaju: text("tipe_pengaju", { enum: ["siswa", "guru"] }).notNull(),
  siswaId: text("siswa_id").references(() => siswa.id, { onDelete: "cascade" }),
  guruId: text("guru_id").references(() => guru.id, { onDelete: "cascade" }),
  jenisIzin: text("jenis_izin", { enum: ["terlambat", "pulang_cepat", "tidak_masuk"] }).notNull(),
  alasan: text("alasan").notNull(),
  jamPulang: text("jam_pulang"), // untuk pulang cepat
  jumlahHari: integer("jumlah_hari"), // untuk tidak masuk/sakit
  tanggalMulai: timestamp("tanggal_mulai").notNull(),
  tanggalSelesai: timestamp("tanggal_selesai").notNull(),
  bukti: text("bukti"), // URL path bukti upload
  status: text("status", { enum: ["pending", "disetujui", "ditolak"] }).notNull().default("pending"),
  disetujuiOleh: text("disetujui_oleh"), // user id
  catatanApproval: text("catatan_approval"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const pengajuanIzinRelations = relations(pengajuanIzin, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [pengajuanIzin.sekolahId],
    references: [sekolah.id],
  }),
  siswa: one(siswa, {
    fields: [pengajuanIzin.siswaId],
    references: [siswa.id],
  }),
  guru: one(guru, {
    fields: [pengajuanIzin.guruId],
    references: [guru.id],
  }),
}))
