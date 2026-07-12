import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc, or } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure } from "../trpc"
import { db } from "@/server/db"
import { notifikasi, sekolah } from "@/server/db/schema"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

export const notifikasiRouter = router({
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(5) }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const data = await db
        .select()
        .from(notifikasi)
        .where(eq(notifikasi.sekolahId, sekolahId))
        .orderBy(desc(notifikasi.createdAt))
        .limit(input.limit)

      return data
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
        unreadOnly: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const conditions = [eq(notifikasi.sekolahId, sekolahId)]
      if (input.unreadOnly) conditions.push(eq(notifikasi.dibaca, false))

      const data = await db
        .select()
        .from(notifikasi)
        .where(and(...conditions))
        .orderBy(desc(notifikasi.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      const total = await db
        .select({ count: notifikasi.id })
        .from(notifikasi)
        .where(and(...conditions))

      return { data, total: total.length }
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

    const result = await db
      .select({ count: notifikasi.id })
      .from(notifikasi)
      .where(and(eq(notifikasi.sekolahId, sekolahId), eq(notifikasi.dibaca, false)))

    return { count: result.length }
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const existing = await db.query.notifikasi.findFirst({
        where: and(eq(notifikasi.id, input.id), eq(notifikasi.sekolahId, sekolahId)),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Notifikasi tidak ditemukan" })

      await db.update(notifikasi).set({ dibaca: true }).where(eq(notifikasi.id, input.id))
      return { success: true }
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

    await db.update(notifikasi).set({ dibaca: true }).where(eq(notifikasi.sekolahId, sekolahId))
    return { success: true }
  }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(
      z.object({
        judul: z.string().min(1),
        pesan: z.string().min(1),
        tipe: z.enum(["info", "success", "warning", "error"]).optional().default("info"),
        link: z.string().optional(),
        targetRoles: z.array(z.enum(["guru", "siswa", "orang_tua", "tu"])).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const [created] = await db
        .insert(notifikasi)
        .values({
          id: crypto.randomUUID(),
          sekolahId,
          judul: input.judul,
          pesan: input.pesan,
          tipe: input.tipe,
          link: input.link,
        })
        .returning()

      await logAudit(ctx, { action: "create", entity: "notifikasi", entityId: created.id, metadata: { judul: input.judul } })
      return created
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const existing = await db.query.notifikasi.findFirst({
        where: and(eq(notifikasi.id, input.id), eq(notifikasi.sekolahId, sekolahId)),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Notifikasi tidak ditemukan" })

      await db.delete(notifikasi).where(eq(notifikasi.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "notifikasi", entityId: input.id })
      return { success: true }
    }),
})