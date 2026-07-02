import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { nilai, siswa } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"

const nilaiCreateSchema = z.object({
  id: z.string().optional(),
  siswaId: z.string(),
  mataPelajaranId: z.string(),
  tahunAjaranId: z.string().nullable().optional(),
  nilaiTugas: z.number().nullable().optional(),
  nilaiUts: z.number().nullable().optional(),
  nilaiUas: z.number().nullable().optional(),
  nilaiAkhir: z.number().nullable().optional(),
  deskripsi: z.string().nullable().optional(),
})

const nilaiUpdateSchema = nilaiCreateSchema.partial()

export const nilaiRouter = router({
  getByKelas: protectedProcedure
    .input(
      z.object({
        kelasId: z.string(),
        mataPelajaranId: z.string().optional(),
        tahunAjaranId: z.string().optional(),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ input }) => {
      const siswaDiKelas = await db
        .select({ id: siswa.id })
        .from(siswa)
        .where(eq(siswa.kelasId, input.kelasId))
      if (siswaDiKelas.length === 0) return []
      const siswaIds = siswaDiKelas.map((s) => s.id)
      const conditions = [inArray(nilai.siswaId, siswaIds)]
      if (input.mataPelajaranId) conditions.push(eq(nilai.mataPelajaranId, input.mataPelajaranId))
      if (input.tahunAjaranId) conditions.push(eq(nilai.tahunAjaranId, input.tahunAjaranId))
      const data = await db
        .select()
        .from(nilai)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(nilaiCreateSchema)
    .mutation(async ({ input }) => {
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(nilai).values({ ...input, id } as any).returning()
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string(), data: nilaiUpdateSchema }))
    .mutation(async ({ input }) => {
      const existing = await db.query.nilai.findFirst({
        where: eq(nilai.id, input.id),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Nilai tidak ditemukan" })
      const result = await db
        .update(nilai)
        .set(input.data as any)
        .where(eq(nilai.id, input.id))
        .returning()
      return result[0]
    }),
})
