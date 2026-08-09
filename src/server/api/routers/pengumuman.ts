import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, lte } from "drizzle-orm"
import { db } from "@/server/db"
import { pengumuman, sekolah } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized, strictRateLimit, moderateRateLimit } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { createNotifikasi } from "@/server/notifikasi"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"
import { queryPublishedAnnouncements } from "@/server/api/dashboard-queries"

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



export const pengumumanRouter = router({
  getAll: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(
      z.object({
        search: z.string().optional(),
        filterStatus: z.enum(["published", "draft", "all"]).optional().default("all"),
        filterTarget: z.enum(["semua", "guru", "siswa", "orang_tua"]).optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(pengumuman.sekolahId, sekolahIdFilter))
      if (input.search) conditions.push(like(pengumuman.judul, `%${input.search}%`))
      if (input.filterStatus === "published") conditions.push(eq(pengumuman.published, true))
      if (input.filterStatus === "draft") conditions.push(eq(pengumuman.published, false))
      if (input.filterTarget) conditions.push(eq(pengumuman.target, input.filterTarget))

      const data = await db.query.pengumuman.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: desc(pengumuman.createdAt),
        limit: input.limit,
        offset: input.offset,
      })
      return data
    }),

  getPublished: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
      }),
    )
    .query(({ ctx, input }) => queryPublishedAnnouncements(ctx, input.limit, input.offset)),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(pengumuman.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(pengumuman.sekolahId, sekolahIdFilter))
      const result = await db.query.pengumuman.findFirst({
        where: and(...conditions),
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(pengumumanCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const id = input.id || crypto.randomUUID()
      
      let tanggalPublish = new Date()
      if (input.tanggalPublish) {
        const inputDate = new Date(input.tanggalPublish)
        const todayStr = new Date().toISOString().split("T")[0]
        if (input.tanggalPublish === todayStr) {
          tanggalPublish = new Date()
        } else {
          tanggalPublish = inputDate
        }
      }

      const [result] = await db.insert(pengumuman).values({
        ...input,
        id,
        sekolahId,
        tanggalPublish,
      } as any).returning()

      await logAudit(ctx, { action: "create", entity: "pengumuman", entityId: id, metadata: { judul: input.judul } })

      if (result?.published) {
        await createNotifikasi(ctx as any, {
          judul: "Pengumuman Baru",
          pesan: input.judul,
          tipe: "info",
          link: `/konten/pengumuman?id=${id}`,
        })
      }

      return result
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: pengumumanUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(pengumuman.id, input.id), eq(pengumuman.sekolahId, sekolahId)]
      const existing = await db.query.pengumuman.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" })
      const { tanggalPublish, ...rest } = input.data
      const updateData: any = { ...rest }
      if (tanggalPublish !== undefined) {
        if (tanggalPublish) {
          const inputDate = new Date(tanggalPublish)
          const todayStr = new Date().toISOString().split("T")[0]
          if (tanggalPublish === todayStr) {
            updateData.tanggalPublish = new Date()
          } else {
            updateData.tanggalPublish = inputDate
          }
        } else {
          updateData.tanggalPublish = new Date()
        }
      }
      const [result] = await db
        .update(pengumuman)
        .set(updateData)
        .where(and(...conditions))
        .returning()

      await logAudit(ctx, { action: "update", entity: "pengumuman", entityId: result?.id, metadata: { fields: Object.keys(updateData) } })

      const wasPublishedOffline = result?.published && !existing.published
      if (wasPublishedOffline) {
        await createNotifikasi(ctx as any, {
          judul: "Pengumuman Baru",
          pesan: result.judul,
          tipe: "info",
          link: `/konten/pengumuman?id=${input.id}`,
        })
      }

      return result
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(pengumuman.id, input.id), eq(pengumuman.sekolahId, sekolahId)]
      const existing = await db.query.pengumuman.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Pengumuman tidak ditemukan" })
      await db.delete(pengumuman).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "pengumuman", entityId: input.id })
      return { success: true }
    }),

  getCounts: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .query(async ({ ctx }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(pengumuman.sekolahId, sekolahIdFilter))
      const all = await db.query.pengumuman.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
      })
      const published = all.filter((p) => p.published).length
      const draft = all.length - published
      return { total: all.length, published, draft }
    }),
})
