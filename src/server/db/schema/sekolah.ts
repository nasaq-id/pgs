import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./users"

export const sekolah = pgTable("sekolah", {
  id: text("id").primaryKey(),
  namaSekolah: text("nama_sekolah").notNull(),
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
  akreditasi: text("akreditasi"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const sekolahRelations = relations(sekolah, ({ many }) => ({
  users: many(users),
}))
