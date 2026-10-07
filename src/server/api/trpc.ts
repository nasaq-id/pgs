import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@/auth"
import { db } from "@/server/db"
import { cookies } from "next/headers"
import { z } from "zod"
import { stripHtml } from "@/server/security"
import { checkRateLimit } from "@/server/rate-limit"

import { eq } from "drizzle-orm"
import { users } from "@/server/db/schema"

export const createTRPCContext = async () => {
  const session = await auth()

  let impersonatedSekolahId: string | null = null
  let impersonatedUserId: string | null = null
  let impersonatedRole: string | null = null

  try {
    const cookieStore = await cookies()
    impersonatedSekolahId = cookieStore.get("impersonated_sekolah_id")?.value || null
    impersonatedUserId = cookieStore.get("impersonated_user_id")?.value || null
    impersonatedRole = cookieStore.get("impersonated_role")?.value || null
  } catch {
    // Catch silently in non-request contexts
  }

  if (session?.user && (session.user.role === "super_admin" || session.user.originalRole === "super_admin") && impersonatedSekolahId) {
    session.user.sekolahId = impersonatedSekolahId
    session.user.isImpersonating = true
    session.user.originalRole = "super_admin"

    if (impersonatedUserId && impersonatedRole) {
      // Lookup target user in users table to retrieve authentic identity & credentials
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, impersonatedUserId),
      })

      if (targetUser) {
        session.user.id = targetUser.id
        session.user.role = impersonatedRole
        session.user.email = targetUser.email
        session.user.name = `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || targetUser.email
        session.user.sekolahId = targetUser.sekolahId || impersonatedSekolahId
        session.user.impersonatedTargetName = session.user.name
      }
    } else {
      session.user.role = "admin_sekolah"
    }
  }

  return {
    session,
    db,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create()

export const router = t.router

// Logging latency sampling — log endpoint lambat (>= 500ms) + 1% sampling
// request cepat. Tidak pernah log payload/input (privasi + volume kecil).
const latencyLogger = t.middleware(async ({ path, type, next }) => {
  const startedAt = Date.now()
  const result = await next()
  const durationMs = Date.now() - startedAt
  const isSlow = durationMs >= 500
  const isSampled = Math.random() < 0.01
  if (isSlow || isSampled) {
    console.log(
      `[api:${type}:${path}] ${durationMs}ms${isSlow ? " SLOW" : ""}`
    )
  }
  return result
})

const baseProcedure = t.procedure.use(latencyLogger)
export const publicProcedure = baseProcedure

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

export const protectedProcedure = baseProcedure.use(isAuthenticated)

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
  baseProcedure.use(isAuthenticated).use(hasRole(roles))

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

export function createRateLimitedProcedure(max: number, windowMs: number) {
  return t.middleware(async ({ next, ctx }) => {
    const userId = ctx.session?.user?.id || "anonymous"
    const key = `rl:${userId}`

    const allowed = await checkRateLimit(key, max, windowMs)
    if (!allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Terlalu banyak permintaan. Coba lagi nanti.",
      })
    }

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session!.user },
      },
    })
  })
}

export const strictRateLimit = createRateLimitedProcedure(10, 60 * 1000)
export const moderateRateLimit = createRateLimitedProcedure(30, 60 * 1000)
export const lenientRateLimit = createRateLimitedProcedure(100, 60 * 1000)
