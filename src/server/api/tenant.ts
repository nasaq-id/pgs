import { TRPCError } from "@trpc/server"

type Ctx = {
  session?: {
    user?: {
      role?: string
      sekolahId?: string | null
    }
  } | null
}

export function getSekolahIdFilter(ctx: Ctx) {
  const { role, sekolahId } = ctx.session?.user ?? {}
  if (role === "super_admin") return null
  if (!sekolahId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Akses ditolak: Identitas sekolah tidak ditemukan.",
    })
  }
  return sekolahId
}

export function requireSekolahId(ctx: Ctx) {
  const sekolahId = getSekolahIdFilter(ctx)
  if (!sekolahId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sekolah tidak ditemukan",
    })
  }
  return sekolahId
}
