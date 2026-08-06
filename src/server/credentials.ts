import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { eq } from "drizzle-orm"

/**
 * SINGLE SOURCE OF TRUTH kredensial login = tabel `users`.
 *
 * Semua path mutasi password (create/update/reset/bulk import) pada router
 * siswa/guru WAJIB lewat helper ini, supaya tidak ada drift antara tabel
 * master (siswa.password_siswa / guru.password_guru) dan tabel users.
 *
 * Kolom password di tabel master tetap disimpan (untuk kompatibilitas),
 * tetapi TIDAK pernah dibaca untuk autentikasi — auth.ts hanya membaca users.
 */
const DEFAULT_PLACEHOLDER_HASH = "$2b$12$kBIO9Jl5ilOB/vjpf.1NjOzwXIyAiqIkcPs2CN31YZI9/9wF3GIk6"

type SyncUserOptions = {
  email: string
  role: "siswa" | "guru"
  sekolahId: string
  namaLengkap?: string | null
  /** undefined = biarkan nilai existing (tidak diubah) */
  photo?: string | null | undefined
  /** hash bcrypt baru; null/kosong = jangan ubah password yang ada */
  passwordHash?: string | null
  /** email lama, dipakai saat akun pindah email (rename) */
  prevEmail?: string
  /** false = jangan buat user baru kalau belum ada (pola bulk import) */
  createIfMissing?: boolean
}

export async function syncUserCredentials(opts: SyncUserOptions) {
  const email = opts.email?.trim()
  if (!email) return

  const nameParts = (opts.namaLengkap || "").split(" ")
  const firstName = nameParts[0] || ""
  const lastName = nameParts.slice(1).join(" ") || ""

  let existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!existing && opts.prevEmail && opts.prevEmail !== email) {
    existing = await db.query.users.findFirst({ where: eq(users.email, opts.prevEmail) })
  }

  if (existing) {
    const setData: Record<string, any> = { firstName, lastName }
    if (opts.prevEmail && opts.prevEmail !== email) setData.email = email
    if (opts.photo !== undefined) setData.photo = opts.photo
    if (opts.passwordHash) setData.password = opts.passwordHash
    await db.update(users).set(setData).where(eq(users.id, existing.id)).execute()
    return
  }

  if (opts.createIfMissing === false) return

  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email,
      firstName,
      lastName,
      password: opts.passwordHash || DEFAULT_PLACEHOLDER_HASH,
      role: opts.role,
      sekolahId: opts.sekolahId,
      photo: opts.photo ?? null,
      active: true,
    })
    .execute()
}
