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

  const [totalResult] = await db
    .select({ count: count() })
    .from(siswa)
    .where(and(...conditions))

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [newThisMonthResult] = await db
    .select({ count: count() })
    .from(siswa)
    .where(and(...conditions, gte(siswa.createdAt, startOfMonth)))

  return {
    total: Number(totalResult?.count ?? 0),
    newThisMonth: Number(newThisMonthResult?.count ?? 0),
  }
}

export async function queryStaffSummary(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)
  const conditions: any[] = [eq(guru.active, true)]
  if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))

  const [totalResult] = await db
    .select({ count: count() })
    .from(guru)
    .where(and(...conditions))

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const [newThisMonthResult] = await db
    .select({ count: count() })
    .from(guru)
    .where(and(...conditions, gte(guru.createdAt, startOfMonth)))

  return {
    total: Number(totalResult?.count ?? 0),
    newThisMonth: Number(newThisMonthResult?.count ?? 0),
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

  const [totalResult] = await db
    .select({ count: count() })
    .from(kelas)
    .where(and(...kelasConditions))

  const tingkatRows = await db
    .select({ tingkat: kelas.tingkat })
    .from(kelas)
    .where(and(...kelasConditions))
    .groupBy(kelas.tingkat)

  return {
    total: Number(totalResult?.count ?? 0),
    distinctTingkat: tingkatRows.length,
  }
}

export async function queryPendingPayment(ctx: QueryCtx) {
  const sekolahIdFilter = getSekolahIdFilter(ctx as any)
  const conditions: any[] = [eq(invoice.status, "issued")]
  if (sekolahIdFilter) {
    const siswaRecords = await db.query.siswa.findMany({
      where: (s: any, { eq }: any) => eq(s.sekolahId, sekolahIdFilter),
      columns: { id: true },
    })
    if (siswaRecords.length === 0) return { count: 0 }
    conditions.push(inArray(invoice.studentId, siswaRecords.map((s: any) => s.id)))
  }
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
    .select({ count: count() })
    .from(absensiSiswa)
    .where(and(...absensiConditions))

  const totalToday = Number(countResult?.count ?? 0)
  if (totalToday === 0) return null

  const [hadirResult] = await db
    .select({ count: count() })
    .from(absensiSiswa)
    .where(and(...absensiConditions, eq(absensiSiswa.status, "hadir")))
  const hadir = Number(hadirResult?.count ?? 0)

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

  if (sekolahIdFilter) {
    const siswaRecords = await db.query.siswa.findMany({
      where: (s: any, { eq }: any) => eq(s.sekolahId, sekolahIdFilter),
      columns: { id: true },
    })
    if (siswaRecords.length === 0) return { total: 0 }
    invoiceConditions.push(inArray(invoice.studentId, siswaRecords.map((s: any) => s.id)))
  }

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

  async function getTop(jenis: "positif" | "negatif") {
    const rows = await db
      .select({
        siswaId: poinSikap.siswaId,
        totalPoin: sum(poinSikap.poin).mapWith(Number),
      })
      .from(poinSikap)
      .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
      .where(and(...dateConditions, eq(poinKategori.jenis, jenis)))
      .groupBy(poinSikap.siswaId)
      .orderBy(desc(sql`sum(${poinSikap.poin})`))
      .limit(5)

    return enrichNamaSiswa(rows)
  }

  const [positive, negative, totalNegatif] = await Promise.all([
    getTop("positif"),
    getTop("negatif"),
    db
      .select({ total: sum(poinSikap.poin) })
      .from(poinSikap)
      .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
      .where(and(...dateConditions, eq(poinKategori.jenis, "negatif")))
      .then((r) => Number(r[0]?.total ?? 0)),
  ])

  return { positive, negative, totalNegativeThisMonth: totalNegatif, period }
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

export async function queryKalenderEvents(
  ctx: QueryCtx,
  input: { search?: string; bulan?: number; tahun?: number; tipe?: "kegiatan" | "libur" | "lainnya"; limit?: number; offset?: number }
) {
  const sekolahId = ctx.session.user.sekolahId
  if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

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
