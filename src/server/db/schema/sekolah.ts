import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./users"

export const sekolah = pgTable("sekolah", {
  id: text("id").primaryKey(),
  namaSekolah: text("nama_sekolah").notNull(),
  namaSingkat: text("nama_singkat"),
  npsn: text("npsn"),
  jenjang: text("jenjang", { enum: ["sd", "smp", "sma", "smk", "mi", "mts", "ma", "tk"] }),
  alamat: text("alamat"),
  telepon: text("telepon"),
  emailSekolah: text("email_sekolah"),
  kepalaSekolah: text("kepala_sekolah"),
  logo: text("logo"),
  active: boolean("active").notNull().default(true),
  penyelenggara: text("penyelenggara"),
  statusSekolah: text("status_sekolah"),
  kurikulum: text("kurikulum"),
  situsWeb: text("situs_web"),
  whatsapp: text("whatsapp"),
  facebook: text("facebook"),
  fotoFacebook: text("foto_facebook"),
  instagram: text("instagram"),
  fotoInstagram: text("foto_instagram"),
  youtube: text("youtube"),
  fotoYoutube: text("foto_youtube"),
  tiktok: text("tiktok"),
  fotoTiktok: text("foto_tiktok"),
  akreditasi: text("akreditasi"),
  bobotSumatif: integer("bobot_sumatif").notNull().default(60),
  bobotSas: integer("bobot_sas").notNull().default(40),
  useCustomKop: boolean("use_custom_kop").notNull().default(false),
  customKopGambar: text("custom_kop_gambar"),
  customKopTinggi: integer("custom_kop_tinggi").notNull().default(35),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const sekolahRelations = relations(sekolah, ({ many }) => ({
  users: many(users),
}))
