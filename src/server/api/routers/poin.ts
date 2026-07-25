import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, asc, gte, lte, sql, sum, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import {
  poinKategori,
  poinTindakLanjut,
  poinAturan,
  poinSikap,
  siswa,
  guru,
  users,
} from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { createNotifikasi } from "@/server/notifikasi"
import { getSekolahIdFilter } from "@/server/api/tenant"

const kategoriCreateSchema = z.object({
  id: z.string().optional(),
  nama: z.string(),
  jenis: z.enum(["positif", "negatif"]),
  poin: z.number(),
})

const kategoriUpdateSchema = kategoriCreateSchema.partial()

const tindakLanjutCreateSchema = z.object({
  id: z.string().optional(),
  jenis: z.enum(["positif", "negatif"]),
  nama: z.string(),
})

const tindakLanjutUpdateSchema = tindakLanjutCreateSchema.partial()

const aturanCreateSchema = z.object({
  id: z.string().optional(),
  poinMin: z.number(),
  poinMax: z.number(),
  tindakLanjut: z.string(),
  status: z.string(),
})

const aturanUpdateSchema = aturanCreateSchema.partial()

const sikapCreateSchema = z.object({
  siswaId: z.string().optional(),
  siswaIds: z.array(z.string()).optional(),
  kategoriId: z.string(),
  tindakLanjutId: z.string().nullable().optional(),
  deskripsi: z.string().nullable().optional(),
})

export const poinRouter = router({
  // ── Kategori ──
  getAllKategori: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      jenis: z.enum(["positif", "negatif"]).optional(),
      aktifOnly: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahId) conditions.push(eq(poinKategori.sekolahId, sekolahId))
      if (input.search) conditions.push(like(poinKategori.nama, `%${input.search}%`))
      if (input.jenis) conditions.push(eq(poinKategori.jenis, input.jenis))
      if (input.aktifOnly) conditions.push(eq(poinKategori.aktif, true))
      return db.query.poinKategori.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [asc(poinKategori.jenis), asc(poinKategori.nama)],
      })
    }),

  createKategori: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(kategoriCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })
      const id = input.id || crypto.randomUUID()
      const [result] = await db.insert(poinKategori).values({ ...input, id, sekolahId }).returning()
      await logAudit(ctx, { action: "create", entity: "poin_kategori", entityId: id, metadata: { nama: input.nama } })
      return result
    }),

  updateKategori: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string(), data: kategoriUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinKategori.id, input.id)]
      if (sekolahId) conditions.push(eq(poinKategori.sekolahId, sekolahId))
      const existing = await db.query.poinKategori.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori tidak ditemukan" })
      const [result] = await db.update(poinKategori).set(input.data as any).where(and(...conditions)).returning()
      await logAudit(ctx, { action: "update", entity: "poin_kategori", entityId: input.id })
      return result
    }),

  removeKategori: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinKategori.id, input.id)]
      if (sekolahId) conditions.push(eq(poinKategori.sekolahId, sekolahId))
      const existing = await db.query.poinKategori.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori tidak ditemukan" })
      await db.delete(poinKategori).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "poin_kategori", entityId: input.id })
      return { success: true }
    }),

  // ── Tindak Lanjut ──
  getAllTindakLanjut: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      jenis: z.enum(["positif", "negatif"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahId) conditions.push(eq(poinTindakLanjut.sekolahId, sekolahId))
      if (input.search) conditions.push(like(poinTindakLanjut.nama, `%${input.search}%`))
      if (input.jenis) conditions.push(eq(poinTindakLanjut.jenis, input.jenis))
      return db.query.poinTindakLanjut.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [asc(poinTindakLanjut.jenis), asc(poinTindakLanjut.nama)],
      })
    }),

  createTindakLanjut: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(tindakLanjutCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })
      const id = input.id || crypto.randomUUID()
      const [result] = await db.insert(poinTindakLanjut).values({ ...input, id, sekolahId }).returning()
      await logAudit(ctx, { action: "create", entity: "poin_tindak_lanjut", entityId: id, metadata: { nama: input.nama } })
      return result
    }),

  updateTindakLanjut: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string(), data: tindakLanjutUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinTindakLanjut.id, input.id)]
      if (sekolahId) conditions.push(eq(poinTindakLanjut.sekolahId, sekolahId))
      const existing = await db.query.poinTindakLanjut.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tindak lanjut tidak ditemukan" })
      const [result] = await db.update(poinTindakLanjut).set(input.data as any).where(and(...conditions)).returning()
      await logAudit(ctx, { action: "update", entity: "poin_tindak_lanjut", entityId: input.id })
      return result
    }),

  removeTindakLanjut: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinTindakLanjut.id, input.id)]
      if (sekolahId) conditions.push(eq(poinTindakLanjut.sekolahId, sekolahId))
      const existing = await db.query.poinTindakLanjut.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tindak lanjut tidak ditemukan" })
      await db.delete(poinTindakLanjut).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "poin_tindak_lanjut", entityId: input.id })
      return { success: true }
    }),

  // ── Aturan Akumulasi ──
  getAllAturan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .query(async ({ ctx }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahId) conditions.push(eq(poinAturan.sekolahId, sekolahId))
      return db.query.poinAturan.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [asc(poinAturan.poinMin)],
      })
    }),

  createAturan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(aturanCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })
      const id = input.id || crypto.randomUUID()
      const [result] = await db.insert(poinAturan).values({ ...input, id, sekolahId }).returning()
      await logAudit(ctx, { action: "create", entity: "poin_aturan", entityId: id })
      return result
    }),

  updateAturan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string(), data: aturanUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinAturan.id, input.id)]
      if (sekolahId) conditions.push(eq(poinAturan.sekolahId, sekolahId))
      const existing = await db.query.poinAturan.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Aturan tidak ditemukan" })
      const [result] = await db.update(poinAturan).set(input.data as any).where(and(...conditions)).returning()
      await logAudit(ctx, { action: "update", entity: "poin_aturan", entityId: input.id })
      return result
    }),

  removeAturan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinAturan.id, input.id)]
      if (sekolahId) conditions.push(eq(poinAturan.sekolahId, sekolahId))
      const existing = await db.query.poinAturan.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Aturan tidak ditemukan" })
      await db.delete(poinAturan).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "poin_aturan", entityId: input.id })
      return { success: true }
    }),

  // ── Poin Sikap (Transaksi) ──
  getAllSikap: protectedProcedure
    .input(z.object({
      siswaId: z.string().optional(),
      jenis: z.enum(["positif", "negatif"]).optional(),
      tanggalMulai: z.coerce.date().optional(),
      tanggalSelesai: z.coerce.date().optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinSikap.sekolahId, sekolahId || "")]
      if (sekolahId) conditions.push(eq(poinSikap.sekolahId, sekolahId))
      if (input.siswaId) conditions.push(eq(poinSikap.siswaId, input.siswaId))
      if (input.tanggalMulai) conditions.push(gte(poinSikap.createdAt, input.tanggalMulai))
      if (input.tanggalSelesai) conditions.push(lte(poinSikap.createdAt, input.tanggalSelesai))

      const data = await db.query.poinSikap.findMany({
        where: and(...conditions),
        orderBy: [desc(poinSikap.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          siswa: true,
          kategori: true,
          tindakLanjut: true,
          guru: true,
        },
      })

      if (input.jenis && data.length > 0) {
        return data.filter((d: any) => d.kategori?.jenis === input.jenis)
      }

      return data
    }),

  createSikap: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(sanitized(sikapCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })

      const targetSiswaIds = input.siswaIds && input.siswaIds.length > 0
        ? input.siswaIds
        : (input.siswaId ? [input.siswaId] : [])

      if (targetSiswaIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pilih minimal 1 siswa" })
      }

      const kategori = await db.query.poinKategori.findFirst({
        where: and(eq(poinKategori.id, input.kategoriId), eq(poinKategori.sekolahId, sekolahId)),
      })
      if (!kategori) throw new TRPCError({ code: "NOT_FOUND", message: "Kategori sikap tidak ditemukan" })

      // Safely resolve teacher ID in school
      const userEmail = ctx.session.user.email
      let guruId = ""
      if (userEmail) {
        const guruRecord = await db.query.guru.findFirst({
          where: and(
            eq(guru.sekolahId, sekolahId),
            or(
              eq(guru.email, userEmail),
              eq(guru.usernameGuru, userEmail),
              eq(guru.nipnuptk, userEmail)
            )
          ),
        })
        if (guruRecord) {
          guruId = guruRecord.id
        }
      }

      if (!guruId && ctx.session.user.id) {
        const userRecord = await db.query.users.findFirst({
          where: eq(users.id, ctx.session.user.id),
        })
        if (userRecord?.firstName) {
          const guruRecord = await db.query.guru.findFirst({
            where: and(
              eq(guru.sekolahId, sekolahId),
              eq(guru.namaLengkap, `${userRecord.firstName} ${userRecord.lastName || ""}`.trim())
            ),
          })
          if (guruRecord) {
            guruId = guruRecord.id
          }
        }
      }

      if (!guruId) {
        const anyGuru = await db.query.guru.findFirst({
          where: eq(guru.sekolahId, sekolahId),
        })
        if (anyGuru) {
          guruId = anyGuru.id
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Belum ada data Guru terdaftar di sekolah ini. Silakan buat minimal 1 data Guru terlebih dahulu.",
          })
        }
      }

      const valuesToInsert = targetSiswaIds.map((sId) => ({
        id: crypto.randomUUID(),
        sekolahId,
        siswaId: sId,
        kategoriId: input.kategoriId,
        poin: kategori.poin,
        tindakLanjutId: input.tindakLanjutId ?? null,
        deskripsi: input.deskripsi ?? null,
        guruId,
        status: "belum_diproses" as const,
      }))

      const results = await db.insert(poinSikap).values(valuesToInsert).returning()

      await logAudit(ctx, {
        action: "create",
        entity: "poin_sikap",
        entityId: results[0]?.id || "",
        metadata: { totalSiswa: targetSiswaIds.length, poin: kategori.poin, jenis: kategori.jenis },
      })

      return { success: true, count: results.length }
    }),

  // ── Monitoring ──
  getMonitoring: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({
      status: z.enum(["belum_diproses", "sedang_diproses", "selesai"]).optional(),
      search: z.string().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinSikap.sekolahId, sekolahId || "")]
      if (sekolahId) conditions.push(eq(poinSikap.sekolahId, sekolahId))
      if (input.status) conditions.push(eq(poinSikap.status, input.status))

      const data = await db.query.poinSikap.findMany({
        where: and(...conditions),
        orderBy: [desc(poinSikap.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          siswa: true,
          kategori: true,
          tindakLanjut: true,
          guru: true,
        },
      })

      if (input.search) {
        const q = input.search.toLowerCase()
        return data.filter((d: any) =>
          d.siswa?.namaLengkap?.toLowerCase().includes(q)
        )
      }

      return data
    }),

  updateStatusMonitoring: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      id: z.string(),
      status: z.enum(["belum_diproses", "sedang_diproses", "selesai"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinSikap.id, input.id)]
      if (sekolahId) conditions.push(eq(poinSikap.sekolahId, sekolahId))
      const existing = await db.query.poinSikap.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Data tidak ditemukan" })
      const [result] = await db.update(poinSikap).set({ status: input.status }).where(and(...conditions)).returning()
      return result
    }),

  removeSikap: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinSikap.id, input.id)]
      if (sekolahId) conditions.push(eq(poinSikap.sekolahId, sekolahId))
      const existing = await db.query.poinSikap.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Data tidak ditemukan" })
      await db.delete(poinSikap).where(and(...conditions))
      return { success: true }
    }),

  // ── Dashboard ──
  getDashboardSiswa: protectedProcedure
    .query(async ({ ctx }) => {
      const userEmail = ctx.session.user.email

      let currentSiswa = null
      if (userEmail) {
        currentSiswa = await db.query.siswa.findFirst({
          where: or(
            eq(siswa.usernameSiswa, userEmail),
            eq(siswa.emailSiswa, userEmail),
            eq(siswa.nisn, userEmail),
          ),
        })
      }

      let totalPoin = 0
      if (currentSiswa) {
        const conditions = [eq(poinSikap.siswaId, currentSiswa.id)]
        if (currentSiswa.sekolahId) conditions.push(eq(poinSikap.sekolahId, currentSiswa.sekolahId))
        const poinData = await db
          .select({ total: sum(poinSikap.poin) })
          .from(poinSikap)
          .where(and(...conditions))
        totalPoin = Number(poinData[0]?.total) || 0
      }

      const leaderboardKondisi = [eq(poinKategori.jenis, "positif")]
      if (currentSiswa?.sekolahId) leaderboardKondisi.push(eq(poinSikap.sekolahId, currentSiswa.sekolahId))
      const leaderboard = await db
        .select({
          siswaId: poinSikap.siswaId,
          totalPoin: sum(poinSikap.poin).mapWith(Number),
        })
        .from(poinSikap)
        .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
        .where(and(...leaderboardKondisi))
        .groupBy(poinSikap.siswaId)
        .orderBy(desc(sql`sum(${poinSikap.poin})`))
        .limit(5)

      const leaderboardWithSiswa = await Promise.all(
        leaderboard.map(async (row) => {
          const s = await db.query.siswa.findFirst({
            where: eq(siswa.id, row.siswaId),
          })
          return { ...row, namaLengkap: s?.namaLengkap || "-" }
        })
      )

      return { totalPoin, leaderboard: leaderboardWithSiswa, currentSiswa }
    }),

  getDashboardGuruAdmin: protectedProcedure
    .query(async ({ ctx }) => {
      const sekolahId = ctx.session.user.sekolahId
      const kondisiPositif = [eq(poinKategori.jenis, "positif")]
      const kondisiNegatif = [eq(poinKategori.jenis, "negatif")]
      if (sekolahId) {
        kondisiPositif.push(eq(poinSikap.sekolahId, sekolahId))
        kondisiNegatif.push(eq(poinSikap.sekolahId, sekolahId))
      }

      const topPositif = await db
        .select({
          siswaId: poinSikap.siswaId,
          totalPoin: sum(poinSikap.poin).mapWith(Number),
        })
        .from(poinSikap)
        .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
        .where(and(...kondisiPositif))
        .groupBy(poinSikap.siswaId)
        .orderBy(desc(sql`sum(${poinSikap.poin})`))
        .limit(5)

      const topNegatif = await db
        .select({
          siswaId: poinSikap.siswaId,
          totalPoin: sum(poinSikap.poin).mapWith(Number),
        })
        .from(poinSikap)
        .innerJoin(poinKategori, eq(poinSikap.kategoriId, poinKategori.id))
        .where(and(...kondisiNegatif))
        .groupBy(poinSikap.siswaId)
        .orderBy(desc(sql`sum(${poinSikap.poin})`))
        .limit(5)

      const positifWithSiswa = await Promise.all(
        topPositif.map(async (row) => {
          const s = await db.query.siswa.findFirst({ where: eq(siswa.id, row.siswaId) })
          return { ...row, namaLengkap: s?.namaLengkap || "-" }
        })
      )

      const negatifWithSiswa = await Promise.all(
        topNegatif.map(async (row) => {
          const s = await db.query.siswa.findFirst({ where: eq(siswa.id, row.siswaId) })
          return { ...row, namaLengkap: s?.namaLengkap || "-" }
        })
      )

      return { topPositif: positifWithSiswa, topNegatif: negatifWithSiswa }
    }),

  // ── Kirim Pemberitahuan ──
  kirimPemberitahuan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ siswaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah tidak ditemukan" })

      const dataSiswa = await db.query.siswa.findFirst({ where: eq(siswa.id, input.siswaId) })
      if (!dataSiswa) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })

      const [poinData] = await db
        .select({ total: sum(poinSikap.poin).mapWith(Number) })
        .from(poinSikap)
        .where(and(
          eq(poinSikap.sekolahId, sekolahId),
          eq(poinSikap.siswaId, input.siswaId),
        ))
      const totalPoin = poinData?.total || 0

      const aturan = await db.query.poinAturan.findFirst({
        where: and(
          eq(poinAturan.sekolahId, sekolahId),
          lte(poinAturan.poinMin, totalPoin),
          gte(poinAturan.poinMax, totalPoin),
        ),
      })

      const judul = totalPoin >= 0
        ? "Apresiasi Prestasi Poin Positif"
        : "Peringatan Akumulasi Poin Negatif"
      let pesan = `Siswa ${dataSiswa.namaLengkap} memiliki total poin ${totalPoin}.`
      if (aturan) {
        pesan += `\n\nBerdasarkan aturan: ${aturan.tindakLanjut}`
      }

      await createNotifikasi(ctx as any, {
        judul,
        pesan,
        tipe: totalPoin < 0 ? "warning" : "success",
        link: `/kesiswaan/monitoring-poin?siswaId=${input.siswaId}`,
      })

      return { success: true, totalPoin, aturan: aturan || null }
    }),

  // ── Monitoring Ambang Batas ──
  getMonitoringThreshold: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .query(async ({ ctx }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      if (!sekolahId) return []

      const aturanList = await db.query.poinAturan.findMany({
        where: eq(poinAturan.sekolahId, sekolahId),
        orderBy: [asc(poinAturan.poinMin)],
      })

      const studentTotals = await db
        .select({
          siswaId: poinSikap.siswaId,
          totalPoin: sum(poinSikap.poin).mapWith(Number),
        })
        .from(poinSikap)
        .where(eq(poinSikap.sekolahId, sekolahId))
        .groupBy(poinSikap.siswaId)

      const allSiswaIds = studentTotals.map(st => st.siswaId)
      const siswaData = allSiswaIds.length > 0
        ? await db.query.siswa.findMany({
            where: inArray(siswa.id, allSiswaIds),
          })
        : []
      const siswaMap = new Map(siswaData.map(s => [s.id, s]))

      const result: {
        aturan: typeof aturanList[0]
        students: { siswaId: string; namaLengkap: string; nisn: string | null; totalPoin: number }[]
      }[] = []

      for (const aturan of aturanList) {
        const matched = studentTotals.filter(
          st => st.totalPoin >= aturan.poinMin && st.totalPoin <= aturan.poinMax
        )
        if (matched.length === 0) continue

        result.push({
          aturan,
          students: matched.map(st => {
            const s = siswaMap.get(st.siswaId)
            return {
              siswaId: st.siswaId,
              namaLengkap: s?.namaLengkap || "-",
              nisn: s?.nisn || null,
              totalPoin: st.totalPoin,
            }
          }),
        })
      }

      return result
    }),

  // ── Rapor Karakter ──
  getRaporSiswa: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ siswaId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [
        eq(poinSikap.sekolahId, sekolahId || ""),
        eq(poinSikap.siswaId, input.siswaId),
      ]
      if (sekolahId) conditions[0] = eq(poinSikap.sekolahId, sekolahId)

      const dataSiswa = await db.query.siswa.findFirst({ where: eq(siswa.id, input.siswaId) })
      if (!dataSiswa) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })

      const records = await db.query.poinSikap.findMany({
        where: and(...conditions),
        orderBy: [desc(poinSikap.createdAt)],
        with: {
          kategori: true,
          tindakLanjut: true,
          guru: true,
        },
      })

      const totalPoin = records.reduce((acc, r) => acc + r.poin, 0)
      const positifCount = records.filter((r: any) => r.kategori?.jenis === "positif").length
      const negatifCount = records.filter((r: any) => r.kategori?.jenis === "negatif").length

      return {
        siswa: dataSiswa,
        totalPoin,
        positifCount,
        negatifCount,
        records,
      }
    }),

  // ── Laporan Export ──
  getLaporanData: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({
      tanggalMulai: z.coerce.date().optional(),
      tanggalSelesai: z.coerce.date().optional(),
      jenis: z.enum(["positif", "negatif"]).optional(),
      siswaId: z.string().optional(),
      limit: z.number().optional().default(500),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx)
      const conditions = [eq(poinSikap.sekolahId, sekolahId || "")]
      if (sekolahId) conditions.push(eq(poinSikap.sekolahId, sekolahId))
      if (input.tanggalMulai) conditions.push(gte(poinSikap.createdAt, input.tanggalMulai))
      if (input.tanggalSelesai) conditions.push(lte(poinSikap.createdAt, input.tanggalSelesai))
      if (input.siswaId) conditions.push(eq(poinSikap.siswaId, input.siswaId))

      let data = await db.query.poinSikap.findMany({
        where: and(...conditions),
        orderBy: [desc(poinSikap.createdAt)],
        limit: input.limit,
        with: {
          siswa: true,
          kategori: true,
          tindakLanjut: true,
          guru: true,
        },
      })

      if (input.jenis) {
        data = data.filter((d: any) => d.kategori?.jenis === input.jenis)
      }

      return data
    }),
})
