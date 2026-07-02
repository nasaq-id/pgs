import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, desc } from "drizzle-orm"
import { db } from "@/server/db"
import { pengumuman } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const pengumumanCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  judul: z.string(),
  konten: z.string().nullable().optional(),
  target: z.enum(["semua", "guru", "siswa", "orang_tua"]).optional().default("semua"),
  tanggalPublish: z.string().nullable().optional(),
  published: z.boolean().optional().default(false),
})

const pengumumanUpdateSchema = pengumumanCreateSchema.partial()

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export const pengumumanRouter = router({
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
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = []
      const effectiveSekolahId = sekolahIdFilter || input.sekolahId
      if (effectiveSekolahId) conditions.push(eq(pengumuman.sekolahId, effectiveSekolahId))
      if (input.search) {
        conditions.push(like(pengumuman.judul, `%${input.search}%`))
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db.query.pengumuman.findMany({
        where: whereClause,
        orderBy: desc(pengumuman.createdAt),
        limit: input.limit,
        offset: input.offset,
      })
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(pengumuman.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(pengumuman.sekolahId, sekolahIdFilter))
      const result = await db.query.pengumuman.findFirst({
        where: and(...conditions),
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(pengumumanCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx as any) || input.sekolahId
      const id = input.id || crypto.randomUUID()
      const tanggalPublish = input.tanggalPublish ? new Date(input.tanggalPublish) : null
      const result = await db.insert(pengumuman).values({
        ...input,
        id,
        sekolahId,
        tanggalPublish,
      } as any).returning()
      await logAudit(ctx, { action: "create", entity: "pengumuman", entityId: result[0]?.id, metadata: { judul: input.judul } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: pengumumanUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(pengumuman.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(pengumuman.sekolahId, sekolahIdFilter))
      const existing = await db.query.pengumuman.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" })
      const { tanggalPublish, ...rest } = input.data
      const updateData: any = { ...rest }
      if (tanggalPublish !== undefined) {
        updateData.tanggalPublish = tanggalPublish ? new Date(tanggalPublish) : null
      }
      const result = await db
        .update(pengumuman)
        .set(updateData)
        .where(and(...conditions))
        .returning()
      await logAudit(ctx, { action: "update", entity: "pengumuman", entityId: result[0]?.id, metadata: { fields: Object.keys(updateData) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(pengumuman.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(pengumuman.sekolahId, sekolahIdFilter))
      const existing = await db.query.pengumuman.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" })
      await db.delete(pengumuman).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "pengumuman", entityId: input.id })
      return { success: true }
    }),
})
