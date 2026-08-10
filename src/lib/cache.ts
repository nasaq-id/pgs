import { redis } from "./redis"

/**
 * Marker untuk serialisasi Date — @upstash/redis default mengubah Date
 * menjadi ISO string tanpa info tipe, sehingga tanggal tidak bisa
 * di-revive kembali sebagai Date. Dengan marker ini, Date pulang-pergi
 * utuh (identik dengan bentuk asli dari drizzle).
 */
const DATE_MARKER = "\u0000pgs-date\u0000"

/**
 * Date punya Date.prototype.toJSON yang jalan SEBELUM replacer
 * JSON.stringify, jadi replacer tidak pernah melihat Date asli.
 * Solusi: encode manual (walk) sebelum stringify.
 */
function encodeDates(value: unknown): unknown {
  if (value instanceof Date) return DATE_MARKER + value.toISOString()
  if (Array.isArray(value)) return value.map(encodeDates)
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = encodeDates(v)
    }
    return out
  }
  return value
}

/**
 * SDK @upstash/redis otomatis JSON.parse nilai yang valid JSON, jadi hasil
 * get sudah berupa objek (bukan string mentah). Fungsi ini menelusuri
 * struktur dan mengembalikan marker Date menjadi objek Date.
 */
function reviveDates(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(DATE_MARKER)) {
    const iso = value.slice(DATE_MARKER.length)
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? value : d
  }
  if (Array.isArray(value)) return value.map(reviveDates)
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = reviveDates(v)
    }
    return out
  }
  return value
}

/**
 * Membuat key cache terstruktur: cache:<scope>:<parts...>
 * Selalu sertakan sekolahId sebagai bagian key — cache Wajib per-sekolah
 * (multi-tenant, jangan sampai data sekolah A bocor ke sekolah B).
 */
export function cacheKey(scope: string, ...parts: (string | number | undefined | null)[]): string {
  return `cache:${[scope, ...parts].filter((p) => p !== undefined && p !== null).join(":")}`
}

/**
 * Mendapatkan data ter-cache berdasarkan key.
 * Mengembalikan null jika key tidak ditemukan atau terjadi error.
 * Date di-revive kembali menjadi objek Date.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<unknown>(key)
    if (data === null || data === undefined) return null
    return reviveDates(data) as T
  } catch (error) {
    console.error(`[Cache] Get error for key "${key}":`, error)
    return null
  }
}

/**
 * Menyimpan data ke dalam cache dengan key tertentu.
 * Bisa diberikan TTL (Time To Live) dalam satuan detik.
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    const raw = JSON.stringify(encodeDates(value))
    if (ttlSeconds !== undefined) {
      await redis.set(key, raw, { ex: ttlSeconds })
    } else {
      await redis.set(key, raw)
    }
    return true
  } catch (error) {
    console.error(`[Cache] Set error for key "${key}":`, error)
    return false
  }
}

/**
 * Menghapus cache berdasarkan key.
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error(`[Cache] Delete error for key "${key}":`, error)
    return false
  }
}

/**
 * Hapus banyak key sekaligus (1 roundtrip Redis) — dipakai untuk
 * invalidasi cache setelah mutation.
 */
export async function invalidateCache(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch (error) {
    console.error(`[Cache] Invalidate error untuk keys "${keys.join(", ")}":`, error)
  }
}

/**
 * Mengambil data dari cache. Jika tidak ditemukan, memanggil fetchFn
 * untuk mengambil data segar, lalu menyimpannya di cache sebelum mengembalikannya.
 * Menggunakan fail-open: jika Redis gagal, langsung memanggil fetchFn.
 * Date di-revive kembali menjadi objek Date.
 */
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  try {
    const data = await redis.get<unknown>(key)
    if (data !== null && data !== undefined) {
      return reviveDates(data) as T
    }
  } catch (error) {
    console.error(`[Cache] getOrSetCache read error for key "${key}", falling back:`, error)
  }

  // Ambil data segar dari database/sumber asli
  const freshData = await fetchFn()

  // Simpan ke cache (silently fail if this fails)
  try {
    const raw = JSON.stringify(encodeDates(freshData))
    if (ttlSeconds !== undefined) {
      await redis.set(key, raw, { ex: ttlSeconds })
    } else {
      await redis.set(key, raw)
    }
  } catch (error) {
    console.error(`[Cache] getOrSetCache write error for key "${key}":`, error)
  }

  return freshData
}
