import { NextRequest, NextResponse } from "next/server"

const WINDOW_MS = 15 * 60 * 1000
const MAX_AUTH_ATTEMPTS = 60
const MAX_TRPC_ATTEMPTS = 100

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function getClientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = req.headers.get("x-real-ip")
  return forwarded || realIp || "unknown"
}

function rateLimit(key: string, max: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }

  if (current.count >= max) {
    return { ok: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
  }

  current.count += 1
  return { ok: true }
}

export function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next()

  const key = getClientKey(req)

  if (req.nextUrl.pathname === "/api/auth/callback/credentials") {
    const result = rateLimit(key, MAX_AUTH_ATTEMPTS)
    if (!result.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
      )
    }
  }

  if (req.nextUrl.pathname.startsWith("/api/trpc/")) {
    const result = rateLimit(`trpc:${key}`, MAX_TRPC_ATTEMPTS)
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
