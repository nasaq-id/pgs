import { initTRPC, TRPCError } from "@trpc/server"
import { auth } from "@/auth"
import { db } from "@/server/db"

export const createTRPCContext = async () => {
  const session = await auth()

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
