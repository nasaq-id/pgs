import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, desc, asc, inArray, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { kelas, siswa } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

const kelasCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  tahunAjaranId: z.string().nullable().optional(),
  namaKelas: z.string(),
  tingkat: z.string().nullable().optional(),
  waliKelasId: z.string().nullable().optional(),
  kapasitas: z.number().nullable().optional(),
  siswaIds: z.array(z.string()).optional(),
})

const kelasUpdateSchema = kelasCreateSchema.partial()


export const kelasRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sekolahId: z.string().optional(),
        tahunAjaranId: z.string().optional(),
        sortBy: z.enum(["namaKelas", "tingkat"]).optional().default("namaKelas"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(200), // increased default limit to prevent list truncation
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = []
      const effectiveSekolahId = sekolahIdFilter || input.sekolahId
      if (effectiveSekolahId) conditions.push(eq(kelas.sekolahId, effectiveSekolahId))
      if (input.tahunAjaranId) conditions.push(eq(kelas.tahunAjaranId, input.tahunAjaranId))
      if (input.search) {
        conditions.push(like(kelas.namaKelas, `%${input.search}%`))
      }
      const orderBy = input.sortOrder === "asc" ? asc(kelas[input.sortBy]) : desc(kelas[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select({
          id: kelas.id,
          sekolahId: kelas.sekolahId,
          tahunAjaranId: kelas.tahunAjaranId,
          namaKelas: kelas.namaKelas,
          tingkat: kelas.tingkat,
          waliKelasId: kelas.waliKelasId,
          kapasitas: kelas.kapasitas,
          siswaCount: sql<number>`count(${siswa.id})::int`,
        })
        .from(kelas)
        .leftJoin(siswa, eq(siswa.kelasId, kelas.id))
        .where(whereClause)
        .groupBy(kelas.id)
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
      const sekolahId = getSekolahIdFilter(ctx as any) || input.sekolahId
      const id = input.id || crypto.randomUUID()
      const { siswaIds, ...kelasData } = input
      const result = await db.insert(kelas).values({ ...kelasData, id, sekolahId } as any).returning()
      if (siswaIds && siswaIds.length > 0) {
        await db
          .update(siswa)
          .set({ kelasId: id })
          .where(and(eq(siswa.sekolahId, sekolahId), inArray(siswa.id, siswaIds)))
      }
      await logAudit(ctx, { action: "create", entity: "kelas", entityId: result[0]?.id, metadata: { namaKelas: input.namaKelas } })
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
      const { siswaIds, ...kelasData } = input.data
      const result = await db
        .update(kelas)
        .set(kelasData as any)
        .where(and(...conditions))
        .returning()
      if (siswaIds) {
        await db
          .update(siswa)
          .set({ kelasId: null })
          .where(and(eq(siswa.kelasId, input.id), eq(siswa.sekolahId, existing.sekolahId)))
        if (siswaIds.length > 0) {
          await db
            .update(siswa)
            .set({ kelasId: input.id })
            .where(and(eq(siswa.sekolahId, existing.sekolahId), inArray(siswa.id, siswaIds)))
        }
      }
      await logAudit(ctx, { action: "update", entity: "kelas", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
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
      await db
        .update(siswa)
        .set({ kelasId: null })
        .where(and(eq(siswa.kelasId, input.id), eq(siswa.sekolahId, existing.sekolahId)))
      await db.delete(kelas).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "kelas", entityId: input.id })
      return { success: true }
    }),
})
