import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

const WINDOW_MS = 15 * 60 * 1000
const MAX_AUTH_ATTEMPTS = 60
const MAX_TRPC_ATTEMPTS = 100

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

    const p = redis.pipeline()
    p.incr(redisKey)
    p.ttl(redisKey)
    const [countResult, ttlResult] = (await p.exec()) as [number, number]

    const count = countResult
    let ttl = ttlResult

    if (count === 1) {
      await redis.expire(redisKey, windowSec)
      ttl = windowSec
    }

    if (count > max) {
      return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec }
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
        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      )
    }
  }

  if (req.nextUrl.pathname.startsWith("/api/trpc/")) {
    const result = await rateLimit(`trpc:${key}`, MAX_TRPC_ATTEMPTS)
    if (!result.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/auth/callback/credentials", "/api/trpc/:path*"],
}

