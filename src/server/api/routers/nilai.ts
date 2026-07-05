import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, inArray, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { nilai, siswa, kelas, mataPelajaran, asesmen, asesmenSiswa, sekolah, guru } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const nilaiCreateSchema = z.object({
  id: z.string().optional(),
  siswaId: z.string(),
  mataPelajaranId: z.string(),
  tahunAjaranId: z.string().nullable().optional(),
  nilaiTugas: z.number().nullable().optional(),
  nilaiUts: z.number().nullable().optional(),
  nilaiUas: z.number().nullable().optional(),
  nilaiSas: z.number().nullable().optional(),
  nilaiSumatif: z.number().nullable().optional(),
  nilaiAkhir: z.number().nullable().optional(),
  deskripsi: z.string().nullable().optional(),
  statusPublish: z.boolean().optional(),
})

const nilaiUpdateSchema = nilaiCreateSchema.partial()

const saveBukuNilaiSchema = z.object({
  kelasId: z.string(),
  mataPelajaranId: z.string(),
  tahunAjaranId: z.string().nullable().optional(),
  records: z.array(z.object({
    siswaId: z.string(),
    nilaiSas: z.number().nullable().optional(),
    nilaiSumatif: z.number().nullable().optional(),
    nilaiAkhir: z.number().nullable().optional(),
    deskripsi: z.string().nullable().optional(),
    statusPublish: z.boolean().optional(),
  }))
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
      await logAudit(ctx, { action: "create", entity: "nilai", entityId: result[0]?.id, metadata: { siswaId: input.siswaId, mataPelajaranId: input.mataPelajaranId } })
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
      await logAudit(ctx, { action: "update", entity: "nilai", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  getBukuNilaiData: protectedProcedure
    .input(
      z.object({
        kelasId: z.string(),
        mataPelajaranId: z.string(),
        tahunAjaranId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
        }
      }

      // Fetch class details
      const classRecord = await db.query.kelas.findFirst({
        where: eq(kelas.id, input.kelasId),
      })

      // Check if Wali Kelas or Admin
      let isWaliKelas = false
      if (ctx.session.user.role === "guru") {
        const teacher = await db.query.guru.findFirst({
          where: eq(guru.usernameGuru, ctx.session.user.email || ""),
        })
        if (teacher && classRecord?.waliKelasId === teacher.id) {
          isWaliKelas = true
        }
      } else {
        isWaliKelas = true
      }

      // Fetch students in this class
      const siswaRows = await db
        .select()
        .from(siswa)
        .where(eq(siswa.kelasId, input.kelasId))
        .orderBy(asc(siswa.namaLengkap))

      if (siswaRows.length === 0) {
        return { siswa: [], asesmen: [], scores: [], savedNilai: [], settings: { bobotSumatif: 60, bobotSas: 40 }, kelas: classRecord, isWaliKelas }
      }

      const studentIds = siswaRows.map((s) => s.id)

      // Fetch sumatif assessments for this class and subject
      const listAsesmen = await db
        .select()
        .from(asesmen)
        .where(
          and(
            eq(asesmen.kelasId, input.kelasId),
            eq(asesmen.mataPelajaranId, input.mataPelajaranId),
            eq(asesmen.kategori, "sumatif")
          )
        )
        .orderBy(asc(asesmen.createdAt))

      let asesmenSiswaRows: any[] = []
      if (listAsesmen.length > 0) {
        asesmenSiswaRows = await db
          .select()
          .from(asesmenSiswa)
          .where(
            and(
              inArray(asesmenSiswa.asesmenId, listAsesmen.map((a) => a.id)),
              inArray(asesmenSiswa.siswaId, studentIds)
            )
          )
      }

      // Fetch existing saved nilai records
      const savedNilai = await db
        .select()
        .from(nilai)
        .where(
          and(
            eq(nilai.mataPelajaranId, input.mataPelajaranId),
            inArray(nilai.siswaId, studentIds)
          )
        )

      // Fetch school weights settings
      const schoolId = ctx.session.user.sekolahId || ""
      const schoolSettings = await db.query.sekolah.findFirst({
        where: eq(sekolah.id, schoolId),
      })

      return {
        siswa: siswaRows,
        asesmen: listAsesmen,
        scores: asesmenSiswaRows,
        savedNilai,
        kelas: classRecord || null,
        isWaliKelas,
        settings: {
          bobotSumatif: schoolSettings?.bobotSumatif ?? 60,
          bobotSas: schoolSettings?.bobotSas ?? 40,
        }
      }
    }),

  saveBukuNilai: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(saveBukuNilaiSchema)
    .mutation(async ({ ctx, input }) => {
      const { kelasId, mataPelajaranId, tahunAjaranId, records } = input
      const results = []

      for (const rec of records) {
        // Check if there is an existing record
        const existing = await db.query.nilai.findFirst({
          where: and(
            eq(nilai.siswaId, rec.siswaId),
            eq(nilai.mataPelajaranId, mataPelajaranId)
          )
        })

        const dataToSave = {
          siswaId: rec.siswaId,
          mataPelajaranId,
          tahunAjaranId: tahunAjaranId || null,
          nilaiSas: rec.nilaiSas !== undefined ? rec.nilaiSas : null,
          nilaiSumatif: rec.nilaiSumatif !== undefined ? rec.nilaiSumatif : null,
          nilaiAkhir: rec.nilaiAkhir !== undefined ? rec.nilaiAkhir : null,
          deskripsi: rec.deskripsi || null,
          statusPublish: rec.statusPublish !== undefined ? rec.statusPublish : false,
        }

        if (existing) {
          const updated = await db
            .update(nilai)
            .set(dataToSave)
            .where(eq(nilai.id, existing.id))
            .returning()
          results.push(updated[0])
        } else {
          const inserted = await db
            .insert(nilai)
            .values({
              id: crypto.randomUUID(),
              ...dataToSave
            })
            .returning()
          results.push(inserted[0])
        }
      }

      await logAudit(ctx, {
        action: "update",
        entity: "nilai",
        metadata: { message: "Save Buku Nilai massal", count: records.length, kelasId, mataPelajaranId }
      })

      return { success: true, results }
    }),

  getLegerData: protectedProcedure
    .input(
      z.object({
        kelasId: z.string(),
        tahunAjaranId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
        }
      }

      // Fetch students in this class
      const siswaRows = await db
        .select()
        .from(siswa)
        .where(eq(siswa.kelasId, input.kelasId))
        .orderBy(asc(siswa.namaLengkap))

      if (siswaRows.length === 0) {
        return { siswa: [], mapel: [], nilai: [] }
      }

      const studentIds = siswaRows.map((s) => s.id)

      // Fetch all subjects in the school
      const schoolId = ctx.session.user.sekolahId || ""
      const mapelRows = await db
        .select()
        .from(mataPelajaran)
        .where(eq(mataPelajaran.sekolahId, schoolId))
        .orderBy(asc(mataPelajaran.namaMapel))

      // Fetch report grades (nilaiAkhir) for these students
      const nilaiRows = await db
        .select()
        .from(nilai)
        .where(inArray(nilai.siswaId, studentIds))

      return {
        siswa: siswaRows,
        mapel: mapelRows,
        nilai: nilaiRows
      }
    }),

  getBobotSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const schoolId = ctx.session.user.sekolahId
      if (!schoolId) throw new TRPCError({ code: "NOT_FOUND" })
      const school = await db.query.sekolah.findFirst({
        where: eq(sekolah.id, schoolId)
      })
      return {
        bobotSumatif: school?.bobotSumatif ?? 60,
        bobotSas: school?.bobotSas ?? 40
      }
    }),

  updateBobotSettings: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(
      z.object({
        bobotSumatif: z.number().min(0).max(100),
        bobotSas: z.number().min(0).max(100)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const schoolId = ctx.session.user.sekolahId
      if (!schoolId) throw new TRPCError({ code: "NOT_FOUND" })
      if (input.bobotSumatif + input.bobotSas !== 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Total bobot harus 100%" })
      }
      await db
        .update(sekolah)
        .set({
          bobotSumatif: input.bobotSumatif,
          bobotSas: input.bobotSas
        })
        .where(eq(sekolah.id, schoolId))

      await logAudit(ctx, {
        action: "update",
        entity: "sekolah",
        entityId: schoolId,
        metadata: { bobotSumatif: input.bobotSumatif, bobotSas: input.bobotSas }
      })

      return { success: true }
    }),

  getSiswaRaporData: protectedProcedure
    .query(async ({ ctx }) => {
      const email = ctx.session.user.email || ""
      const student = await db.query.siswa.findFirst({
        where: eq(siswa.usernameSiswa, email),
        with: { kelas: true },
      })
      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Data siswa tidak ditemukan" })
      }

      const studentGrades = await db
        .select({
          nilaiId: nilai.id,
          nilaiAkhir: nilai.nilaiAkhir,
          deskripsi: nilai.deskripsi,
          mapelId: nilai.mataPelajaranId,
          namaMapel: mataPelajaran.namaMapel,
        })
        .from(nilai)
        .innerJoin(mataPelajaran, eq(nilai.mataPelajaranId, mataPelajaran.id))
        .where(
          and(
            eq(nilai.siswaId, student.id),
            eq(nilai.statusPublish, true)
          )
        )

      const school = await db.query.sekolah.findFirst({
        where: eq(sekolah.id, student.sekolahId),
      })

      return {
        siswa: student,
        rapor: studentGrades,
        sekolah: school || null,
      }
    }),
})
