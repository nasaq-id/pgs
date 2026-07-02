import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, between, desc, asc, gte, lte, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { jurnalMengajar, tugas, kelas } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"

const jurnalCreateSchema = z.object({
  id: z.string().optional(),
  guruId: z.string(),
  kelasId: z.string(),
  mataPelajaranId: z.string(),
  jadwalPelajaranId: z.string().nullable().optional(),
  tanggal: z.date(),
  judulJurnal: z.string().nullable().optional(),
  tujuanPembelajaran: z.string().nullable().optional(),
  materiKonten: z.string().nullable().optional(),
  kegiatanPembelajaran: z.string().nullable().optional(),
  catatan: z.string().nullable().optional(),
  statusKehadiran: z.string().nullable().optional(),
  detailKehadiran: z.string().nullable().optional(),
  status: z.enum(["draft", "selesai"]).optional(),
  jamMulai: z.date().nullable().optional(),
  jamSelesai: z.date().nullable().optional(),
})

const jurnalUpdateSchema = jurnalCreateSchema.partial()

const tugasCreateSchema = z.object({
  id: z.string().optional(),
  guruId: z.string(),
  kelasId: z.string(),
  mataPelajaranId: z.string(),
  jurnalMengajarId: z.string().nullable().optional(),
  judulTugas: z.string(),
  deskripsi: z.string().nullable().optional(),
  jenisTugas: z.string().nullable().optional(),
  tanggalDiberikan: z.date().nullable().optional(),
  deadline: z.date().nullable().optional(),
  status: z.enum(["aktif", "ditutup"]).optional(),
  catatan: z.string().nullable().optional(),
})

const tugasUpdateSchema = tugasCreateSchema.partial()

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

export const lmsRouter = router({
  getJurnal: protectedProcedure
    .input(
      z.object({
        guruId: z.string().optional(),
        kelasId: z.string().optional(),
        tanggal: z.date().optional(),
        tanggalMulai: z.date().optional(),
        tanggalSelesai: z.date().optional(),
        sortBy: z.enum(["tanggal", "createdAt"]).optional().default("tanggal"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = []
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        conditions.push(inArray(jurnalMengajar.kelasId, kelasIds))
      }
      if (input.guruId) conditions.push(eq(jurnalMengajar.guruId, input.guruId))
      if (input.kelasId) conditions.push(eq(jurnalMengajar.kelasId, input.kelasId))
      if (input.tanggal) conditions.push(eq(jurnalMengajar.tanggal, input.tanggal))
      if (input.tanggalMulai && input.tanggalSelesai) {
        conditions.push(between(jurnalMengajar.tanggal, input.tanggalMulai, input.tanggalSelesai))
      } else if (input.tanggalMulai) {
        conditions.push(gte(jurnalMengajar.tanggal, input.tanggalMulai))
      } else if (input.tanggalSelesai) {
        conditions.push(lte(jurnalMengajar.tanggal, input.tanggalSelesai))
      }
      const orderBy = input.sortOrder === "asc" ? asc(jurnalMengajar[input.sortBy]) : desc(jurnalMengajar[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select()
        .from(jurnalMengajar)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  createJurnal: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(jurnalCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(jurnalMengajar)
        .values({ ...input, id } as any)
        .returning()
      return result[0]
    }),

  updateJurnal: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string(), data: jurnalUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.jurnalMengajar.findFirst({
        where: eq(jurnalMengajar.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      }
      const result = await db
        .update(jurnalMengajar)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(jurnalMengajar.id, input.id))
        .returning()
      return result[0]
    }),

  deleteJurnal: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.jurnalMengajar.findFirst({
        where: eq(jurnalMengajar.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      }
      await db.delete(jurnalMengajar).where(eq(jurnalMengajar.id, input.id))
      return { success: true }
    }),

  getTugas: protectedProcedure
    .input(
      z.object({
        kelasId: z.string().optional(),
        mapelId: z.string().optional(),
        guruId: z.string().optional(),
        status: z.enum(["aktif", "ditutup"]).optional(),
        sortBy: z.enum(["deadline", "tanggalDiberikan", "createdAt"]).optional().default("deadline"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = []
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        conditions.push(inArray(tugas.kelasId, kelasIds))
      }
      if (input.kelasId) conditions.push(eq(tugas.kelasId, input.kelasId))
      if (input.mapelId) conditions.push(eq(tugas.mataPelajaranId, input.mapelId))
      if (input.guruId) conditions.push(eq(tugas.guruId, input.guruId))
      if (input.status) conditions.push(eq(tugas.status, input.status))
      const orderBy = input.sortOrder === "asc" ? asc(tugas[input.sortBy]) : desc(tugas[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select()
        .from(tugas)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  createTugas: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(tugasCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(tugas)
        .values({ ...input, id } as any)
        .returning()
      return result[0]
    }),

  updateTugas: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string(), data: tugasUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.tugas.findFirst({
        where: eq(tugas.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan" })
      }
      const result = await db
        .update(tugas)
        .set(input.data as any)
        .where(eq(tugas.id, input.id))
        .returning()
      return result[0]
    }),

  deleteTugas: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.tugas.findFirst({
        where: eq(tugas.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tugas tidak ditemukan" })
      }
      await db.delete(tugas).where(eq(tugas.id, input.id))
      return { success: true }
    }),
})
