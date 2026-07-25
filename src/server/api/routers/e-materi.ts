import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, or, like, desc, asc, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { eMateri, mataPelajaran, kelas } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

const eMateriSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string().optional(),
  mataPelajaranId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  kelasId: z.string().nullable().optional(),
  tingkat: z.string().nullable().optional(),
  judul: z.string().min(2, "Judul materi terlalu pendek"),
  bab: z.string().nullable().optional(),
  deskripsi: z.string().nullable().optional(),
  tipeMateri: z.enum(["dokumen", "video", "link_eksternal", "teks_artikel"]).default("dokumen"),
  fileUrl: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileSize: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  kontenTeks: z.string().nullable().optional(),
  status: z.enum(["terbit", "draf", "arsip"]).default("terbit"),
  pembuatId: z.string().nullable().optional(),
  pembuatNama: z.string().nullable().optional(),
})

export const eMateriRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        mataPelajaranId: z.string().optional(),
        kelasId: z.string().optional(),
        tingkat: z.string().optional(),
        tipeMateri: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(eMateri.sekolahId, sekolahIdFilter))

      if (input.search) {
        conditions.push(
          or(
            like(eMateri.judul, `%${input.search}%`),
            like(eMateri.bab, `%${input.search}%`),
            like(eMateri.deskripsi, `%${input.search}%`),
          ),
        )
      }
      if (input.mataPelajaranId && input.mataPelajaranId !== "semua") {
        conditions.push(eq(eMateri.mataPelajaranId, input.mataPelajaranId))
      }
      if (input.kelasId && input.kelasId !== "semua") {
        conditions.push(eq(eMateri.kelasId, input.kelasId))
      }
      if (input.tingkat && input.tingkat !== "semua") {
        conditions.push(eq(eMateri.tingkat, input.tingkat))
      }
      if (input.tipeMateri && input.tipeMateri !== "semua") {
        conditions.push(eq(eMateri.tipeMateri, input.tipeMateri as any))
      }
      if (input.status && input.status !== "semua") {
        conditions.push(eq(eMateri.status, input.status as any))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db.query.eMateri.findMany({
        where: whereClause,
        orderBy: [desc(eMateri.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          mataPelajaran: true,
          kelas: true,
          pembuat: true,
        },
      })
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(eMateri.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(eMateri.sekolahId, sekolahIdFilter))

      const result = await db.query.eMateri.findFirst({
        where: and(...conditions),
        with: {
          mataPelajaran: true,
          kelas: true,
          pembuat: true,
        },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Materi pembelajaran tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "guru"])
    .input(eMateriSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx) || input.sekolahId || ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })

      const id = input.id || crypto.randomUUID()
      const pembuatId = input.pembuatId || ctx.session.user.id
      const pembuatNama = input.pembuatNama || ctx.session.user.name || "Pengajar"

      const result = await db
        .insert(eMateri)
        .values({
          ...input,
          id,
          sekolahId,
          pembuatId,
          pembuatNama,
        } as any)
        .returning()

      await logAudit(ctx, {
        action: "create",
        entity: "e_materi",
        entityId: result[0]?.id,
        metadata: { judul: input.judul, tipeMateri: input.tipeMateri },
      })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "guru"])
    .input(z.object({ id: z.string(), data: eMateriSchema.partial() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(eMateri.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(eMateri.sekolahId, sekolahIdFilter))

      const existing = await db.query.eMateri.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Materi pembelajaran tidak ditemukan" })

      const result = await db
        .update(eMateri)
        .set({
          ...input.data,
          updatedAt: new Date(),
        } as any)
        .where(and(...conditions))
        .returning()

      await logAudit(ctx, {
        action: "update",
        entity: "e_materi",
        entityId: result[0]?.id,
        metadata: { fields: Object.keys(input.data) },
      })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "guru"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(eMateri.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(eMateri.sekolahId, sekolahIdFilter))

      const result = await db.delete(eMateri).where(and(...conditions)).returning()
      await logAudit(ctx, {
        action: "delete",
        entity: "e_materi",
        entityId: input.id,
      })
      return result[0]
    }),

  incrementViews: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(eMateri)
        .set({ viewsCount: sql`${eMateri.viewsCount} + 1` })
        .where(eq(eMateri.id, input.id))
      return { success: true }
    }),
})
