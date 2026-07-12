import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { sekolah } from "./sekolah"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  password: text("password").notNull(),
  role: text("role", {
    enum: ["super_admin", "admin_sekolah", "guru", "siswa", "tu", "yayasan"],
  }).notNull().default("siswa"),
  sekolahId: text("sekolah_id").references(() => sekolah.id, { onDelete: "cascade" }),
  phone: text("phone"),
  photo: text("photo"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("users_sekolah_id_idx").on(table.sekolahId),
])

export const usersRelations = relations(users, ({ one }) => ({
  sekolah: one(sekolah, {
    fields: [users.sekolahId],
    references: [sekolah.id],
  }),
}))
