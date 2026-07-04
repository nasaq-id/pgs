import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, between } from "drizzle-orm"
import { db } from "@/server/db"
import { absensiSiswa, kelas } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const absensiBulkCreateSchema = z.object({
  absensi: z.array(
    z.object({
      id: z.string().optional(),
      siswaId: z.string(),
      kelasId: z.string(),
      tanggal: z.coerce.date(),
      status: z.enum(["hadir", "izin", "sakit", "alpha"]),
      keterangan: z.string().nullable().optional(),
    }),
  ),
})

const absensiUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(["hadir", "izin", "sakit", "alpha"]).optional(),
  keterangan: z.string().nullable().optional(),
})

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

export const absensiRouter = router({
  getByKelas: protectedProcedure
    .input(
      z.object({
        kelasId: z.string(),
        tanggal: z.coerce.date().optional(),
        tanggalMulai: z.coerce.date().optional(),
        tanggalSelesai: z.coerce.date().optional(),
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
      const conditions = [eq(absensiSiswa.kelasId, input.kelasId)]
      if (input.tanggal) conditions.push(eq(absensiSiswa.tanggal, input.tanggal))
      if (input.tanggalMulai && input.tanggalSelesai) {
        conditions.push(between(absensiSiswa.tanggal, input.tanggalMulai, input.tanggalSelesai))
      }
      const data = await db
        .select()
        .from(absensiSiswa)
        .where(and(...conditions))
        .orderBy(desc(absensiSiswa.tanggal))
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "tu"])
    .input(absensiBulkCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        for (const a of input.absensi) {
          if (!kelasIds.includes(a.kelasId)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
          }
        }
      }
      const values = input.absensi.map((a) => ({
        ...a,
        id: a.id || crypto.randomUUID(),
      }))
      const result = await db.insert(absensiSiswa).values(values as any).returning()
      await logAudit(ctx, { action: "bulk_create", entity: "absensi_siswa", metadata: { count: result.length } })
      return result
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "tu"])
    .input(absensiUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.absensiSiswa.findFirst({
        where: eq(absensiSiswa.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Data absensi tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Data absensi tidak ditemukan" })
      }
      const result = await db
        .update(absensiSiswa)
        .set({
          status: input.status,
          keterangan: input.keterangan,
        })
        .where(eq(absensiSiswa.id, input.id))
        .returning()
      await logAudit(ctx, { action: "update", entity: "absensi_siswa", entityId: result[0]?.id, metadata: { status: input.status } })
      return result[0]
    }),
})
