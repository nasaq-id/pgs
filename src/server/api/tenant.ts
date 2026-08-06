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
    const isSuperAdmin = ctx.session?.user?.role === "super_admin"
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: isSuperAdmin
        ? "Pilih sekolah terlebih dahulu (gunakan fitur impersonate) sebelum mengubah data sekolah."
        : "Sekolah tidak ditemukan",
    })
  }
  return sekolahId
}
