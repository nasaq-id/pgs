import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core"

export const rateLimitBucket = pgTable("rate_limit_bucket", {
  key: text("bucket_key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
})
