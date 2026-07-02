import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, or, like, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { mataPelajaran, sekolah } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"

const mapelCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  namaMapel: z.string(),
  kodeMapel: z.string().nullable().optional(),
  kelompok: z.enum(["A", "B", "C", "muatan_lokal"]).nullable().optional(),
  kkm: z.number().optional(),
  aktif: z.boolean().optional(),
  urutan: z.number().optional(),
})

const mapelUpdateSchema = mapelCreateSchema.partial()

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export const mapelRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sortBy: z.enum(["namaMapel", "kodeMapel", "urutan"]).optional().default("urutan"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(mataPelajaran.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(
          or(like(mataPelajaran.namaMapel, `%${input.search}%`), like(mataPelajaran.kodeMapel, `%${input.search}%`)),
        )
      }
      const orderBy = input.sortOrder === "asc" ? asc(mataPelajaran[input.sortBy]) : desc(mataPelajaran[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select()
        .from(mataPelajaran)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(mataPelajaran.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(mataPelajaran.sekolahId, sekolahIdFilter))
      const result = await db.query.mataPelajaran.findFirst({
        where: and(...conditions),
        with: { sekolah: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Mata pelajaran tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(mapelCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(mataPelajaran).values({ ...input, id } as any).returning()
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: mapelUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(mataPelajaran.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(mataPelajaran.sekolahId, sekolahIdFilter))
      const existing = await db.query.mataPelajaran.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Mata pelajaran tidak ditemukan" })
      const result = await db
        .update(mataPelajaran)
        .set(input.data as any)
        .where(and(...conditions))
        .returning()
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(mataPelajaran.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(mataPelajaran.sekolahId, sekolahIdFilter))
      const existing = await db.query.mataPelajaran.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Mata pelajaran tidak ditemukan" })
      await db.delete(mataPelajaran).where(and(...conditions))
      return { success: true }
    }),
})
