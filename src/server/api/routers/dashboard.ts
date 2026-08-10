import { z } from "zod"
import { router, protectedProcedure } from "@/server/api/trpc"
import { cacheKey, getOrSetCache } from "@/lib/cache"
import {
  queryStudentSummary,
  queryStaffSummary,
  queryClassSummary,
  queryPendingPayment,
  queryTodayAttendanceRate,
  queryOutstandingReceivables,
  queryRuangKelasCount,
  queryDashboardStatsAggregated,
  queryTopStudentPoints,
  queryDashboardSiswa,
  queryDashboardAnnouncements,
  queryDashboardKalenderEvents,
} from "@/server/api/dashboard-queries"

export const dashboardRouter = router({
  // ─── TOTAL SISWA ───────────────────────────────────────────
  getStudentSummary: protectedProcedure.query(({ ctx }) => queryStudentSummary(ctx)),

  // ─── GURU & TENDIK ────────────────────────────────────────
  getStaffSummary: protectedProcedure.query(({ ctx }) => queryStaffSummary(ctx)),

  // ─── ROMBEL ───────────────────────────────────────────────
  getClassSummary: protectedProcedure.query(({ ctx }) => queryClassSummary(ctx)),

  // ─── TAGIHAN PENDING (issued / belum dibayar) ──────────────
  getPendingPaymentCount: protectedProcedure.query(({ ctx }) => queryPendingPayment(ctx)),

  // ─── KEHADIRAN HARI INI ───────────────────────────────────
  getTodayAttendanceRate: protectedProcedure.query(({ ctx }) => queryTodayAttendanceRate(ctx)),

  // ─── TOTAL TUNGGAKAN SPP ──────────────────────────────────
  getOutstandingReceivables: protectedProcedure.query(({ ctx }) => queryOutstandingReceivables(ctx)),

  // ─── RUANG KELAS AKTIF ────────────────────────────────────
  getRuangKelasCount: protectedProcedure.query(({ ctx }) => queryRuangKelasCount(ctx)),

  // ─── TOP 5 POIN KESISWAAN ─────────────────────────────────
  getTopStudentPoints: protectedProcedure.query(({ ctx }) => queryTopStudentPoints(ctx)),

  // ─── OVERVIEW TERKONSOLIDASI (1 endpoint, dipakai halaman beranda) ──
  getOverview: protectedProcedure
    .input(
      z.object({
        tahun: z.number().optional(),
        bulan: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const role = ctx.session.user.role || ""
      const isSiswa = role === "siswa"
      const now = new Date()
      const tahun = input.tahun ?? now.getFullYear()
      const bulan = input.bulan ?? now.getMonth() + 1

      // Cache 30 detik. Student data must be isolated per user; admin data is
      // shared per school and role.
      const cacheIdentity = isSiswa
        ? (ctx.session.user.id || ctx.session.user.email || "unknown")
        : role
      const cacheKeyOverview = cacheKey(
        "dashboard:getOverview",
        ctx.session.user.sekolahId || "none",
        cacheIdentity,
        `y${tahun}m${bulan}`,
      )
      return getOrSetCache(cacheKeyOverview, async () => {
        return getOverviewInner(ctx, role, isSiswa, tahun, bulan)
      }, 30)
    }),
})

async function getOverviewInner(
  ctx: any,
  role: string,
  isSiswa: boolean,
  tahun: number,
  bulan: number
) {
  // Setiap bagian di-isolasi: satu sub-query gagal tidak merusak lainnya
  const run = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn()
    } catch (e) {
      const cause = (e as { cause?: Error })?.cause
      console.error("[dashboard-overview] bagian gagal:", e instanceof Error ? e.message : e, "| CAUSE:", cause instanceof Error ? cause.message : (cause ?? "none"))
      return null
    }
  }

  const sekolahId = ctx.session.user.sekolahId

  // Student dashboard only needs its own points and announcements. Avoid
  // running the admin summary queries for every student login.
  if (isSiswa) {
    const [dashboardSiswa, announcements] = await Promise.all([
      run(() => queryDashboardSiswa(ctx)),
      run(() => queryDashboardAnnouncements(ctx, 5)),
    ])

    return {
      studentSummary: null,
      staffSummary: null,
      classSummary: null,
      pendingPayment: null,
      attendance: null,
      receivables: null,
      ruangKelas: null,
      topPoints: null,
      dashboardSiswa,
      dashboardGuruAdmin: null,
      announcements,
      calendarEvents: null,
    }
  }

  // 8 query statistik digabung jadi 1 roundtrip (biaya RTT pooler tinggi).
  const [stats, topPoints] = await Promise.all([
    run(() => queryDashboardStatsAggregated(ctx)),
    run(() => queryTopStudentPoints(ctx)),
  ])

  const [announcements, calendarEvents] = await Promise.all([
    run(() => queryDashboardAnnouncements(ctx, 5)),
    sekolahId
      ? run(() => queryDashboardKalenderEvents(ctx, { tahun, bulan, limit: 60 }))
      : Promise.resolve(null),
  ])

  return {
    studentSummary: stats?.studentSummary ?? null,
    staffSummary: stats?.staffSummary ?? null,
    classSummary: stats?.classSummary ?? null,
    pendingPayment: stats?.pendingPayment ?? null,
    attendance: stats?.attendance ?? null,
    receivables: stats?.receivables ?? null,
    ruangKelas: stats?.ruangKelas ?? null,
    topPoints,
    dashboardSiswa: null,
    dashboardGuruAdmin: null,
    announcements,
    calendarEvents,
  }
}
