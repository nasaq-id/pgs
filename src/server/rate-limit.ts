import { db } from "@/server/db"
import { rateLimitBucket } from "@/server/db/schema"
import { sql } from "drizzle-orm"

/**
 * Distributed rate limiter backed by PostgreSQL.
 *
 * Unlike the previous in-memory Map, this bucket is shared across all
 * serverless instances, so limits are accurate in multi-instance deployments.
 *
 * Semantics: up to `max` allowed calls within a rolling `windowMs` window.
 * Fails open (returns true) if the DB is unreachable, so the app never
 * breaks because of the limiter itself.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      INSERT INTO rate_limit_bucket (bucket_key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowMs / 1000}))
      ON CONFLICT (bucket_key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_bucket.reset_at < now() THEN 1
          ELSE rate_limit_bucket.count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_bucket.reset_at < now()
            THEN now() + make_interval(secs => ${windowMs / 1000})
          ELSE rate_limit_bucket.reset_at
        END
      RETURNING count
    `)
    const row = result.rows[0] as { count: string | number } | undefined
    return Number(row?.count ?? 0) <= max
  } catch (e) {
    console.error("[rate-limit] check gagal, fail-open:", e)
    return true
  }
}

/** Bersihkan bucket yang sudah kedaluwarsa lebih dari `retainMs` yang lalu. */
export async function cleanupRateLimitBuckets(retainMs = 24 * 60 * 60 * 1000) {
  try {
    await db.execute(sql`
      DELETE FROM rate_limit_bucket
      WHERE reset_at < now() - make_interval(secs => ${retainMs / 1000})
    `)
  } catch (e) {
    console.error("[rate-limit] cleanup gagal:", e)
  }
}
