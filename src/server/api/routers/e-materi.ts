import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, or, like, desc, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { eMateri, guru } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"
import { cacheKey, getOrSetCache, invalidateCache } from "@/lib/cache"

const eMateriSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string().optional(),
  mataPelajaranId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  kelasId: z.string().nullable().optional(),
  tingkat: z.string().nullable().optional(),
  judul: z.string().min(2, "Judul materi terlalu pendek"),
  bab: z.string().nullable().optional(),
  deskripsi: z.string().nullable().optional(),
  tipeMateri: z.enum(["dokumen", "video", "gambar", "link"]).default("dokumen"),
  url: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  guruId: z.string().nullable().optional(),
  status: z.enum(["terbit", "draf", "arsip"]).default("terbit"),
  pembuatId: z.string().nullable().optional(),
  pembuatNama: z.string().nullable().optional(),
})

const E_MATERI_CACHE_LIMITS = [25, 50, 100, 200, 1000]
const eMateriCacheKeys = (sekolahId: string | null) =>
  E_MATERI_CACHE_LIMITS.map((l) => cacheKey("e-materi:getAll", sekolahId || "all", `l${l}`))

/** Cari guru.id milik session user (role guru) — untuk RBAC kepemilikan materi. */
async function getSessionGuruId(ctx: { session: { user: { id: string; email?: string | null } } }): Promise<string | null> {
  const email = ctx.session.user.email
  if (!email) return null
  const found = await db.query.guru.findFirst({
    where: or(eq(guru.email, email), eq(guru.usernameGuru, email)),
    columns: { id: true },
  })
  return found?.id ?? null
}

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
      const runQuery = () =>
        db.query.eMateri.findMany({
          where: whereClause,
          orderBy: [desc(eMateri.createdAt)],
          limit: input.limit,
          offset: input.offset,
          with: {
            mataPelajaran: true,
            kelas: true,
            guru: true,
          },
        })

      // Hanya varian default (tanpa search/filter, halaman pertama) yang di-cache
      const isDefault =
        !input.search && !input.mataPelajaranId && !input.kelasId && !input.tingkat &&
        !input.tipeMateri && !input.status && input.offset === 0
      if (isDefault) {
        const key = cacheKey("e-materi:getAll", sekolahIdFilter || "all", `l${input.limit}`)
        return getOrSetCache(key, runQuery, 300)
      }
      return runQuery()
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
          guru: true,
        },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Materi pembelajaran tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "guru", "kepsek"])
    .input(sanitized(eMateriSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      await invalidateCache(eMateriCacheKeys(sekolahId))

      const id = input.id || crypto.randomUUID()
      const pembuatId = input.pembuatId || ctx.session.user.id
      const pembuatNama = input.pembuatNama || ctx.session.user.name || "Pengajar"

      const values: Record<string, unknown> = {
        ...input,
        id,
        sekolahId,
        pembuatId,
        pembuatNama,
      }
      // Guru: paksa guruId = guru.id miliknya sendiri (dari session user)
      if (ctx.session.user.role === "guru") {
        const sessionGuruId = await getSessionGuruId(ctx)
        if (!sessionGuruId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akun guru tidak terhubung ke data guru" })
        }
        values.guruId = sessionGuruId
      } else {
        // Non-guru boleh kosong (tidak terikat ke guru tertentu)
        values.guruId = input.guruId ?? null
      }

      const result = await db
        .insert(eMateri)
        .values(values as any)
        .returning()

      await logAudit(ctx, {
        action: "create",
        entity: "e_materi",
        entityId: result[0]?.id,
        metadata: { judul: input.judul, tipeMateri: input.tipeMateri },
      })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "guru", "kepsek"])
    .input(sanitized(z.object({ id: z.string(), data: eMateriSchema.partial() })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      await invalidateCache(eMateriCacheKeys(sekolahId))
      const conditions = [eq(eMateri.id, input.id), eq(eMateri.sekolahId, sekolahId)]

      // Guru hanya boleh mengedit materinya sendiri (berdasarkan guru.id)
      if (ctx.session.user.role === "guru") {
        const sessionGuruId = await getSessionGuruId(ctx)
        if (!sessionGuruId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akun guru tidak terhubung ke data guru" })
        }
        conditions.push(eq(eMateri.guruId, sessionGuruId))
        const allowedData: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(input.data)) {
          if (!["guruId", "pembuatId", "pembuatNama"].includes(k)) allowedData[k] = v
        }
        input.data = allowedData as any
      }

      const result = await db
        .update(eMateri)
        .set({
          ...input.data,
          updatedAt: new Date(),
        } as any)
        .where(and(...conditions))
        .returning()

      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Materi pembelajaran tidak ditemukan" })

      await logAudit(ctx, {
        action: "update",
        entity: "e_materi",
        entityId: result[0]?.id,
        metadata: { fields: Object.keys(input.data) },
      })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "guru", "kepsek"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      await invalidateCache(eMateriCacheKeys(sekolahId))
      const conditions = [eq(eMateri.id, input.id), eq(eMateri.sekolahId, sekolahId)]

      // Guru hanya boleh menghapus materinya sendiri (berdasarkan guru.id)
      if (ctx.session.user.role === "guru") {
        const sessionGuruId = await getSessionGuruId(ctx)
        if (!sessionGuruId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akun guru tidak terhubung ke data guru" })
        }
        conditions.push(eq(eMateri.guruId, sessionGuruId))
      }

      const result = await db.delete(eMateri).where(and(...conditions)).returning()
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Materi pembelajaran tidak ditemukan" })
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
