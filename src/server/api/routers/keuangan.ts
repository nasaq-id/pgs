import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { tagihanSpp, siswa } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { billingRouter } from "./finance-billing"
import { paymentRouter } from "./finance-payment"
import { discountRouter } from "./finance-discount"
import { reportRouter } from "./finance-report"
import { settingsRouter } from "./finance-settings"

const tagihanCreateSchema = z.object({
  id: z.string().optional(),
  siswaId: z.string(),
  noTagihan: z.string().nullable().optional(),
  bulan: z.number(),
  tahun: z.number(),
  jumlah: z.number(),
  statusPembayaran: z.enum(["pending", "lunas", "tertunggak"]).optional(),
  tanggalBayar: z.coerce.date().nullable().optional(),
})

const tagihanUpdateSchema = z.object({
  statusPembayaran: z.enum(["pending", "lunas", "tertunggak"]).optional(),
  tanggalBayar: z.coerce.date().nullable().optional(),
  jumlah: z.number().optional(),
})

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export const keuanganRouter = router({
  // ─── Existing procedures (backward compat) ───────────────
  getBySiswa: protectedProcedure
    .input(
      z.object({
        siswaId: z.string(),
        tahun: z.number().optional(),
        sortBy: z.enum(["bulan", "tahun"]).optional().default("tahun"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const siswaRecord = await db.query.siswa.findFirst({
          where: eq(siswa.id, input.siswaId),
        })
        if (!siswaRecord || siswaRecord.sekolahId !== sekolahIdFilter) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
        }
      }
      const conditions = [eq(tagihanSpp.siswaId, input.siswaId)]
      if (input.tahun) conditions.push(eq(tagihanSpp.tahun, input.tahun))
      const orderBy = input.sortOrder === "asc" ? asc(tagihanSpp[input.sortBy]) : desc(tagihanSpp[input.sortBy])
      const data = await db
        .select()
        .from(tagihanSpp)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(tagihanCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const siswaRecord = await db.query.siswa.findFirst({
          where: and(eq(siswa.id, input.siswaId), eq(siswa.sekolahId, sekolahIdFilter)),
        })
        if (!siswaRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Siswa tidak berada di sekolah Anda" })
        }
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(tagihanSpp)
        .values({ ...input, id } as any)
        .returning()
      await logAudit(ctx, { action: "create", entity: "tagihan_spp", entityId: result[0]?.id, metadata: { siswaId: input.siswaId, tahun: input.tahun, bulan: input.bulan } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: tagihanUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.tagihanSpp.findFirst({
        where: eq(tagihanSpp.id, input.id),
        with: { siswa: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tagihan tidak ditemukan" })
      if (sekolahIdFilter && existing.siswa?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tagihan tidak ditemukan" })
      }
      const result = await db
        .update(tagihanSpp)
        .set(input.data as any)
        .where(eq(tagihanSpp.id, input.id))
        .returning()
      await logAudit(ctx, { action: "update", entity: "tagihan_spp", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  // ─── New bounded context sub-routers ─────────────────────
  billing: billingRouter,
  payment: paymentRouter,
  discount: discountRouter,
  report: reportRouter,
  settings: settingsRouter,
})
