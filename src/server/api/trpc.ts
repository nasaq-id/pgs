import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@/auth"
import { db } from "@/server/db"
import { cookies } from "next/headers"
import { z } from "zod"
import { stripHtml } from "@/server/security"

export const createTRPCContext = async () => {
  const session = await auth()

  let impersonatedSekolahId: string | null = null
  try {
    const cookieStore = await cookies()
    impersonatedSekolahId = cookieStore.get("impersonated_sekolah_id")?.value || null
  } catch (e) {
    // Catch silently in non-request contexts
  }

  if (session?.user && session.user.role === "super_admin" && impersonatedSekolahId) {
    session.user.sekolahId = impersonatedSekolahId
  }

  return {
    session,
    db,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

export const protectedProcedure = t.procedure.use(isAuthenticated)

const hasRole = (roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }
    const userRole = (ctx.session.user as { role?: string }).role
    if (!userRole || !roles.includes(userRole)) {
      throw new TRPCError({ code: "FORBIDDEN" })
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    })
  })

export const roleProtectedProcedure = (roles: string[]) =>
  t.procedure.use(isAuthenticated).use(hasRole(roles))

const MAX_STRING_LENGTH = 10000

function deepSanitize(obj: unknown): unknown {
  if (typeof obj === "string") return stripHtml(obj).slice(0, MAX_STRING_LENGTH)
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(deepSanitize)
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deepSanitize(v)])
    )
  }
  return obj
}

export function sanitized<T extends z.ZodTypeAny>(schema: T) {
  return schema.transform((val) => deepSanitize(val) as z.infer<T>)
}

type RateLimitBucket = { count: number; resetAt: number }
const rateLimitBuckets = new Map<string, RateLimitBucket>()

function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = rateLimitBuckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= max) return false

  bucket.count++
  return true
}

export function createRateLimitedProcedure(max: number, windowMs: number) {
  return t.middleware(({ next, ctx }) => {
    const userId = ctx.session?.user?.id || "anonymous"
    const key = `rl:${userId}`

    if (!rateLimit(key, max, windowMs)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Terlalu banyak permintaan. Coba lagi nanti.",
      })
    }

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session?.user },
      },
    })
  })
}

export const strictRateLimit = createRateLimitedProcedure(10, 60 * 1000)
export const moderateRateLimit = createRateLimitedProcedure(30, 60 * 1000)
export const lenientRateLimit = createRateLimitedProcedure(100, 60 * 1000)
