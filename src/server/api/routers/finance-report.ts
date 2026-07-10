import { z } from "zod"
import { eq, and, sql, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { invoice, payment } from "@/server/db/schema"
import { router, protectedProcedure } from "@/server/api/trpc"

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export const reportRouter = router({
  // ─── DASHBOARD SUMMARY ───────────────────────────────────
  dashboardSummary: protectedProcedure
    .input(z.object({ tahun: z.number().optional(), bulan: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const sekarang = new Date()
      const tahun = input?.tahun || sekarang.getFullYear()
      const bulan = input?.bulan || sekarang.getMonth() + 1

      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      let filterSiswaIds: string[] | null = null
      if (sekolahIdFilter) {
        const siswaRecords = await db.query.siswa.findMany({
          where: (siswa: any, { eq }: any) => eq(siswa.sekolahId, sekolahIdFilter),
          columns: { id: true },
        })
        filterSiswaIds = siswaRecords.map((s: any) => s.id)
      }

      const periodCondition = filterSiswaIds
        ? and(eq(invoice.periodYear, tahun), eq(invoice.periodMonth, bulan), inArray(invoice.studentId, filterSiswaIds))
        : and(eq(invoice.periodYear, tahun), eq(invoice.periodMonth, bulan))

      const bulanInvoices = await db.select().from(invoice).where(periodCondition)
      const totalPiutang = bulanInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
      const totalTerbayar = bulanInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0)
      const siswaMenunggak = new Set(bulanInvoices.filter((inv) => Number(inv.paidAmount) < Number(inv.totalAmount)).map((inv) => inv.studentId))
      const semuaSiswa = new Set(bulanInvoices.map((inv) => inv.studentId))
      const tingkatKepatuhan = semuaSiswa.size > 0 ? Math.round((1 - siswaMenunggak.size / semuaSiswa.size) * 100) : 0

      return {
        totalPiutang,
        totalTerbayar,
        sisaPiutang: totalPiutang - totalTerbayar,
        jumlahMenunggak: siswaMenunggak.size,
        totalSiswa: semuaSiswa.size,
        tingkatKepatuhan,
      }
    }),

  // ─── MONTHLY TREND ───────────────────────────────────────
  monthlyTrend: protectedProcedure
    .input(z.object({ tahun: z.number() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const bulanInvoices = await db
        .select({
          bulan: invoice.periodMonth,
          total: sql<number>`sum(${invoice.totalAmount})`,
          paid: sql<number>`sum(${invoice.paidAmount})`,
        })
        .from(invoice)
        .where(eq(invoice.periodYear, input.tahun))
        .groupBy(invoice.periodMonth)
        .orderBy(invoice.periodMonth)

      return bulanInvoices.map((b: any) => ({
        bulan: b.bulan,
        total: Number(b.total),
        paid: Number(b.paid),
      }))
    }),

  // ─── OUTSTANDING REPORT ──────────────────────────────────
  outstanding: protectedProcedure
    .input(z.object({ kelasId: z.string().optional(), limit: z.number().default(100) }))
    .query(async ({ ctx, input }) => {
      const overdueInvoices = await db
        .select()
        .from(invoice)
        .where(
          and(
            sql`${invoice.status} NOT IN ('paid', 'cancelled')`,
            sql`${invoice.dueDate} < NOW()`,
          ),
        )
        .limit(input.limit)

      return overdueInvoices
    }),

  // ─── SPP REKAP ───────────────────────────────────────────
  rekapSpp: protectedProcedure
    .input(z.object({ tahun: z.number().optional(), kelasId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const tahun = input?.tahun || new Date().getFullYear()
      const invoices = await db
        .select()
        .from(invoice)
        .where(eq(invoice.periodYear, tahun))

      return invoices
    }),
})
