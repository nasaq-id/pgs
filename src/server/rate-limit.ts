import { redis } from "@/lib/redis"

/**
 * Distributed rate limiter backed by Upstash Redis.
 *
 * This bucket is shared across all serverless instances, so limits are
 * accurate in multi-instance deployments.
 *
 * Semantics: up to `max` allowed calls within a rolling `windowMs` window.
 * Fails open (returns true) if Redis is unreachable, so the app never
 * breaks because of the limiter itself.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  try {
    const redisKey = `ratelimit:${key}`
    const windowSec = Math.ceil(windowMs / 1000)

    const p = redis.pipeline()
    p.incr(redisKey)
    p.ttl(redisKey)
    const [countResult, ttlResult] = (await p.exec()) as [number, number]

    const count = countResult

    if (count === 1) {
      await redis.expire(redisKey, windowSec)
    }

    return count <= max
  } catch (e) {
    console.error("[rate-limit] check gagal, fail-open:", e)
    return true
  }
}

/** Bersihkan bucket yang sudah kedaluwarsa. (No-op karena Redis menggunakan TTL otomatis) */
export async function cleanupRateLimitBuckets(retainMs = 24 * 60 * 60 * 1000) {
  // No-op: Redis handles eviction automatically using TTL
}

