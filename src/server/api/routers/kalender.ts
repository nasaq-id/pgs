import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, asc, gte, lte, like } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "../trpc"
import { db } from "@/server/db"
import { kalenderEvent } from "@/server/db/schema"
import { logAudit } from "@/server/audit"
import { createNotifikasi } from "@/server/notifikasi"
import { getLiburNasional } from "@/lib/libur-nasional"
import { queryKalenderEvents } from "@/server/api/dashboard-queries"

export const kalenderRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        bulan: z.number().optional(),
        tahun: z.number().optional(),
        tipe: z.enum(["kegiatan", "libur", "lainnya"]).optional(),
        limit: z.number().optional().default(200),
        offset: z.number().optional().default(0),
      }),
    )
    .query(({ ctx, input }) => queryKalenderEvents(ctx, input)),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const event = await db.query.kalenderEvent.findFirst({
        where: and(eq(kalenderEvent.id, input.id), eq(kalenderEvent.sekolahId, sekolahId)),
      })
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event tidak ditemukan" })
      return event
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(
      sanitized(z.object({
        judul: z.string().min(1),
        deskripsi: z.string().optional(),
        tanggalMulai: z.string(),
        tanggalSelesai: z.string().optional(),
        tipe: z.enum(["kegiatan", "libur", "lainnya"]).optional().default("kegiatan"),
        isLiburNasional: z.boolean().optional().default(false),
        warna: z.string().optional(),
      })),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const [created] = await db
        .insert(kalenderEvent)
        .values({
          id: crypto.randomUUID(),
          sekolahId,
          judul: input.judul,
          deskripsi: input.deskripsi,
          tanggalMulai: new Date(input.tanggalMulai),
          tanggalSelesai: input.tanggalSelesai ? new Date(input.tanggalSelesai) : null,
          tipe: input.tipe,
          isLiburNasional: input.isLiburNasional,
          warna: input.warna || null,
        })
        .returning()

      await logAudit(ctx, { action: "create", entity: "kalender", entityId: created.id, metadata: { judul: input.judul } })
      await createNotifikasi(ctx, {
        judul: "Event Baru",
        pesan: `Event "${input.judul}" telah ditambahkan ke kalender akademik.`,
        tipe: "info",
        link: "/pengaturan/kalender",
      })
      return created
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(
      sanitized(z.object({
        id: z.string(),
        judul: z.string().optional(),
        deskripsi: z.string().optional(),
        tanggalMulai: z.string().optional(),
        tanggalSelesai: z.string().optional(),
        tipe: z.enum(["kegiatan", "libur", "lainnya"]).optional(),
        isLiburNasional: z.boolean().optional(),
        warna: z.string().optional(),
      })),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const { id, ...data } = input
      const existing = await db.query.kalenderEvent.findFirst({
        where: and(eq(kalenderEvent.id, id), eq(kalenderEvent.sekolahId, sekolahId)),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Event tidak ditemukan" })

      const updateData: Record<string, any> = { ...data }
      if (data.tanggalMulai) updateData.tanggalMulai = new Date(data.tanggalMulai)
      if (data.tanggalSelesai) updateData.tanggalSelesai = new Date(data.tanggalSelesai)
      updateData.updatedAt = new Date()

      await db.update(kalenderEvent).set(updateData).where(eq(kalenderEvent.id, id))
      await logAudit(ctx, { action: "update", entity: "kalender", entityId: id, metadata: { fields: Object.keys(data) } })
      return { success: true }
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const existing = await db.query.kalenderEvent.findFirst({
        where: and(eq(kalenderEvent.id, input.id), eq(kalenderEvent.sekolahId, sekolahId)),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Event tidak ditemukan" })

      await db.delete(kalenderEvent).where(eq(kalenderEvent.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "kalender", entityId: input.id })
      return { success: true }
    }),

  getLiburNasional: protectedProcedure
    .input(z.object({ tahun: z.number() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const startDate = new Date(input.tahun, 0, 1)
      const endDate = new Date(input.tahun, 11, 31, 23, 59, 59)

      return db.query.kalenderEvent.findMany({
        where: and(
          eq(kalenderEvent.sekolahId, sekolahId),
          eq(kalenderEvent.isLiburNasional, true),
          gte(kalenderEvent.tanggalMulai, startDate),
          lte(kalenderEvent.tanggalMulai, endDate),
        ),
        orderBy: asc(kalenderEvent.tanggalMulai),
      })
    }),

  seedLiburNasional: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ tahun: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const startDate = new Date(input.tahun, 0, 1)
      const endDate = new Date(input.tahun, 11, 31, 23, 59, 59)

      // Delete existing national holidays for this school and year to prevent duplicates and clean old data
      await db.delete(kalenderEvent).where(
        and(
          eq(kalenderEvent.sekolahId, sekolahId),
          eq(kalenderEvent.isLiburNasional, true),
          gte(kalenderEvent.tanggalMulai, startDate),
          lte(kalenderEvent.tanggalMulai, endDate),
        ),
      )

      const holidays = getLiburNasional(input.tahun)
      let created = 0

      for (const h of holidays) {
        await db.insert(kalenderEvent).values({
          id: crypto.randomUUID(),
          sekolahId,
          judul: h.judul,
          tanggalMulai: new Date(h.tanggalMulai),
          tanggalSelesai: h.tanggalSelesai ? new Date(h.tanggalSelesai) : null,
          tipe: "libur",
          isLiburNasional: true,
          warna: "#ef4444",
        })
        created++
      }

      if (created > 0) {
        await logAudit(ctx, { action: "seed", entity: "kalender", entityId: "bulk", metadata: { tahun: input.tahun, count: created } })
        await createNotifikasi(ctx, {
          judul: "Libur Nasional",
          pesan: `${created} hari libur nasional tahun ${input.tahun} berhasil ditambahkan ke kalender akademik.`,
          tipe: "success",
          link: "/pengaturan/kalender",
        })
      }

      return { created }
    }),
})