import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { kelas, sekolah, tahunAjaran, guru } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"

const kelasCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  tahunAjaranId: z.string().nullable().optional(),
  namaKelas: z.string(),
  tingkat: z.string().nullable().optional(),
  waliKelasId: z.string().nullable().optional(),
  kapasitas: z.number().nullable().optional(),
})

const kelasUpdateSchema = kelasCreateSchema.partial()

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export const kelasRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sekolahId: z.string().optional(),
        tahunAjaranId: z.string().optional(),
        sortBy: z.enum(["namaKelas", "tingkat"]).optional().default("namaKelas"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = []
      const effectiveSekolahId = input.sekolahId || sekolahIdFilter
      if (effectiveSekolahId) conditions.push(eq(kelas.sekolahId, effectiveSekolahId))
      if (input.tahunAjaranId) conditions.push(eq(kelas.tahunAjaranId, input.tahunAjaranId))
      if (input.search) {
        conditions.push(like(kelas.namaKelas, `%${input.search}%`))
      }
      const orderBy = input.sortOrder === "asc" ? asc(kelas[input.sortBy]) : desc(kelas[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select()
        .from(kelas)
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
      const conditions = [eq(kelas.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(kelas.sekolahId, sekolahIdFilter))
      const result = await db.query.kelas.findFirst({
        where: and(...conditions),
        with: { sekolah: true, tahunAjaran: true, waliKelas: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(kelasCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(kelas).values({ ...input, id } as any).returning()
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string(), data: kelasUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(kelas.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(kelas.sekolahId, sekolahIdFilter))
      const existing = await db.query.kelas.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
      const result = await db
        .update(kelas)
        .set(input.data as any)
        .where(and(...conditions))
        .returning()
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(kelas.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(kelas.sekolahId, sekolahIdFilter))
      const existing = await db.query.kelas.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
      await db.delete(kelas).where(and(...conditions))
      return { success: true }
    }),
})
