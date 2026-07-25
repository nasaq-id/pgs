import { z } from "zod"
import { eq, and, desc, gte, lt, lte, sql, sum, count, inArray } from "drizzle-orm"
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
} from "@/server/db/schema"
import { router, protectedProcedure } from "@/server/api/trpc"
import { getSekolahIdFilter } from "@/server/api/tenant"


export const dashboardRouter = router({
  // ─── TOTAL SISWA ───────────────────────────────────────────
  getStudentSummary: protectedProcedure.query(async ({ ctx }) => {
    const sekolahIdFilter = getSekolahIdFilter(ctx)
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
  }),

  // ─── GURU & TENDIK ────────────────────────────────────────
  getStaffSummary: protectedProcedure.query(async ({ ctx }) => {
    const sekolahIdFilter = getSekolahIdFilter(ctx)
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
  }),

  // ─── ROMBEL ───────────────────────────────────────────────
  getClassSummary: protectedProcedure.query(async ({ ctx }) => {
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
  }),

  // ─── TAGIHAN PENDING (issued / belum dibayar) ──────────────
  getPendingPaymentCount: protectedProcedure.query(async ({ ctx }) => {
    const sekolahIdFilter = getSekolahIdFilter(ctx)
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
  }),

  // ─── KEHADIRAN HARI INI ───────────────────────────────────
  getTodayAttendanceRate: protectedProcedure.query(async ({ ctx }) => {
    const sekolahIdFilter = getSekolahIdFilter(ctx)

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
  }),

  // ─── TOTAL TUNGGAKAN SPP ──────────────────────────────────
  getOutstandingReceivables: protectedProcedure.query(async ({ ctx }) => {
    const sekolahIdFilter = getSekolahIdFilter(ctx)
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
  }),

  // ─── RUANG KELAS AKTIF ────────────────────────────────────
  getRuangKelasCount: protectedProcedure.query(async ({ ctx }) => {
    const sekolahIdFilter = getSekolahIdFilter(ctx)
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
  }),

  // ─── TOP 5 POIN KESISWAAN ─────────────────────────────────
  getTopStudentPoints: protectedProcedure.query(async ({ ctx }) => {
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

      return Promise.all(
        rows.map(async (row) => {
          const s = await db.query.siswa.findFirst({
            where: eq(siswa.id, row.siswaId),
            columns: { namaLengkap: true },
          })
          return { ...row, namaLengkap: s?.namaLengkap || "-" }
        }),
      )
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
  }),
})
