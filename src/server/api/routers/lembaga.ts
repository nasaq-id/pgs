import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure } from "../trpc"
import { db } from "@/server/db"
import { sekolah, tahunAjaran } from "@/server/db/schema"

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
      akreditasi: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND" })

      await db.update(sekolah).set(input).where(eq(sekolah.id, sekolahId))
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
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      const updateData: Record<string, any> = { ...data }
      if (data.tanggalMulai) updateData.tanggalMulai = new Date(data.tanggalMulai)
      if (data.tanggalSelesai) updateData.tanggalSelesai = new Date(data.tanggalSelesai)

      await db.update(tahunAjaran).set(updateData).where(eq(tahunAjaran.id, id))
      return { success: true }
    }),

  removeTahunAjaran: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(tahunAjaran).where(eq(tahunAjaran.id, input.id))
      return { success: true }
    }),
})
