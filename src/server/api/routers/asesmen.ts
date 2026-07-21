import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, asc, desc, inArray } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure } from "../trpc"
import { db } from "@/server/db"
import { asesmen, asesmenSiswa, asesmenKomentar, kelas, guru, siswa } from "@/server/db/schema"
import { logAudit } from "@/server/audit"
import { createNotifikasi } from "@/server/notifikasi"
import { getSekolahIdFilter } from "@/server/api/tenant"


async function getKelasIdsForSekolah(sekolahId: string | null): Promise<string[]> {
  if (!sekolahId) return []
  const rows = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.sekolahId, sekolahId))
  return rows.map((r) => r.id)
}

const asesmenCreateSchema = z.object({
  id: z.string().optional(),
  guruId: z.string(),
  kelasId: z.string().optional(),
  kelasIds: z.array(z.string()).optional(),
  mataPelajaranId: z.string(),
  jurnalMengajarId: z.string().nullable().optional(),
  judul: z.string().min(1),
  deskripsi: z.string().nullable().optional(),
  kategori: z.enum(["formatif_awal", "formatif_proses", "sumatif"]).optional().default("formatif_proses"),
  teknik: z.enum(["tes_tertulis", "tes_lisan", "penugasan", "praktik", "proyek", "portofolio"]).optional().default("tes_tertulis"),
  jenisPengumpulan: z.enum(["unggah_file", "teks", "cbt", "langsung"]).optional().default("unggah_file"),
  kktp: z.number().min(0).max(100).optional().default(70),
  deadline: z.coerce.date().nullable().optional(),
  status: z.enum(["aktif", "ditutup"]).optional().default("aktif"),
})

const asesmenUpdateSchema = asesmenCreateSchema.partial()

export const asesmenRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        kelasId: z.string().optional(),
        mapelId: z.string().optional(),
        guruId: z.string().optional(),
        kategori: z.enum(["formatif_awal", "formatif_proses", "sumatif"]).optional(),
        status: z.enum(["aktif", "ditutup"]).optional(),
        sortBy: z.enum(["deadline", "createdAt", "judul"]).optional().default("createdAt"),
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
        conditions.push(inArray(asesmen.kelasId, kelasIds))
      }
      if (input.kelasId) conditions.push(eq(asesmen.kelasId, input.kelasId))
      if (input.mapelId) conditions.push(eq(asesmen.mataPelajaranId, input.mapelId))
      if (input.guruId) conditions.push(eq(asesmen.guruId, input.guruId))
      if (input.kategori) conditions.push(eq(asesmen.kategori, input.kategori))
      if (input.status) conditions.push(eq(asesmen.status, input.status))

      const orderBy = input.sortOrder === "asc" ? asc(asesmen[input.sortBy]) : desc(asesmen[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const data = await db.query.asesmen.findMany({
        where: whereClause,
        orderBy: orderBy,
        limit: input.limit,
        offset: input.offset,
        with: {
          siswaEntries: true,
        },
      })

      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const item = await db.query.asesmen.findFirst({
        where: eq(asesmen.id, input.id),
        with: {
          guru: true,
          kelas: true,
          mataPelajaran: true,
          siswaEntries: { with: { siswa: true } },
        },
      })
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      if (sekolahIdFilter && item.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      }
      return item
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(asesmenCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan di sesi" })

      const targetKelasIds = input.kelasIds && input.kelasIds.length > 0
        ? input.kelasIds
        : [input.kelasId].filter((x): x is string => !!x)

      if (targetKelasIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Minimal satu kelas harus dipilih" })
      }

      const schoolKelasIds = await getKelasIdsForSekolah(sekolahId)
      for (const kId of targetKelasIds) {
        if (!schoolKelasIds.includes(kId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Kelas ${kId} tidak berada di sekolah Anda` })
        }
      }

      const results = []
      for (const kelasId of targetKelasIds) {
        const id = crypto.randomUUID()
        const result = await db
          .insert(asesmen)
          .values({
            ...input,
            id,
            kelasId,
            kelasIds: undefined,
            sekolahId,
          } as any)
          .returning()

        await logAudit(ctx, { action: "create", entity: "asesmen", entityId: id, metadata: { judul: input.judul, kelasId } })
        await createNotifikasi(ctx, {
          judul: "Asesmen Baru",
          pesan: `Asesmen "${input.judul}" telah dibuat untuk kelas.`,
          tipe: "info",
          link: `/lms/asesmen`,
        })
        results.push(result[0])
      }

      return results[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string(), data: asesmenUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.asesmen.findFirst({
        where: eq(asesmen.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      }
      const result = await db
        .update(asesmen)
        .set({ ...input.data, updatedAt: new Date() } as any)
        .where(eq(asesmen.id, input.id))
        .returning()
      await logAudit(ctx, { action: "update", entity: "asesmen", entityId: input.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.asesmen.findFirst({
        where: eq(asesmen.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      }
      await db.delete(asesmen).where(eq(asesmen.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "asesmen", entityId: input.id })
      return { success: true }
    }),

  getSiswaEntries: protectedProcedure
    .input(z.object({ asesmenId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const a = await db.query.asesmen.findFirst({
        where: eq(asesmen.id, input.asesmenId),
        with: { kelas: true },
      })
      if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      if (sekolahIdFilter && a.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      }

      // Fetch all active students in this class
      const classStudents = await db.query.siswa.findMany({
        where: and(eq(siswa.kelasId, a.kelasId), eq(siswa.status, "aktif")),
        orderBy: asc(siswa.namaLengkap),
      })

      // Fetch existing submission/grading records
      const existingEntries = await db.query.asesmenSiswa.findMany({
        where: eq(asesmenSiswa.asesmenId, input.asesmenId),
        with: { siswa: true },
      })

      const entryMap = new Map(existingEntries.map((e) => [e.siswaId, e]))

      // Return existing entry or a temp placeholder matching the schema shape
      return classStudents.map((s) => {
        const existing = entryMap.get(s.id)
        if (existing) return existing
        return {
          id: `temp_${input.asesmenId}_${s.id}`,
          asesmenId: input.asesmenId,
          siswaId: s.id,
          status: "belum_dikerjakan" as const,
          jawabanTeks: null,
          berkasUrl: null,
          nilai: null,
          statusKetuntasan: null,
          feedback: null,
          submittedAt: null,
          dinilaiAt: null,
          dinilaiOleh: null,
          createdAt: new Date(),
          siswa: s,
        }
      })
    }),

  submitTugas: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "siswa"])
    .input(
      z.object({
        asesmenId: z.string(),
        jawabanTeks: z.string().optional(),
        berkasUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const a = await db.query.asesmen.findFirst({
        where: eq(asesmen.id, input.asesmenId),
        with: { kelas: true },
      })
      if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
      if (sekolahIdFilter && a.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" } as any)
      }
      if (a.status === "ditutup") throw new TRPCError({ code: "BAD_REQUEST", message: "Asesmen sudah ditutup" })

      const userEmail = ctx.session.user.email
      if (!userEmail) throw new TRPCError({ code: "UNAUTHORIZED", message: "User tidak ditemukan" })

      const siswaRecord = await db.query.siswa.findFirst({ where: eq(siswa.emailSiswa, userEmail) })
      if (!siswaRecord) throw new TRPCError({ code: "FORBIDDEN", message: "Hanya siswa yang dapat mengumpulkan" })

      const existing = await db.query.asesmenSiswa.findFirst({
        where: and(eq(asesmenSiswa.asesmenId, input.asesmenId), eq(asesmenSiswa.siswaId, siswaRecord.id)),
      })

      let result: any
      if (existing) {
        const [updated] = await db
          .update(asesmenSiswa)
          .set({
            jawabanTeks: input.jawabanTeks,
            berkasUrl: input.berkasUrl,
            status: "sudah_mengumpulkan",
            submittedAt: new Date(),
          })
          .where(eq(asesmenSiswa.id, existing.id))
          .returning()
        result = updated
      } else {
        const [created] = await db
          .insert(asesmenSiswa)
          .values({
            id: crypto.randomUUID(),
            sekolahId: a.sekolahId,
            asesmenId: input.asesmenId,
            siswaId: siswaRecord.id,
            jawabanTeks: input.jawabanTeks,
            berkasUrl: input.berkasUrl,
            status: "sudah_mengumpulkan",
            submittedAt: new Date(),
          })
          .returning()
        result = created
      }

      await logAudit(ctx, { action: "submit", entity: "asesmen_siswa", entityId: result?.id, metadata: { asesmenId: input.asesmenId, siswaId: siswaRecord.id, judul: a.judul } })
      await createNotifikasi(ctx, {
        judul: "Jawaban Dikumpulkan",
        pesan: `${siswaRecord.namaLengkap} mengumpulkan jawaban untuk "${a.judul}".`,
        tipe: "info",
        link: "/lms/asesmen",
      })

      return result
    }),

  nilaiSiswa: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(
      z.object({
        asesmenSiswaId: z.string(),
        nilai: z.number().min(0).max(100),
        feedback: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let entryId = input.asesmenSiswaId
      let entry = await db.query.asesmenSiswa.findFirst({
        where: eq(asesmenSiswa.id, entryId),
        with: { asesmen: { with: { kelas: true } } },
      })

      const sekolahIdFilter = getSekolahIdFilter(ctx as any)

      if (!entry) {
        // Handle grading mock student entry (temp_asesmenId_siswaId)
        if (entryId.startsWith("temp_")) {
          const parts = entryId.split("_")
          const asesmenId = parts[1]
          const siswaId = parts[2]

          if (!asesmenId || !siswaId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "ID temp tidak valid" })
          }

          const a = await db.query.asesmen.findFirst({
            where: eq(asesmen.id, asesmenId),
            with: { kelas: true },
          })
          if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
          if (sekolahIdFilter && a.kelas?.sekolahId !== sekolahIdFilter) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })
          }

          const kktp = a.kktp
          const statusKetuntasan = input.nilai >= kktp ? "tuntas" : "belum_tuntas"

          const guruRecord = await db.query.guru.findFirst({
            where: eq(guru.id, a.guruId),
          })
          const dinilaiOleh = guruRecord?.namaLengkap || ctx.session.user.email || ""

          const newId = crypto.randomUUID()
          const [created] = await db
            .insert(asesmenSiswa)
            .values({
              id: newId,
              sekolahId: a.sekolahId,
              asesmenId,
              siswaId,
              nilai: input.nilai,
              statusKetuntasan,
              feedback: input.feedback || null,
              status: "sudah_dinilai",
              dinilaiAt: new Date(),
              dinilaiOleh,
            })
            .returning()

          await logAudit(ctx, { action: "nilai", entity: "asesmen_siswa", entityId: newId, metadata: { nilai: input.nilai, kktp, statusKetuntasan } })
          return created
        }

        throw new TRPCError({ code: "NOT_FOUND", message: "Entry tidak ditemukan" })
      }

      if (sekolahIdFilter && entry.asesmen.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entry tidak ditemukan" })
      }

      const kktp = entry.asesmen.kktp
      const statusKetuntasan = input.nilai >= kktp ? "tuntas" : "belum_tuntas"

      const guruRecord = await db.query.guru.findFirst({
        where: eq(guru.id, entry.asesmen.guruId),
      })
      const dinilaiOleh = guruRecord?.namaLengkap || ctx.session.user.email || ""

      const [updated] = await db
        .update(asesmenSiswa)
        .set({
          nilai: input.nilai,
          statusKetuntasan,
          feedback: input.feedback || null,
          status: "sudah_dinilai",
          dinilaiAt: new Date(),
          dinilaiOleh,
        })
        .where(eq(asesmenSiswa.id, entryId))
        .returning()

      await logAudit(ctx, { action: "nilai", entity: "asesmen_siswa", entityId: entryId, metadata: { nilai: input.nilai, kktp, statusKetuntasan } })
      return updated
    }),

  getKomentar: protectedProcedure
    .input(z.object({ asesmenId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const comments = await db
        .select()
        .from(asesmenKomentar)
        .where(and(
          eq(asesmenKomentar.asesmenId, input.asesmenId),
          sekolahIdFilter ? eq(asesmenKomentar.sekolahId, sekolahIdFilter) : undefined,
        ))
        .orderBy(asc(asesmenKomentar.createdAt))
      return comments
    }),

  createKomentar: protectedProcedure
    .input(
      z.object({
        asesmenId: z.string(),
        pesan: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "User tidak ditemukan" })

      const a = await db.query.asesmen.findFirst({
        where: eq(asesmen.id, input.asesmenId),
        columns: { sekolahId: true },
      })
      if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Asesmen tidak ditemukan" })

      const [created] = await db
        .insert(asesmenKomentar)
        .values({
          id: crypto.randomUUID(),
          sekolahId: a.sekolahId,
          asesmenId: input.asesmenId,
          userId,
          pesan: input.pesan,
        })
        .returning()
      await logAudit(ctx, { action: "komentar", entity: "asesmen_komentar", entityId: created?.id, metadata: { asesmenId: input.asesmenId } })
      return created
    }),

  getRekapSiswa: protectedProcedure
    .input(
      z.object({
        siswaId: z.string(),
        kategori: z.enum(["formatif_awal", "formatif_proses", "sumatif"]).optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      let kelasIds: string[] = []
      if (sekolahIdFilter) {
        kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
      }

      const conditions = [eq(asesmenSiswa.siswaId, input.siswaId)]
      const asesmenConditions = []

      if (kelasIds.length > 0) {
        asesmenConditions.push(inArray(asesmen.kelasId, kelasIds))
      }
      if (input.kategori) {
        asesmenConditions.push(eq(asesmen.kategori, input.kategori))
      }

      const entries = await db
        .select()
        .from(asesmenSiswa)
        .innerJoin(asesmen, eq(asesmenSiswa.asesmenId, asesmen.id))
        .where(
          asesmenConditions.length > 0
            ? and(...conditions, ...asesmenConditions)
            : and(...conditions),
        )
        .orderBy(desc(asesmen.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      return entries
    }),

  getRekapKelas: protectedProcedure
    .input(
      z.object({
        kelasId: z.string(),
        asesmenId: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const k = await db.query.kelas.findFirst({ where: eq(kelas.id, input.kelasId) })
        if (!k || k.sekolahId !== sekolahIdFilter) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
        }
      }

      const asesmenConditions = [eq(asesmen.kelasId, input.kelasId)]
      if (input.asesmenId) {
        asesmenConditions.push(eq(asesmen.id, input.asesmenId))
      }

      const asesmenList = await db
        .select()
        .from(asesmen)
        .where(and(...asesmenConditions))
        .orderBy(desc(asesmen.createdAt))

      if (asesmenList.length === 0) {
        return { asesmen: [], entries: [] }
      }

      const asesmenIds = asesmenList.map((a) => a.id)

      const entries = await db
        .select()
        .from(asesmenSiswa)
        .where(inArray(asesmenSiswa.asesmenId, asesmenIds))
        .orderBy(asc(asesmenSiswa.siswaId), asc(asesmenSiswa.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      return { asesmen: asesmenList, entries }
    }),
})

