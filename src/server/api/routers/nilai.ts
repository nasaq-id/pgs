import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { nilai, siswa, kelas } from "@/server/db/schema"
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

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

async function getKelasIdsForSekolah(sekolahId: string | null): Promise<string[]> {
  if (!sekolahId) return []
  const rows = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.sekolahId, sekolahId))
  return rows.map((r) => r.id)
}

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
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
        }
      }
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
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const siswaRecord = await db.query.siswa.findFirst({
          where: eq(siswa.id, input.siswaId),
          with: { kelas: true },
        })
        if (!siswaRecord || siswaRecord.kelas?.sekolahId !== sekolahIdFilter) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Siswa tidak berada di sekolah Anda" })
        }
      }
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(nilai).values({ ...input, id } as any).returning()
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string(), data: nilaiUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.nilai.findFirst({
        where: eq(nilai.id, input.id),
        with: { siswa: { with: { kelas: true } } },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Nilai tidak ditemukan" })
      if (sekolahIdFilter && existing.siswa?.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Nilai tidak ditemukan" })
      }
      const result = await db
        .update(nilai)
        .set(input.data as any)
        .where(eq(nilai.id, input.id))
        .returning()
      return result[0]
    }),
})
