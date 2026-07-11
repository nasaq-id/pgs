import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure } from "../trpc"
import { db } from "@/server/db"
import { pengampu, kelas, guru, mataPelajaran } from "@/server/db/schema"
import { logAudit } from "@/server/audit"

export const pengampuRouter = router({
  getByMapel: protectedProcedure
    .input(z.object({ mataPelajaranId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const data = await db.query.pengampu.findMany({
        where: eq(pengampu.mataPelajaranId, input.mataPelajaranId),
        with: {
          guru: true,
          kelas: true,
        },
      })

      const allKelas = await db.query.kelas.findMany({
        where: eq(kelas.sekolahId, sekolahId),
      })

      const allGuru = await db.query.guru.findMany({
        where: eq(guru.sekolahId, sekolahId),
      })

      const mapel = await db.query.mataPelajaran.findFirst({
        where: eq(mataPelajaran.id, input.mataPelajaranId),
      })

      return {
        mapel,
        allKelas,
        allGuru,
        assignments: data.map((d) => ({
          id: d.id,
          guruId: d.guruId,
          guruNama: d.guru.namaLengkap,
          kelasId: d.kelasId,
          kelasNama: d.kelas.namaKelas,
          jumlahJam: d.jumlahJam,
        })),
      }
    }),

  getByKelas: protectedProcedure
    .input(z.object({ kelasId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const data = await db.query.pengampu.findMany({
        where: eq(pengampu.kelasId, input.kelasId),
        with: {
          guru: true,
          mataPelajaran: true,
        },
      })

      return data.map((d) => ({
        id: d.id,
        guruId: d.guruId,
        guruNama: d.guru.namaLengkap,
        mataPelajaranId: d.mataPelajaranId,
        mapelNama: d.mataPelajaran.namaMapel,
        mapelKode: d.mataPelajaran.kodeMapel,
        jumlahJam: d.jumlahJam,
      }))
    }),

  save: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({
      mataPelajaranId: z.string(),
      assignments: z.array(z.object({
        guruId: z.string(),
        kelasIds: z.array(z.string()),
        jumlahJam: z.number().min(1).max(20).default(4),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { mataPelajaranId, assignments } = input

      await db.delete(pengampu)
        .where(eq(pengampu.mataPelajaranId, mataPelajaranId))

      const values: { id: string; guruId: string; mataPelajaranId: string; kelasId: string; jumlahJam: number }[] = []
      for (const a of assignments) {
        for (const kelasId of a.kelasIds) {
          values.push({
            id: crypto.randomUUID(),
            guruId: a.guruId,
            mataPelajaranId,
            kelasId,
            jumlahJam: a.jumlahJam,
          })
        }
      }

      if (values.length > 0) {
        await db.insert(pengampu).values(values)
      }

      await logAudit(ctx, {
        action: "update",
        entity: "pengampu",
        entityId: mataPelajaranId,
        metadata: { totalAssignments: values.length },
      })

      return { success: true, count: values.length }
    }),

  getByGuru: protectedProcedure
    .input(z.object({ guruId: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await db.query.pengampu.findMany({
        where: eq(pengampu.guruId, input.guruId),
        with: {
          kelas: true,
          mataPelajaran: true,
        },
      })
      return data
    }),
})