import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const pengumuman = pgTable("pengumuman", {
  id: text("id").primaryKey(),
  sekolahId: text("sekolah_id").notNull().references(() => sekolah.id, { onDelete: "cascade" }),
  judul: text("judul").notNull(),
  konten: text("konten"),
  target: text("target", { enum: ["semua", "guru", "siswa", "orang_tua"] }).notNull().default("semua"),
  tanggalPublish: timestamp("tanggal_publish"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const pengumumanRelations = relations(pengumuman, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [pengumuman.sekolahId],
    references: [sekolah.id],
  }),
}))
