import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, between } from "drizzle-orm"
import { db } from "@/server/db"
import { absensiSiswa, siswa, kelas } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"

const absensiBulkCreateSchema = z.object({
  absensi: z.array(
    z.object({
      id: z.string().optional(),
      siswaId: z.string(),
      kelasId: z.string(),
      tanggal: z.date(),
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

export const absensiRouter = router({
  getByKelas: protectedProcedure
    .input(
      z.object({
        kelasId: z.string(),
        tanggal: z.date().optional(),
        tanggalMulai: z.date().optional(),
        tanggalSelesai: z.date().optional(),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
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
      const values = input.absensi.map((a) => ({
        ...a,
        id: a.id || crypto.randomUUID(),
      }))
      const result = await db.insert(absensiSiswa).values(values as any).returning()
      return result
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "tu"])
    .input(absensiUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.absensiSiswa.findFirst({
        where: eq(absensiSiswa.id, input.id),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Data absensi tidak ditemukan" })
      const result = await db
        .update(absensiSiswa)
        .set({
          status: input.status,
          keterangan: input.keterangan,
        })
        .where(eq(absensiSiswa.id, input.id))
        .returning()
      return result[0]
    }),
})
