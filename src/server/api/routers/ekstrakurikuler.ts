import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { ekstrakurikuler, sekolah } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

const ekstrakurikulerCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  namaEkskul: z.string(),
  pembinaId: z.string().nullable().optional(),
  deskripsi: z.string().nullable().optional(),
  hari: z.string().nullable().optional(),
  jam: z.string().nullable().optional(),
})

const ekstrakurikulerUpdateSchema = ekstrakurikulerCreateSchema.partial()


export const ekstrakurikulerRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sekolahId: z.string().optional(),
        sortBy: z.enum(["namaEkskul", "hari", "jam"]).optional().default("namaEkskul"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      const effectiveSekolahId = sekolahIdFilter || input.sekolahId
      if (effectiveSekolahId) conditions.push(eq(ekstrakurikuler.sekolahId, effectiveSekolahId))
      if (input.search) {
        conditions.push(like(ekstrakurikuler.namaEkskul, `%${input.search}%`))
      }
      const orderBy = input.sortOrder === "asc" ? asc(ekstrakurikuler[input.sortBy]) : desc(ekstrakurikuler[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db.query.ekstrakurikuler.findMany({
        where: whereClause,
        orderBy,
        limit: input.limit,
        offset: input.offset,
        with: { pembina: true },
      })
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(ekstrakurikuler.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(ekstrakurikuler.sekolahId, sekolahIdFilter))
      const result = await db.query.ekstrakurikuler.findFirst({
        where: and(...conditions),
        with: { pembina: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Ekstrakurikuler tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(ekstrakurikulerCreateSchema))
    .mutation(async ({ ctx, input }) => {
      let sekolahId = getSekolahIdFilter(ctx) || input.sekolahId
      if (!sekolahId || sekolahId === "") {
        const firstSekolah = await db.query.sekolah.findFirst()
        if (firstSekolah) {
          sekolahId = firstSekolah.id
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tidak ada sekolah terdaftar di database." })
        }
      }
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(ekstrakurikuler).values({ ...input, id, sekolahId } as any).returning()
      await logAudit(ctx, { action: "create", entity: "ekstrakurikuler", entityId: result[0]?.id, metadata: { namaEkskul: input.namaEkskul } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: ekstrakurikulerUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(ekstrakurikuler.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(ekstrakurikuler.sekolahId, sekolahIdFilter))
      const existing = await db.query.ekstrakurikuler.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Ekstrakurikuler tidak ditemukan" })
      const updateData = { ...input.data }
      delete (updateData as any).sekolahId
      const result = await db
        .update(ekstrakurikuler)
        .set(updateData as any)
        .where(and(...conditions))
        .returning()
      await logAudit(ctx, { action: "update", entity: "ekstrakurikuler", entityId: result[0]?.id, metadata: { fields: Object.keys(updateData) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(ekstrakurikuler.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(ekstrakurikuler.sekolahId, sekolahIdFilter))
      const existing = await db.query.ekstrakurikuler.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Ekstrakurikuler tidak ditemukan" })
      await db.delete(ekstrakurikuler).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "ekstrakurikuler", entityId: input.id })
      return { success: true }
    }),
})
