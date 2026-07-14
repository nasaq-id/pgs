import { TRPCError } from "@trpc/server"

export function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  if (!sekolahId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Akses ditolak: Identitas sekolah tidak ditemukan.",
    })
  }
  return sekolahId
}

export function requireSekolahId(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const sekolahId = getSekolahIdFilter(ctx)
  if (!sekolahId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sekolah tidak ditemukan",
    })
  }
  return sekolahId
}
