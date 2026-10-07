import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure } from "../trpc"
import { db } from "@/server/db"
import { pengampu, kelas, guru, mataPelajaran } from "@/server/db/schema"
import { logAudit } from "@/server/audit"
import { cacheKey, getOrSetCache, invalidateCache } from "@/lib/cache"

export const pengampuRouter = router({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      // Kolom minimal: client (AiGenerateDialog) hanya butuh kelasId & jumlahJam.
      // Sebelumnya mengirim full row guru+kelas+mapel untuk tiap pengampu.
      const data = await db
        .select({
          id: pengampu.id,
          sekolahId: pengampu.sekolahId,
          guruId: pengampu.guruId,
          mataPelajaranId: pengampu.mataPelajaranId,
          kelasId: pengampu.kelasId,
          jumlahJam: pengampu.jumlahJam,
        })
        .from(pengampu)
        .where(eq(pengampu.sekolahId, sekolahId))
      return data
    }),

  getByMapel: protectedProcedure
    .input(z.object({ mataPelajaranId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      return getOrSetCache(cacheKey("pengampu:getByMapel", sekolahId, input.mataPelajaranId), async () => {
        // 4 query independen dijalankan paralel (bukan berurutan) — biaya dominan
        // adalah RTT ke Supabase pooler, jadi mengurangi round-trip paralel lebih
        // cepat daripada mengefisienkan SQL.
        const [mapel, assignments, allKelas, allGuru] = await Promise.all([
          db.query.mataPelajaran.findFirst({
            where: eq(mataPelajaran.id, input.mataPelajaranId),
          }),
          db.query.pengampu.findMany({
            where: and(
              eq(pengampu.mataPelajaranId, input.mataPelajaranId),
              eq(pengampu.sekolahId, sekolahId),
            ),
            with: {
              guru: { columns: { namaLengkap: true } },
              kelas: { columns: { namaKelas: true } },
            },
          }),
          db
            .select({ id: kelas.id, namaKelas: kelas.namaKelas, tingkat: kelas.tingkat })
            .from(kelas)
            .where(eq(kelas.sekolahId, sekolahId)),
          db
            .select({ id: guru.id, namaLengkap: guru.namaLengkap, nipnuptk: guru.nipnuptk })
            .from(guru)
            .where(eq(guru.sekolahId, sekolahId)),
        ])

        return {
          mapel,
          allKelas,
          allGuru,
          assignments: assignments.map((d) => ({
            id: d.id,
            guruId: d.guruId,
            guruNama: d.guru.namaLengkap,
            kelasId: d.kelasId,
            kelasNama: d.kelas.namaKelas,
            jumlahJam: d.jumlahJam,
          })),
        }
      }, 300)
    }),

  getByKelas: protectedProcedure
    .input(z.object({ kelasId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const data = await db.query.pengampu.findMany({
        where: and(
          eq(pengampu.kelasId, input.kelasId),
          eq(pengampu.sekolahId, sekolahId),
        ),
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
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })

      await db.delete(pengampu)
        .where(eq(pengampu.mataPelajaranId, mataPelajaranId))

      const values: { id: string; sekolahId: string; guruId: string; mataPelajaranId: string; kelasId: string; jumlahJam: number }[] = []
      for (const a of assignments) {
        for (const kelasId of a.kelasIds) {
          values.push({
            id: crypto.randomUUID(),
            sekolahId,
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

      await invalidateCache([
        cacheKey("mapel:getAll", sekolahId),
        cacheKey("guru:getAll", sekolahId),
        cacheKey("pengampu:getAll", sekolahId),
        cacheKey("pengampu:getByMapel", sekolahId, mataPelajaranId),
      ])

      return { success: true, count: values.length }
    }),

  getByGuru: protectedProcedure
    .input(z.object({ guruId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      const data = await db.query.pengampu.findMany({
        where: and(
          eq(pengampu.guruId, input.guruId),
          sekolahId ? eq(pengampu.sekolahId, sekolahId) : undefined,
        ),
        with: {
          kelas: true,
          mataPelajaran: true,
        },
      })
      return data
    }),
})