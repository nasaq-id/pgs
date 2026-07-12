import { pgTable, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const guru = pgTable("guru", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  nipnuptk: text("nipnuptk"),
  nik: text("nik"),
  namaLengkap: text("nama_lengkap").notNull(),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }),
  tempatLahir: text("tempat_lahir"),
  tanggalLahir: timestamp("tanggal_lahir"),
  alamat: text("alamat"),
  noHp: text("no_hp"),
  email: text("email"),
  pendidikanTerakhir: text("pendidikan_terakhir"),
  statusKepegawaian: text("status_kepegawaian"),
  kategoriPegawai: text("kategori_pegawai"),
  tugasUtama: text("tugas_utama"),
  tugasTambahan: text("tugas_tambahan"),
  mulaiBertugas: timestamp("mulai_bertugas"),
  akhirBertugas: timestamp("akhir_bertugas"),
  jp: integer("jp"),
  foto: text("foto"),
  active: boolean("active").notNull().default(true),
  usernameGuru: text("username_guru"),
  passwordGuru: text("password_guru"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("guru_sekolah_id_idx").on(table.sekolahId),
])

export const guruRelations = relations(guru, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [guru.sekolahId],
    references: [sekolah.id],
  }),
}))
