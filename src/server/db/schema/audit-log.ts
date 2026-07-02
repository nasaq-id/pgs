import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./users"
import { sekolah } from "./sekolah"

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  sekolahId: text("sekolah_id").references(() => sekolah.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  sekolah: one(sekolah, {
    fields: [auditLogs.sekolahId],
    references: [sekolah.id],
  }),
}))
