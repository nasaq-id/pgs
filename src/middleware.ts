import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

const WINDOW_MS = 15 * 60 * 1000
const MAX_AUTH_ATTEMPTS = 60
const MAX_TRPC_ATTEMPTS = 2000

// Lua atomik: jika sudah >= max, TIDAK increment (anti banjir retry dari
// client yang diblokir — counter tidak bisa membengkak seperti incr+dulu-cek).
// Return: [1, count] = diizinkan, [0, ttl] = diblokir (ttl detik tersisa).
const RATE_LIMIT_LUA = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
local max = tonumber(ARGV[1])
if count >= max then
  return {0, redis.call('TTL', KEYS[1])}
end
local new = redis.call('INCR', KEYS[1])
if new == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
return {1, new}
`

function getClientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = req.headers.get("x-real-ip")
  return forwarded || realIp || "unknown"
}

async function rateLimit(
  key: string,
  max: number
): Promise<{ ok: boolean; retryAfter?: number }> {
  try {
    const redisKey = `ratelimit:${key}`
    const windowSec = Math.ceil(WINDOW_MS / 1000)

    const [ok, ttlOrCount] = (await redis.eval(
      RATE_LIMIT_LUA,
      [redisKey],
      [max, windowSec]
    )) as [number, number]

    if (ok === 0) {
      return { ok: false, retryAfter: ttlOrCount > 0 ? ttlOrCount : windowSec }
    }

    return { ok: true }
  } catch (error) {
    console.error("[RateLimit] Redis rate limiter error, failing open:", error)
    return { ok: true }
  }
}

export async function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next()

  const key = getClientKey(req)

  if (req.nextUrl.pathname === "/api/auth/callback/credentials") {
    const result = await rateLimit(`auth:${key}`, MAX_AUTH_ATTEMPTS)
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            message: "Terlalu banyak percobaan login. Coba lagi nanti.",
            code: -32029,
            data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
          },
        },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      )
    }
  }

  if (req.nextUrl.pathname.startsWith("/api/trpc/")) {
    const result = await rateLimit(`trpc:${key}`, MAX_TRPC_ATTEMPTS)
    if (!result.ok) {
      return NextResponse.json(
        {
          error: {
            message: "Terlalu banyak permintaan. Coba lagi nanti.",
            code: -32029,
            data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
          },
        },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/auth/callback/credentials", "/api/trpc/:path*"],
}

