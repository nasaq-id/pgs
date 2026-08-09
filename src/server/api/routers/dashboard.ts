import { z } from "zod"
import { db } from "@/server/db"
import { router, protectedProcedure } from "@/server/api/trpc"
import {
  queryStudentSummary,
  queryStaffSummary,
  queryClassSummary,
  queryPendingPayment,
  queryTodayAttendanceRate,
  queryOutstandingReceivables,
  queryRuangKelasCount,
  queryTopStudentPoints,
  queryDashboardSiswa,
  queryDashboardGuruAdmin,
  queryPublishedAnnouncements,
  queryKalenderEvents,
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

      const [studentSummary, staffSummary, classSummary, pendingPayment, attendance, receivables, ruangKelas, topPoints] =
        await Promise.all([
          run(() => queryStudentSummary(ctx)),
          run(() => queryStaffSummary(ctx)),
          run(() => queryClassSummary(ctx)),
          run(() => queryPendingPayment(ctx)),
          run(() => queryTodayAttendanceRate(ctx)),
          run(() => queryOutstandingReceivables(ctx)),
          run(() => queryRuangKelasCount(ctx)),
          run(() => queryTopStudentPoints(ctx)),
        ])

      const [dashboardSiswa, dashboardGuruAdmin, announcements, calendarEvents] = await Promise.all([
        isSiswa ? run(() => queryDashboardSiswa(ctx)) : Promise.resolve(null),
        !isSiswa ? run(() => queryDashboardGuruAdmin(ctx)) : Promise.resolve(null),
        run(() => queryPublishedAnnouncements(ctx, 5)),
        !isSiswa && sekolahId
          ? run(() => queryKalenderEvents(ctx, { tahun, bulan, limit: 200 }))
          : Promise.resolve(null),
      ])

      return {
        studentSummary,
        staffSummary,
        classSummary,
        pendingPayment,
        attendance,
        receivables,
        ruangKelas,
        topPoints,
        dashboardSiswa,
        dashboardGuruAdmin,
        announcements,
        calendarEvents,
      }
    }),
})
