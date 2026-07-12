export function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export function requireSekolahId(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const sekolahId = getSekolahIdFilter(ctx)
  if (!sekolahId) {
    throw new Error("Sekolah tidak ditemukan")
  }
  return sekolahId
}
