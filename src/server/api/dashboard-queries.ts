import { eq, and, desc, gte, lt, lte, sql, sum, count, inArray, like, or, asc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { db } from "@/server/db"
import {
  siswa,
  guru,
  kelas,
  tahunAjaran,
  absensiSiswa,
  invoice,
  poinSikap,
  poinKategori,
  ruangKelas,
  kalenderEvent,
  pengumuman,
} from "@/server/db/schema"
import { getSekolahIdFilter } from "@/server/api/tenant"
import { cacheKey, getOrSetCache } from "@/lib/cache"

// Ctx ringkas untuk helper — semua query ini berjalan di protectedProcedure
type QueryCtx = {
  session: {
    user: {
      role?: string | null
      sekolahId?: string | null
      email?: string | null
    }
  }
}

// Enrich nama siswa dalam 1 query batch (fix N+1) — ganti pola rows.map → findFirst
async function enrichNamaSiswa<T extends { siswaId: string }>(
  rows: T[]
): Promise<(T & { namaLengkap: string })[]> {
  if (rows.length === 0) return []
  const ids = [...new Set(rows.map((r) => r.siswaId))]
  const siswaRows = await db
    .select({ id: siswa.id, namaLengkap: siswa.namaLengkap })
    .from(siswa)
    .where(inArray(siswa.id, ids))
  const namaMap = new Map(siswaRows.map((s) => [s.id, s.namaLengkap]))
  return rows.map((row) => ({ ...row, namaLengkap: namaMap.get(row.siswaId) || "-" }))
}

// ─── POIN / DASHBOARD ──────────────────────────────────────────

export async function queryDashboardSiswa(ctx: QueryCtx) {
  const userEmail = ctx.session.user.email

  let currentSiswa = null
  if (userEmail) {
    currentSiswa = await db.query.siswa.findFirst({
      where: or(
        eq(siswa.usernameSiswa, userEmail),
        eq(siswa.emailSiswa, userEmail),
        eq(siswa.nisn, userEmail),
      ),
    })
  }

  let totalPoin = 0
  if (currentSiswa) {
    const conditions = [eq(poinSikap.siswaId, currentSiswa.id)]
    if (currentSiswa.sekolahId) conditions.push(eq(poinSikap.sekolahId, currentSiswa.sekolahId))
    const poinData = await db
      .select({ total: sum(poinSikap.poin) })
      .from(poinSikap)
      .where(and(...conditions))
    totalPoin = Number(poinData[0]?.total) || 0
  }

  const leaderboardKondisi = [eq(poinKategori.jenis, "positif")]
  if (currentSiswa?.sekolahId) leaderboardKondisi.push(eq(poinSikap.sekolahId, currentSiswa.sekolahId))
  const leaderboard = await db
    .select({
      siswaId: poinSikap.siswaId,
      totalPoin: sum(poinSikap.poin).mapWith(Number),
    })
    .from(poinSikap)
    .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
    .where(and(...leaderboardKondisi))
    .groupBy(poinSikap.siswaId)
    .orderBy(desc(sql`sum(${poinSikap.poin})`))
    .limit(5)

  const leaderboardWithSiswa = await enrichNamaSiswa(leaderboard)

  return { totalPoin, leaderboard: leaderboardWithSiswa, currentSiswa }
}

export async function queryDashboardGuruAdmin(ctx: QueryCtx) {
  const sekolahId = ctx.session.user.sekolahId
  const kondisiPositif = [eq(poinKategori.jenis, "positif")]
  const kondisiNegatif = [eq(poinKategori.jenis, "negatif")]
  if (sekolahId) {
    kondisiPositif.push(eq(poinSikap.sekolahId, sekolahId))
    kondisiNegatif.push(eq(poinSikap.sekolahId, sekolahId))
  }

  const topPositif = await db
    .select({
      siswaId: poinSikap.siswaId,
      totalPoin: sum(poinSikap.poin).mapWith(Number),
    })
    .from(poinSikap)
    .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
    .where(and(...kondisiPositif))
    .groupBy(poinSikap.siswaId)
    .orderBy(desc(sql`sum(${poinSikap.poin})`))
    .limit(5)

  const topNegatif = await db
    .select({
      siswaId: poinSikap.siswaId,
      totalPoin: sum(poinSikap.poin).mapWith(Number),
    })
    .from(poinSikap)
    .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
    .where(and(...kondisiNegatif))
    .groupBy(poinSikap.siswaId)
    .orderBy(desc(sql`sum(${poinSikap.poin})`))
    .limit(5)

  const [positifWithSiswa, negatifWithSiswa] = await Promise.all([
    enrichNamaSiswa(topPositif),
    enrichNamaSiswa(topNegatif),
  ])

  return { topPositif: positifWithSiswa, topNegatif: negatifWithSiswa }
}

// ─── STATISTIK ─────────────────────────────────────────────────

export async function queryStudentSummary(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)
  const conditions: any[] = [eq(siswa.status, "aktif")]
  if (sekolahIdFilter) conditions.push(eq(siswa.sekolahId, sekolahIdFilter))
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalResult] = await db
    .select({
      count: count(),
      newThisMonth: sql<number>`count(*) filter (where ${siswa.createdAt} >= ${startOfMonth})`,
    })
    .from(siswa)
    .where(and(...conditions))

  return {
    total: Number(totalResult?.count ?? 0),
    newThisMonth: Number(totalResult?.newThisMonth ?? 0),
  }
}

export async function queryStaffSummary(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)
  const conditions: any[] = [eq(guru.active, true)]
  if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalResult] = await db
    .select({
      count: count(),
      newThisMonth: sql<number>`count(*) filter (where ${guru.createdAt} >= ${startOfMonth})`,
    })
    .from(guru)
    .where(and(...conditions))

  return {
    total: Number(totalResult?.count ?? 0),
    newThisMonth: Number(totalResult?.newThisMonth ?? 0),
  }
}

export async function queryClassSummary(ctx: QueryCtx) {
  const sekolahId = ctx.session.user.sekolahId
  if (!sekolahId) return null

  const activeTa = await db.query.tahunAjaran.findFirst({
    where: and(eq(tahunAjaran.sekolahId, sekolahId), eq(tahunAjaran.active, true)),
  })
  if (!activeTa) return null

  const kelasConditions: any[] = [eq(kelas.tahunAjaranId, activeTa.id)]
  if (sekolahId) kelasConditions.push(eq(kelas.sekolahId, sekolahId))

  const [summary] = await db
    .select({
      count: count(),
      distinctTingkat: sql<number>`count(distinct ${kelas.tingkat})`,
    })
    .from(kelas)
    .where(and(...kelasConditions))

  return {
    total: Number(summary?.count ?? 0),
    distinctTingkat: Number(summary?.distinctTingkat ?? 0),
  }
}

export async function queryPendingPayment(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)
  const conditions: any[] = [eq(invoice.status, "issued")]
  if (sekolahIdFilter) conditions.push(eq(invoice.sekolahId, sekolahIdFilter))
  const [result] = await db
    .select({ count: count() })
    .from(invoice)
    .where(and(...conditions))
  return { count: Number(result?.count ?? 0) }
}

export async function queryTodayAttendanceRate(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const absensiConditions: any[] = [
    gte(absensiSiswa.tanggal, today),
    lt(absensiSiswa.tanggal, tomorrow),
  ]
  if (sekolahIdFilter) absensiConditions.push(eq(absensiSiswa.sekolahId, sekolahIdFilter))

  const [countResult] = await db
    .select({
      count: count(),
      hadir: sql<number>`count(*) filter (where ${absensiSiswa.status} = 'hadir')`,
    })
    .from(absensiSiswa)
    .where(and(...absensiConditions))

  const totalToday = Number(countResult?.count ?? 0)
  if (totalToday === 0) return null

  const hadir = Number(countResult?.hadir ?? 0)

  const siswaConditions: any[] = [eq(siswa.status, "aktif")]
  if (sekolahIdFilter) siswaConditions.push(eq(siswa.sekolahId, sekolahIdFilter))
  const [totalSiswaResult] = await db
    .select({ count: count() })
    .from(siswa)
    .where(and(...siswaConditions))
  const totalSiswa = Number(totalSiswaResult?.count ?? 0)

  return {
    rate: totalSiswa > 0 ? Math.round((hadir / totalSiswa) * 100) : 0,
    present: hadir,
    total: totalSiswa,
  }
}

export async function queryOutstandingReceivables(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)
  const invoiceConditions: any[] = [inArray(invoice.status, ["issued", "overdue", "partially_paid"])]

  if (sekolahIdFilter) invoiceConditions.push(eq(invoice.sekolahId, sekolahIdFilter))

  const [result] = await db
    .select({ total: sum(sql`${invoice.totalAmount} - ${invoice.paidAmount}`) })
    .from(invoice)
    .where(and(...invoiceConditions))

  return { total: Number(result?.total ?? 0) }
}

export async function queryRuangKelasCount(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)
  const conditions: any[] = []
  if (sekolahIdFilter) conditions.push(eq(ruangKelas.sekolahId, sekolahIdFilter))

  const [result] = await db
    .select({ total: count(), totalKapasitas: sum(ruangKelas.kapasitas) })
    .from(ruangKelas)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  return {
    total: Number(result?.total ?? 0),
    totalKapasitas: Number(result?.totalKapasitas ?? 0),
  }
}

// Gabungan 8 query statistik dashboard menjadi 1 roundtrip SQL. Tiap query
// terpisah menanggung biaya RTT ke pooler Supabase (~200ms), sehingga
// getOverview bisa >2s pada cache-miss. Struktur return identik dengan
// query terpisah yang digantikan.
export async function queryDashboardStatsAggregated(ctx: QueryCtx) {
  const sekolahId = getSekolahIdFilter(ctx as any)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const scope = sekolahId ? sql`sekolah_id = ${sekolahId}` : sql`true`
  const taScope = sekolahId
    ? sql`sekolah_id = ${sekolahId} AND active = true`
    : sql`active = true`

  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM siswa WHERE status = 'aktif' AND ${scope}) AS siswa_total,
      (SELECT count(*) FROM siswa WHERE status = 'aktif' AND ${scope} AND created_at >= ${startOfMonth}) AS siswa_baru,
      (SELECT count(*) FROM guru WHERE active = true AND ${scope}) AS guru_total,
      (SELECT count(*) FROM guru WHERE active = true AND ${scope} AND created_at >= ${startOfMonth}) AS guru_baru,
      (SELECT id FROM tahun_ajaran WHERE ${taScope} LIMIT 1) AS ta_id,
      (SELECT count(*) FROM kelas WHERE tahun_ajaran_id = (SELECT id FROM tahun_ajaran WHERE ${taScope} LIMIT 1) AND ${scope}) AS kelas_total,
      (SELECT count(DISTINCT tingkat) FROM kelas WHERE tahun_ajaran_id = (SELECT id FROM tahun_ajaran WHERE ${taScope} LIMIT 1) AND ${scope}) AS kelas_tingkat,
      (SELECT count(*) FROM invoice WHERE status = 'issued' AND ${scope}) AS pending_count,
      (SELECT count(*) FROM absensi_siswa WHERE tanggal >= ${today} AND tanggal < ${tomorrow} AND ${scope}) AS absen_total,
      (SELECT count(*) FROM absensi_siswa WHERE tanggal >= ${today} AND tanggal < ${tomorrow} AND status = 'hadir' AND ${scope}) AS absen_hadir,
      (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoice WHERE status IN ('issued','overdue','partially_paid') AND ${scope}) AS receivable_total,
      (SELECT count(*) FROM ruang_kelas WHERE ${scope}) AS ruang_total,
      (SELECT COALESCE(SUM(kapasitas), 0) FROM ruang_kelas WHERE ${scope}) AS ruang_kapasitas
  `)
  const r = result.rows[0] as Record<string, unknown>
  const num = (v: unknown) => Number(v ?? 0)

  const totalSiswa = num(r.siswa_total)
  const absenTotal = num(r.absen_total)
  const hadir = num(r.absen_hadir)
  // Perilaku asli: tanpa sekolahId (super_admin tanpa impersonate) →
  // classSummary null, tidak menghitung kelas global.
  const classSummary = sekolahId && r.ta_id
    ? { total: num(r.kelas_total), distinctTingkat: num(r.kelas_tingkat) }
    : null

  return {
    studentSummary: { total: totalSiswa, newThisMonth: num(r.siswa_baru) },
    staffSummary: { total: num(r.guru_total), newThisMonth: num(r.guru_baru) },
    classSummary,
    pendingPayment: { count: num(r.pending_count) },
    attendance: absenTotal > 0
      ? { rate: totalSiswa > 0 ? Math.round((hadir / totalSiswa) * 100) : 0, present: hadir, total: totalSiswa }
      : null,
    receivables: { total: num(r.receivable_total) },
    ruangKelas: { total: num(r.ruang_total), totalKapasitas: num(r.ruang_kapasitas) },
  }
}

export async function queryTopStudentPoints(ctx: QueryCtx) {
  const sekolahId = ctx.session.user.sekolahId
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const period = { month: now.getMonth() + 1, year: now.getFullYear() }

  const dateConditions: any[] = [
    gte(poinSikap.createdAt, startOfMonth),
    lte(poinSikap.createdAt, endOfMonth),
  ]
  if (sekolahId) dateConditions.push(eq(poinSikap.sekolahId, sekolahId))

  const runQuery = async () => {
    // 1 query grouped (positif & negatif sekaligus), bukan 3 query terpisah
    const rows = await db
      .select({
        siswaId: poinSikap.siswaId,
        totalPoin: sum(poinSikap.poin).mapWith(Number),
        jenis: poinKategori.jenis,
      })
      .from(poinSikap)
      .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
      .where(and(...dateConditions))
      .groupBy(poinSikap.siswaId, poinKategori.jenis)

    const positive: { siswaId: string; totalPoin: number }[] = []
    const negative: { siswaId: string; totalPoin: number }[] = []
    let totalNegatif = 0
    for (const r of rows) {
      if (r.jenis === "positif") {
        positive.push({ siswaId: r.siswaId, totalPoin: r.totalPoin })
      } else {
        negative.push({ siswaId: r.siswaId, totalPoin: r.totalPoin })
        totalNegatif += r.totalPoin
      }
    }
    positive.sort((a, b) => b.totalPoin - a.totalPoin)
    negative.sort((a, b) => b.totalPoin - a.totalPoin)

    const topPositif = positive.slice(0, 5)
    const topNegatif = negative.slice(0, 5)

    // 1 query enrich untuk kedua daftar (10-20 id)
    const ids = [...new Set([...topPositif, ...topNegatif].map((r) => r.siswaId))]
    let namaMap = new Map<string, string>()
    if (ids.length > 0) {
      const siswaRows = await db
        .select({ id: siswa.id, namaLengkap: siswa.namaLengkap })
        .from(siswa)
        .where(inArray(siswa.id, ids))
      namaMap = new Map(siswaRows.map((s) => [s.id, s.namaLengkap]))
    }

    const attach = (list: { siswaId: string; totalPoin: number }[]) =>
      list.map((r) => ({ ...r, namaLengkap: namaMap.get(r.siswaId) || "-" }))

    return {
      positive: attach(topPositif),
      negative: attach(topNegatif),
      totalNegativeThisMonth: totalNegatif,
      period,
    }
  }

  const key = cacheKey("dashboard:topPoints", sekolahId || "all", `${period.year}-${period.month}`)
  return getOrSetCache(key, runQuery, 30)
}

// ─── PENGUMUMAN & KALENDER ─────────────────────────────────────

export const roleTargetMap: Record<string, string> = {
  super_admin: "semua",
  admin_sekolah: "semua",
  guru: "guru",
  siswa: "siswa",
  tu: "semua",
  ortu: "orang_tua",
  yayasan: "semua",
}

export async function queryPublishedAnnouncements(ctx: QueryCtx, limit: number, offset = 0) {
  const sekolahId = ctx.session.user.sekolahId
  const role = ctx.session.user.role || ""

  const runQuery = async () => {
    const conditions: any[] = [
      eq(pengumuman.published, true),
      lte(pengumuman.tanggalPublish, new Date()),
    ]
    if (sekolahId) conditions.push(eq(pengumuman.sekolahId, sekolahId))

    const isAdmin = role === "super_admin" || role === "admin_sekolah" || role === "tu" || role === "yayasan"
    if (!isAdmin) {
      const targetRole = roleTargetMap[role] || "semua"
      conditions.push(
        or(
          eq(pengumuman.target, "semua"),
          eq(pengumuman.target, targetRole as "semua" | "guru" | "siswa" | "orang_tua"),
        )
      )
    }

    return db.query.pengumuman.findMany({
      where: and(...conditions),
      orderBy: desc(pengumuman.tanggalPublish),
      limit,
      offset,
    })
  }

  // Hanya varian default (halaman pertama, tanpa offset) yang di-cache — TTL 5 menit
  if (offset === 0) {
    const key = cacheKey("pengumuman:getPublished", sekolahId || "all", `l${limit}`)
    return getOrSetCache(key, runQuery, 300)
  }
  return runQuery()
}

// Varian ringan khusus dashboard: proyeksi kolom minimal, tanpa konten/deskripsi
// panjang, supaya payload dehydrated dashboard tetap kecil di sekolah padat.
export async function queryDashboardAnnouncements(ctx: QueryCtx, limit = 5) {
  const sekolahId = ctx.session.user.sekolahId
  const role = ctx.session.user.role || ""

  const runQuery = async () => {
    const conditions: any[] = [
      eq(pengumuman.published, true),
      lte(pengumuman.tanggalPublish, new Date()),
    ]
    if (sekolahId) conditions.push(eq(pengumuman.sekolahId, sekolahId))

    const isAdmin = role === "super_admin" || role === "admin_sekolah" || role === "tu" || role === "yayasan"
    if (!isAdmin) {
      const targetRole = roleTargetMap[role] || "semua"
      conditions.push(
        or(
          eq(pengumuman.target, "semua"),
          eq(pengumuman.target, targetRole as "semua" | "guru" | "siswa" | "orang_tua"),
        )
      )
    }

    return db
      .select({
        id: pengumuman.id,
        judul: pengumuman.judul,
        tanggalPublish: pengumuman.tanggalPublish,
      })
      .from(pengumuman)
      .where(and(...conditions))
      .orderBy(desc(pengumuman.tanggalPublish))
      .limit(limit)
  }

  const key = cacheKey("pengumuman:dashboard", sekolahId || "all")
  return getOrSetCache(key, runQuery, 300)
}

// Varian ringan khusus dashboard: kolom yang dipakai kalender mini dashboard saja.
export async function queryDashboardKalenderEvents(
  ctx: QueryCtx,
  input: { bulan: number; tahun: number; limit?: number }
) {
  const sekolahId = ctx.session.user.sekolahId
  if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

  const runQuery = async () => {
    const startDate = new Date(input.tahun, input.bulan - 1, 1)
    const endDate = new Date(input.tahun, input.bulan, 0, 23, 59, 59)
    return db
      .select({
        id: kalenderEvent.id,
        judul: kalenderEvent.judul,
        tipe: kalenderEvent.tipe,
        tanggalMulai: kalenderEvent.tanggalMulai,
        tanggalSelesai: kalenderEvent.tanggalSelesai,
        isLiburNasional: kalenderEvent.isLiburNasional,
        deskripsi: kalenderEvent.deskripsi,
      })
      .from(kalenderEvent)
      .where(
        and(
          eq(kalenderEvent.sekolahId, sekolahId),
          gte(kalenderEvent.tanggalMulai, startDate),
          lte(kalenderEvent.tanggalMulai, endDate),
        )
      )
      .orderBy(asc(kalenderEvent.tanggalMulai))
      .limit(input.limit ?? 60)
  }

  const key = cacheKey("kalender:dashboard", sekolahId, `${input.tahun}-${input.bulan}`)
  return getOrSetCache(key, runQuery, 300)
}

export async function queryKalenderEvents(
  ctx: QueryCtx,
  input: { search?: string; bulan?: number; tahun?: number; tipe?: "kegiatan" | "libur" | "lainnya"; limit?: number; offset?: number }
) {
  const sekolahId = ctx.session.user.sekolahId
  if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

  const runQuery = async () => {
    const conditions = [eq(kalenderEvent.sekolahId, sekolahId)]

    if (input.search) {
      conditions.push(like(kalenderEvent.judul, `%${input.search}%`))
    }

    if (input.bulan && input.tahun) {
      const startDate = new Date(input.tahun, input.bulan - 1, 1)
      const endDate = new Date(input.tahun, input.bulan, 0, 23, 59, 59)
      conditions.push(gte(kalenderEvent.tanggalMulai, startDate))
      conditions.push(lte(kalenderEvent.tanggalMulai, endDate))
    }

    if (input.tipe) conditions.push(eq(kalenderEvent.tipe, input.tipe))

    return db
      .select()
      .from(kalenderEvent)
      .where(and(...conditions))
      .orderBy(asc(kalenderEvent.tanggalMulai))
      .limit(input.limit ?? 200)
      .offset(input.offset ?? 0)
  }

  // Cache per bulan (key: tahun-bulan) — dipakai Topbar & dashboard tiap page load.
  // Varian dengan search/tipe/offset tidak di-cache.
  if (input.tahun && input.bulan && !input.search && !input.tipe && !(input.offset ?? 0)) {
    const key = cacheKey("kalender:getAll", sekolahId, `${input.tahun}-${input.bulan}`)
    return getOrSetCache(key, runQuery, 300)
  }
  return runQuery()
}
