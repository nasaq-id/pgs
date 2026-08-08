import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, asc, inArray, isNull, count } from "drizzle-orm"
import { getTableColumns } from "drizzle-orm/utils"
import { db } from "@/server/db"
import bcrypt from "bcryptjs"
import { siswa, kelas, catatanMutasi } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized, strictRateLimit, moderateRateLimit } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"
import { syncUserCredentials } from "@/server/credentials"

const siswaCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string().optional(),
  kelasId: z.string().nullable().optional(),
  nisn: z.string().min(1, "NISN wajib diisi"),
  nisLokal: z.string().nullable().optional(),
  namaLengkap: z.string(),
  jenisKelamin: z.enum(["L", "P"]).nullable().optional(),
  tempatLahir: z.string().nullable().optional(),
  tanggalLahir: z.coerce.date().nullable().optional(),
  nik: z.string().nullable().optional(),
  agama: z.string().nullable().optional(),
  alamat: z.string().nullable().optional(),
  noHpOrtu: z.string().nullable().optional(),
  emailSiswa: z.string().nullable().optional(),
  foto: z.string().nullable().optional(),
  status: z.enum(["aktif", "lulus", "pindah", "keluar"]).optional(),
  hobi: z.string().nullable().optional(),
  citacita: z.string().nullable().optional(),
  jumlahSaudara: z.number().nullable().optional(),
  anakKe: z.number().nullable().optional(),
  kewarganegaraan: z.string().nullable().optional(),
  pembiayaanSekolah: z.string().nullable().optional(),
  noKartuKeluarga: z.string().nullable().optional(),
  namaKepalaKeluarga: z.string().nullable().optional(),
  namaAyah: z.string().nullable().optional(),
  nikAyah: z.string().nullable().optional(),
  tempatLahirAyah: z.string().nullable().optional(),
  tanggalLahirAyah: z.coerce.date().nullable().optional(),
  pendidikanAyah: z.string().nullable().optional(),
  pekerjaanAyah: z.string().nullable().optional(),
  penghasilanAyah: z.string().nullable().optional(),
  statusAyah: z.string().nullable().optional(),
  noHpAyah: z.string().nullable().optional(),
  kewarganegaraanAyah: z.string().nullable().optional(),
  provinsiAyah: z.string().nullable().optional(),
  kabupatenKotaAyah: z.string().nullable().optional(),
  kecamatanAyah: z.string().nullable().optional(),
  kelurahanDesaAyah: z.string().nullable().optional(),
  rtAyah: z.string().nullable().optional(),
  rwAyah: z.string().nullable().optional(),
  alamatLengkapAyah: z.string().nullable().optional(),
  kodePosAyah: z.string().nullable().optional(),
  statusKepemilikanRumahAyah: z.string().nullable().optional(),
  namaIbu: z.string().nullable().optional(),
  nikIbu: z.string().nullable().optional(),
  tempatLahirIbu: z.string().nullable().optional(),
  tanggalLahirIbu: z.coerce.date().nullable().optional(),
  pendidikanIbu: z.string().nullable().optional(),
  pekerjaanIbu: z.string().nullable().optional(),
  penghasilanIbu: z.string().nullable().optional(),
  statusIbu: z.string().nullable().optional(),
  noHpIbu: z.string().nullable().optional(),
  kewarganegaraanIbu: z.string().nullable().optional(),
  alamatIbuSamaDenganAyah: z.boolean().nullable().optional(),
  provinsiIbu: z.string().nullable().optional(),
  kabupatenKotaIbu: z.string().nullable().optional(),
  kecamatanIbu: z.string().nullable().optional(),
  kelurahanDesaIbu: z.string().nullable().optional(),
  rtIbu: z.string().nullable().optional(),
  rwIbu: z.string().nullable().optional(),
  alamatLengkapIbu: z.string().nullable().optional(),
  kodePosIbu: z.string().nullable().optional(),
  statusKepemilikanRumahIbu: z.string().nullable().optional(),
  namaWali: z.string().nullable().optional(),
  nikWali: z.string().nullable().optional(),
  tempatLahirWali: z.string().nullable().optional(),
  tanggalLahirWali: z.coerce.date().nullable().optional(),
  pendidikanWali: z.string().nullable().optional(),
  pekerjaanWali: z.string().nullable().optional(),
  penghasilanWali: z.string().nullable().optional(),
  statusWali: z.string().nullable().optional(),
  noHpWali: z.string().nullable().optional(),
  kewarganegaraanWali: z.string().nullable().optional(),
  statusKepemilikanRumahWali: z.string().nullable().optional(),
  provinsiWali: z.string().nullable().optional(),
  kabupatenKotaWali: z.string().nullable().optional(),
  kecamatanWali: z.string().nullable().optional(),
  kelurahanDesaWali: z.string().nullable().optional(),
  rtWali: z.string().nullable().optional(),
  rwWali: z.string().nullable().optional(),
  alamatLengkapWali: z.string().nullable().optional(),
  kodePosWali: z.string().nullable().optional(),
  statusTempatTinggalSiswa: z.string().nullable().optional(),
  jarakTempatTinggalKeSekolah: z.string().nullable().optional(),
  transportasiKeSekolah: z.string().nullable().optional(),
  waktuTempuhKeSekolah: z.string().nullable().optional(),
  usernameSiswa: z.string().nullable().optional(),
  passwordSiswa: z.string().optional(),
  sekolahAsal: z.string().nullable().optional(),
  diterimaPadaTanggal: z.coerce.date().nullable().optional(),
  noHpWhatsapp: z.string().nullable().optional(),
})

const siswaUpdateSchema = siswaCreateSchema.partial()


export const siswaRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["aktif", "aktif_tanpa_rombel", "tidak_aktif", "mutasi_keluar"]).optional(),
        kelasId: z.string().optional(),
        sortBy: z.enum(["namaLengkap", "nisn", "createdAt"]).optional().default("namaLengkap"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(siswa.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(or(like(siswa.namaLengkap, `%${input.search}%`), like(siswa.nisn, `%${input.search}%`)))
      }
      if (input.status === "aktif") {
        conditions.push(eq(siswa.status, "aktif"))
      } else if (input.status === "aktif_tanpa_rombel") {
        conditions.push(eq(siswa.status, "aktif"), isNull(siswa.kelasId))
      } else if (input.status === "tidak_aktif") {
        conditions.push(inArray(siswa.status, ["lulus", "pindah", "keluar"]))
      } else if (input.status === "mutasi_keluar") {
        conditions.push(inArray(siswa.status, ["pindah", "keluar"]))
      }
      if (input.kelasId) {
        conditions.push(eq(siswa.kelasId, input.kelasId))
      }
      const orderBy = input.sortOrder === "asc" ? asc(siswa[input.sortBy]) : desc(siswa[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select({
          ...getTableColumns(siswa),
        })
        .from(siswa)
        .leftJoin(kelas, eq(siswa.kelasId, kelas.id))
        .where(whereClause)
        .orderBy(
          asc(kelas.namaKelas),
          input.sortOrder === "asc" ? asc(siswa[input.sortBy]) : desc(siswa[input.sortBy])
        )
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(siswa.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(siswa.sekolahId, sekolahIdFilter))
      const result = await db.query.siswa.findFirst({
        where: and(...conditions),
        with: { kelas: true, sekolah: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(siswaCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      try {
        const id = input.id || crypto.randomUUID()
        let passwordHash = input.passwordSiswa || null
        if (passwordHash) passwordHash = await bcrypt.hash(passwordHash, 12)
        const data = { ...input, id, sekolahId, passwordSiswa: passwordHash, updatedAt: new Date() }
        const result = await db.insert(siswa).values(data as any).returning()
        await syncUserCredentials({
          email: input.nisn || input.nisLokal || input.usernameSiswa || "",
          role: "siswa",
          sekolahId,
          namaLengkap: input.namaLengkap,
          photo: input.foto || null,
          passwordHash,
        })
        await logAudit(ctx, { action: "create", entity: "siswa", entityId: result[0]?.id, metadata: { nisn: input.nisn } })
        return result[0]
      } catch (error) {
        console.error("Gagal membuat siswa:", error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Gagal menyimpan data siswa. Periksa kembali isian Anda.",
        })
      }
    }),

  bulkCreate: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"]).use(moderateRateLimit)
    .input(sanitized(z.object({
      data: z.array(siswaCreateSchema.omit({ sekolahId: true })),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const now = new Date()
      const usersToCreate: any[] = []
      const values = input.data.map((d) => {
        const id = d.id || crypto.randomUUID()
        let passwordHash = d.passwordSiswa || null
        if (passwordHash) passwordHash = bcrypt.hashSync(passwordHash, 12)
        if (passwordHash) {
          usersToCreate.push({
            email: d.nisn || d.usernameSiswa || d.nisLokal,
            role: "siswa" as const,
            sekolahId,
            namaLengkap: d.namaLengkap,
            passwordHash,
            createIfMissing: true,
          })
        }
        return { ...d, id, sekolahId, passwordSiswa: passwordHash, updatedAt: now }
      })
      const result = await db.insert(siswa).values(values as any).returning()
      for (const u of usersToCreate) {
        await syncUserCredentials(u)
      }
      await logAudit(ctx, { action: "bulk_create", entity: "siswa", metadata: { count: result.length } })
      return result
    }),

  getAllExport: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["aktif", "aktif_tanpa_rombel", "tidak_aktif", "mutasi_keluar"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(siswa.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(or(like(siswa.namaLengkap, `%${input.search}%`), like(siswa.nisn, `%${input.search}%`)))
      }
      if (input.status === "aktif") {
        conditions.push(eq(siswa.status, "aktif"))
      } else if (input.status === "aktif_tanpa_rombel") {
        conditions.push(eq(siswa.status, "aktif"), isNull(siswa.kelasId))
      } else if (input.status === "tidak_aktif") {
        conditions.push(inArray(siswa.status, ["lulus", "pindah", "keluar"]))
      } else if (input.status === "mutasi_keluar") {
        conditions.push(inArray(siswa.status, ["pindah", "keluar"]))
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      return db
        .select({
          ...getTableColumns(siswa),
          namaKelas: kelas.namaKelas,
        })
        .from(siswa)
        .leftJoin(kelas, eq(siswa.kelasId, kelas.id))
        .where(whereClause)
        .orderBy(asc(siswa.namaLengkap))
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: siswaUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(siswa.id, input.id), eq(siswa.sekolahId, sekolahId)]
      const existing = await db.query.siswa.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      const { passwordSiswa, ...rest } = input.data
      let passwordHash = passwordSiswa || null
      if (passwordHash) passwordHash = await bcrypt.hash(passwordHash, 12)
      const updateData = { ...rest, passwordSiswa: passwordHash || existing.passwordSiswa, updatedAt: new Date() }
      const result = await db
        .update(siswa)
        .set(updateData)
        .where(and(...conditions))
        .returning()
      const newEmail = input.data.nisn || input.data.usernameSiswa || input.data.nisLokal || existing.nisn || existing.usernameSiswa || existing.nisLokal || ""
      const oldEmail = existing.nisn || existing.usernameSiswa || existing.nisLokal || ""
      if (newEmail) {
        await syncUserCredentials({
          email: newEmail,
          prevEmail: oldEmail !== newEmail ? oldEmail : undefined,
          role: "siswa",
          sekolahId: existing.sekolahId,
          namaLengkap: rest.namaLengkap || existing.namaLengkap,
          photo: rest.foto !== undefined ? rest.foto : existing.foto,
          passwordHash,
        })
      }
      await logAudit(ctx, { action: "update", entity: "siswa", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(siswa.id, input.id), eq(siswa.sekolahId, sekolahId)]
      const existing = await db.query.siswa.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      await db.delete(siswa).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "siswa", entityId: input.id })
      return { success: true }
    }),

  bulkRemove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [inArray(siswa.id, input.ids), eq(siswa.sekolahId, sekolahId)]
      await db.delete(siswa).where(and(...conditions))
      return { success: true }
    }),

  bulkSetKelas: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({
      ids: z.array(z.string()),
      kelasId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [inArray(siswa.id, input.ids), eq(siswa.sekolahId, sekolahId)]
      
      await db
        .update(siswa)
        .set({
          kelasId: input.kelasId,
          updatedAt: new Date()
        })
        .where(and(...conditions))
        
      await logAudit(ctx, { 
        action: "bulk_update", 
        entity: "siswa", 
        metadata: { ids: input.ids, kelasId: input.kelasId } 
      })
      return { success: true }
    }),

  resetPassword: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"]).use(strictRateLimit)
    .input(z.object({ id: z.string(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(siswa.id, input.id), eq(siswa.sekolahId, sekolahId)]
      const existing = await db.query.siswa.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      const passwordHash = await bcrypt.hash(input.password, 12)
      await db.update(siswa).set({ passwordSiswa: passwordHash, updatedAt: new Date() }).where(and(...conditions))
      await syncUserCredentials({
        email: existing.nisn || existing.usernameSiswa || existing.nisLokal || "",
        role: "siswa",
        sekolahId: existing.sekolahId,
        namaLengkap: existing.namaLengkap,
        passwordHash,
      })
      await logAudit(ctx, { action: "reset_password", entity: "siswa", entityId: input.id })
      return { success: true }
    }),

  getMutasi: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .query(async ({ ctx }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) {
        conditions.push(eq(siswa.sekolahId, sekolahIdFilter))
      }
      
      const result = await db
        .select({
          id: catatanMutasi.id,
          siswaId: catatanMutasi.siswaId,
          tanggalMutasi: catatanMutasi.tanggalMutasi,
          jenisMutasi: catatanMutasi.jenisMutasi,
          alasanMutasi: catatanMutasi.alasanMutasi,
          sekolahTujuan: catatanMutasi.sekolahTujuan,
          createdAt: catatanMutasi.createdAt,
          namaSiswa: siswa.namaLengkap,
          nisn: siswa.nisn,
          nisLokal: siswa.nisLokal,
          kelasId: siswa.kelasId,
          namaKelas: kelas.namaKelas,
        })
        .from(catatanMutasi)
        .innerJoin(siswa, eq(catatanMutasi.siswaId, siswa.id))
        .leftJoin(kelas, eq(siswa.kelasId, kelas.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(catatanMutasi.tanggalMutasi))
      
      return result.map((r) => ({
        id: r.id,
        siswaId: r.siswaId,
        tanggalMutasi: r.tanggalMutasi,
        jenisMutasi: r.jenisMutasi,
        alasanMutasi: r.alasanMutasi,
        sekolahTujuan: r.sekolahTujuan,
        createdAt: r.createdAt,
        siswa: {
          namaLengkap: r.namaSiswa,
          nisn: r.nisn,
          nisLokal: r.nisLokal,
          kelasId: r.kelasId,
          kelas: r.namaKelas ? { namaKelas: r.namaKelas } : null
        }
      }))
    }),

  createMutasi: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({
      siswaId: z.string(),
      tanggalMutasi: z.coerce.date(),
      jenisMutasi: z.enum(["Pindah Sekolah", "Mengundurkan Diri", "Dikeluarkan", "Meninggal Dunia"]),
      alasanMutasi: z.string().min(1),
      sekolahTujuan: z.string().optional().nullable(),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(siswa.id, input.siswaId), eq(siswa.sekolahId, sekolahId)]
      
      const existingSiswa = await db.query.siswa.findFirst({
        where: and(...conditions)
      })
      if (!existingSiswa) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      }

      // Step 1: Save mutation record
      const id = crypto.randomUUID()
      await db.insert(catatanMutasi).values({
        id,
        sekolahId,
        siswaId: input.siswaId,
        tanggalMutasi: input.tanggalMutasi,
        jenisMutasi: input.jenisMutasi,
        alasanMutasi: input.alasanMutasi,
        sekolahTujuan: input.sekolahTujuan,
      })

      // Step 2: Update student status
      const newStatus = input.jenisMutasi === "Pindah Sekolah" ? "pindah" : "keluar"
      await db
        .update(siswa)
        .set({
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(siswa.id, input.siswaId))

      await logAudit(ctx, {
        action: "create",
        entity: "catatan_mutasi",
        entityId: id,
        metadata: { siswaId: input.siswaId, jenisMutasi: input.jenisMutasi }
      })

      return { success: true }
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      
      const totalCond: any[] = []
      if (sekolahIdFilter) totalCond.push(eq(siswa.sekolahId, sekolahIdFilter))
      const [totalResult] = await db.select({ count: count() }).from(siswa).where(and(...totalCond))
      
      const activeCond: any[] = [eq(siswa.status, "aktif")]
      if (sekolahIdFilter) activeCond.push(eq(siswa.sekolahId, sekolahIdFilter))
      const [activeResult] = await db.select({ count: count() }).from(siswa).where(and(...activeCond))
      
      const maleCond: any[] = [eq(siswa.status, "aktif"), eq(siswa.jenisKelamin, "L")]
      if (sekolahIdFilter) maleCond.push(eq(siswa.sekolahId, sekolahIdFilter))
      const [maleResult] = await db.select({ count: count() }).from(siswa).where(and(...maleCond))
      
      const femaleCond: any[] = [eq(siswa.status, "aktif"), eq(siswa.jenisKelamin, "P")]
      if (sekolahIdFilter) femaleCond.push(eq(siswa.sekolahId, sekolahIdFilter))
      const [femaleResult] = await db.select({ count: count() }).from(siswa).where(and(...femaleCond))

      const noClassCond: any[] = [eq(siswa.status, "aktif"), isNull(siswa.kelasId)]
      if (sekolahIdFilter) noClassCond.push(eq(siswa.sekolahId, sekolahIdFilter))
      const [noClassResult] = await db.select({ count: count() }).from(siswa).where(and(...noClassCond))

      return {
        total: Number(totalResult?.count ?? 0),
        active: Number(activeResult?.count ?? 0),
        male: Number(maleResult?.count ?? 0),
        female: Number(femaleResult?.count ?? 0),
        noClass: Number(noClassResult?.count ?? 0),
      }
    }),
})
