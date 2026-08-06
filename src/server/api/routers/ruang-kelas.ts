import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like } from "drizzle-orm"
import { db } from "@/server/db"
import { ruangKelas } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"

const ruangKelasCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  namaRuang: z.string(),
  kapasitas: z.number().int().nullable().optional(),
})

const ruangKelasUpdateSchema = ruangKelasCreateSchema.partial()


export const ruangKelasRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sekolahId: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      const effectiveSekolahId = sekolahIdFilter || input.sekolahId
      if (effectiveSekolahId) conditions.push(eq(ruangKelas.sekolahId, effectiveSekolahId))
      if (input.search) {
        conditions.push(like(ruangKelas.namaRuang, `%${input.search}%`))
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db.query.ruangKelas.findMany({
        where: whereClause,
        limit: input.limit,
        offset: input.offset,
      })
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(ruangKelas.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(ruangKelas.sekolahId, sekolahIdFilter))
      const result = await db.query.ruangKelas.findFirst({
        where: and(...conditions),
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Ruang kelas tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(ruangKelasCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(ruangKelas).values({ ...input, id, sekolahId } as any).returning()
      await logAudit(ctx, { action: "create", entity: "ruang_kelas", entityId: result[0]?.id, metadata: { namaRuang: input.namaRuang } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: ruangKelasUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(ruangKelas.id, input.id), eq(ruangKelas.sekolahId, sekolahId)]
      const existing = await db.query.ruangKelas.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Ruang kelas tidak ditemukan" })
      const updateData = { ...input.data }
      delete (updateData as any).sekolahId
      const result = await db
        .update(ruangKelas)
        .set(updateData as any)
        .where(and(...conditions))
        .returning()
      await logAudit(ctx, { action: "update", entity: "ruang_kelas", entityId: result[0]?.id, metadata: { fields: Object.keys(updateData) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(ruangKelas.id, input.id), eq(ruangKelas.sekolahId, sekolahId)]
      const existing = await db.query.ruangKelas.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Ruang kelas tidak ditemukan" })
      await db.delete(ruangKelas).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "ruang_kelas", entityId: input.id })
      return { success: true }
    }),
})
