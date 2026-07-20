import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, or, like, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { mataPelajaran } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

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


export const mapelRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tingkat: z.string().optional(),
        sortBy: z.enum(["namaMapel", "kodeMapel", "urutan"]).optional().default("urutan"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(100),
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
      const data = await db.query.mataPelajaran.findMany({
        where: whereClause,
        orderBy,
        limit: input.limit,
        offset: input.offset,
        with: {
          pengampu: {
            with: {
              kelas: true,
            },
          },
        },
      })

      if (input.tingkat && input.tingkat !== "semua") {
        const selectedTingkat = input.tingkat.trim().toLowerCase()
        return data.filter((item) => {
          if (!item.pengampu || item.pengampu.length === 0) return false
          return item.pengampu.some((p) => {
            if (!p.kelas) return false
            const kTingkat = (p.kelas.tingkat || "").trim().toLowerCase()
            const kNama = (p.kelas.namaKelas || "").trim().toLowerCase()
            return kTingkat === selectedTingkat || kTingkat.includes(selectedTingkat) || kNama.startsWith(selectedTingkat)
          })
        })
      }

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
      const sekolahId = getSekolahIdFilter(ctx as any) || input.sekolahId
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(mataPelajaran).values({ ...input, id, sekolahId } as any).returning()
      await logAudit(ctx, { action: "create", entity: "mata_pelajaran", entityId: result[0]?.id, metadata: { namaMapel: input.namaMapel } })
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
      await logAudit(ctx, { action: "update", entity: "mata_pelajaran", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
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
      await logAudit(ctx, { action: "delete", entity: "mata_pelajaran", entityId: input.id })
      return { success: true }
    }),

  reorder: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({
      items: z.array(z.object({ id: z.string(), urutan: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      for (const item of input.items) {
        const conditions = [eq(mataPelajaran.id, item.id)]
        if (sekolahIdFilter) conditions.push(eq(mataPelajaran.sekolahId, sekolahIdFilter))
        await db.update(mataPelajaran).set({ urutan: item.urutan }).where(and(...conditions))
      }
      await logAudit(ctx, { action: "reorder", entity: "mata_pelajaran", metadata: { count: input.items.length } })
      return { success: true }
    }),
})
