import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure } from "../trpc"
import { db } from "@/server/db"
import { sekolah, tahunAjaran } from "@/server/db/schema"
import { logAudit } from "@/server/audit"

export const lembagaRouter = router({
  getSekolah: protectedProcedure.query(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

    const data = await db.query.sekolah.findFirst({
      where: eq(sekolah.id, sekolahId),
    })
    if (!data) throw new TRPCError({ code: "NOT_FOUND" })
    return data
  }),

  updateSekolah: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      namaSekolah: z.string().optional(),
      npsn: z.string().optional(),
      jenjang: z.enum(["sd", "smp", "sma", "smk", "mi", "mts", "ma", "tk"]).optional(),
      alamat: z.string().optional(),
      telepon: z.string().optional(),
      emailSekolah: z.string().email().optional(),
      kepalaSekolah: z.string().optional(),
      penyelenggara: z.string().optional(),
      statusSekolah: z.string().optional(),
      kurikulum: z.string().optional(),
      situsWeb: z.string().optional(),
      whatsapp: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      twitter: z.string().optional(),
      akreditasi: z.string().optional(),
      logo: z.string().optional(),
      bobotSumatif: z.number().optional(),
      bobotSas: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND" })

      await db.update(sekolah).set(input).where(eq(sekolah.id, sekolahId))
      await logAudit(ctx, { action: "update", entity: "sekolah", entityId: sekolahId, metadata: { fields: Object.keys(input) } })
      return { success: true }
    }),

  getTahunAjaran: protectedProcedure.query(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) return []

    return db.query.tahunAjaran.findMany({
      where: eq(tahunAjaran.sekolahId, sekolahId),
      orderBy: (ta, { desc }) => [desc(ta.createdAt)],
    })
  }),

  getActiveTahunAjaran: protectedProcedure.query(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) return null

    const data = await db.query.tahunAjaran.findFirst({
      where: and(eq(tahunAjaran.sekolahId, sekolahId), eq(tahunAjaran.active, true)),
    })
    return data || null
  }),

  createTahunAjaran: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      namaTahunAjaran: z.string().min(1),
      semester: z.enum(["ganjil", "genap"]),
      tanggalMulai: z.string().optional(),
      tanggalSelesai: z.string().optional(),
      active: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND" })

      const [inserted] = await db.insert(tahunAjaran).values({
        id: crypto.randomUUID(),
        sekolahId,
        namaTahunAjaran: input.namaTahunAjaran,
        semester: input.semester,
        tanggalMulai: input.tanggalMulai ? new Date(input.tanggalMulai) : null,
        tanggalSelesai: input.tanggalSelesai ? new Date(input.tanggalSelesai) : null,
        active: input.active,
      }).returning()

      await logAudit(ctx, { action: "create", entity: "tahun_ajaran", entityId: inserted.id, metadata: { namaTahunAjaran: input.namaTahunAjaran } })
      return inserted
    }),

  updateTahunAjaran: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      id: z.string(),
      namaTahunAjaran: z.string().optional(),
      semester: z.enum(["ganjil", "genap"]).optional(),
      tanggalMulai: z.string().optional(),
      tanggalSelesai: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      const existing = await db.query.tahunAjaran.findFirst({
        where: eq(tahunAjaran.id, input.id),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tahun ajaran tidak ditemukan" })
      if (sekolahId && existing.sekolahId !== sekolahId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tahun ajaran tidak ditemukan" })
      }
      const { id, ...data } = input
      const updateData: Record<string, any> = { ...data }
      if (data.tanggalMulai) updateData.tanggalMulai = new Date(data.tanggalMulai)
      if (data.tanggalSelesai) updateData.tanggalSelesai = new Date(data.tanggalSelesai)

      await db.update(tahunAjaran).set(updateData).where(eq(tahunAjaran.id, id))
      await logAudit(ctx, { action: "update", entity: "tahun_ajaran", entityId: id, metadata: { fields: Object.keys(data) } })
      return { success: true }
    }),

  removeTahunAjaran: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      const existing = await db.query.tahunAjaran.findFirst({
        where: eq(tahunAjaran.id, input.id),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tahun ajaran tidak ditemukan" })
      if (sekolahId && existing.sekolahId !== sekolahId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tahun ajaran tidak ditemukan" })
      }
      await db.delete(tahunAjaran).where(eq(tahunAjaran.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "tahun_ajaran", entityId: input.id })
      return { success: true }
    }),
})
