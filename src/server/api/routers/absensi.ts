import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, between, or, asc, lte, gte } from "drizzle-orm"
import { db } from "@/server/db"
import { absensiSiswa, absensiGuru, pengaturanAbsensi, siswa, guru, kelas, jadwalPelajaran, pengajuanIzin } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const absensiBulkCreateSchema = z.object({
  absensi: z.array(
    z.object({
      id: z.string().optional(),
      siswaId: z.string(),
      kelasId: z.string(),
      tanggal: z.coerce.date(),
      status: z.enum(["hadir", "izin", "sakit", "alpha", "terlambat"]),
      jamMasuk: z.coerce.date().nullable().optional(),
      jamPulang: z.coerce.date().nullable().optional(),
      keterangan: z.string().nullable().optional(),
    }),
  ),
})

const absensiUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(["hadir", "izin", "sakit", "alpha", "terlambat"]).optional(),
  jamMasuk: z.coerce.date().nullable().optional(),
  jamPulang: z.coerce.date().nullable().optional(),
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

function parseTimeStringToTodayDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
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
      if (input.tanggal) {
        const start = new Date(input.tanggal)
        start.setHours(0, 0, 0, 0)
        const end = new Date(input.tanggal)
        end.setHours(23, 59, 59, 999)
        conditions.push(between(absensiSiswa.tanggal, start, end))
      }
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
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const values = input.absensi.map((a) => ({
        ...a,
        id: a.id || crypto.randomUUID(),
        sekolahId,
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
          jamMasuk: input.jamMasuk,
          jamPulang: input.jamPulang,
          keterangan: input.keterangan,
        })
        .where(eq(absensiSiswa.id, input.id))
        .returning()
      await logAudit(ctx, { action: "update", entity: "absensi_siswa", entityId: result[0]?.id, metadata: { status: input.status } })
      return result[0]
    }),

  getPengaturan: protectedProcedure.query(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
    let settings = await db.query.pengaturanAbsensi.findFirst({
      where: eq(pengaturanAbsensi.sekolahId, sekolahId),
    })
    if (!settings) {
      // Create defaults
      const [newSettings] = await db
        .insert(pengaturanAbsensi)
        .values({
          id: crypto.randomUUID(),
          sekolahId,
          jamMasuk: "07:00",
          jamPulang: "14:00",
          toleransi: 15,
        })
        .returning()
      settings = newSettings
    }
    return settings
  }),

  savePengaturan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(
      z.object({
        jamMasuk: z.string(),
        jamPulang: z.string(),
        toleransi: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const existing = await db.query.pengaturanAbsensi.findFirst({
        where: eq(pengaturanAbsensi.sekolahId, sekolahId),
      })

      if (existing) {
        await db
          .update(pengaturanAbsensi)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(pengaturanAbsensi.sekolahId, sekolahId))
      } else {
        await db.insert(pengaturanAbsensi).values({
          id: crypto.randomUUID(),
          sekolahId,
          ...input,
        })
      }
      await logAudit(ctx, { action: "update_pengaturan_absensi", entity: "pengaturan_absensi", metadata: input })
      return { success: true }
    }),

  absenViaBarcode: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "tu"])
    .input(z.object({ barcode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const code = input.barcode.trim()
      const now = new Date()
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)

      const student = await db.query.siswa.findFirst({
        where: and(eq(siswa.sekolahId, sekolahId), or(eq(siswa.nisn, code), eq(siswa.id, code), eq(siswa.nisLokal, code))),
      })

      if (student) {
        if (!student.kelasId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Siswa belum memiliki rombongan belajar (kelas)" })
        }

        const role = ctx.session.user.role
        const email = ctx.session.user.email ?? ""
        if (role === "guru") {
          const teacher = await db.query.guru.findFirst({
            where: and(eq(guru.sekolahId, sekolahId), or(eq(guru.usernameGuru, email), eq(guru.email, email), eq(guru.nipnuptk, email))),
          })
          if (teacher) {
            const isWali = await db.query.kelas.findFirst({
              where: and(eq(kelas.id, student.kelasId), eq(kelas.waliKelasId, teacher.id)),
            })
            if (!isWali) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Anda bukan Wali Kelas dari siswa ini" })
            }
          }
        }

        const settings = await db.query.pengaturanAbsensi.findFirst({
          where: eq(pengaturanAbsensi.sekolahId, sekolahId),
        })
        const jamMasukStr = settings?.jamMasuk ?? "07:00"
        const jamPulangStr = settings?.jamPulang ?? "14:00"
        const toleransi = settings?.toleransi ?? 15

        const limitMasuk = parseTimeStringToTodayDate(jamMasukStr)
        limitMasuk.setMinutes(limitMasuk.getMinutes() + toleransi)

        const existingAbsen = await db.query.absensiSiswa.findFirst({
          where: and(eq(absensiSiswa.siswaId, student.id), between(absensiSiswa.tanggal, startOfToday, endOfToday)),
        })

        if (!existingAbsen) {
          // Cek apakah ada izin tidak_masuk yang sudah disetujui untuk hari ini
          const approvedIzinSakit = await db.query.pengajuanIzin.findFirst({
            where: and(
              eq(pengajuanIzin.siswaId, student.id),
              eq(pengajuanIzin.status, "disetujui"),
              eq(pengajuanIzin.jenisIzin, "tidak_masuk"),
              lte(pengajuanIzin.tanggalMulai, endOfToday),
              gte(pengajuanIzin.tanggalSelesai, startOfToday),
            ),
          })
          if (approvedIzinSakit) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Kamu sedang dalam izin sakit/izin tidak masuk hari ini. Absensi sudah dicatat otomatis.",
            })
          }

          // Check-in (Masuk)
          const isLate = now > limitMasuk
          const status = isLate ? "terlambat" : "hadir"

          const [created] = await db
            .insert(absensiSiswa)
            .values({
              id: crypto.randomUUID(),
              sekolahId,
              siswaId: student.id,
              kelasId: student.kelasId,
              tanggal: now,
              status,
              jamMasuk: now,
            })
            .returning()

          await logAudit(ctx, { action: "scan_checkin_siswa", entity: "absensi_siswa", entityId: created.id, metadata: { name: student.namaLengkap } })
          return { success: true, type: "siswa", name: student.namaLengkap, action: "masuk", status }
        } else {
          // Check-out (Pulang)
          if (existingAbsen.jamPulang) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Siswa sudah melakukan absensi pulang hari ini" })
          }

          // Cek apakah ada izin pulang_cepat yang sudah disetujui untuk hari ini
          const approvedIzinPulangCepat = await db.query.pengajuanIzin.findFirst({
            where: and(
              eq(pengajuanIzin.siswaId, student.id),
              eq(pengajuanIzin.status, "disetujui"),
              eq(pengajuanIzin.jenisIzin, "pulang_cepat"),
              lte(pengajuanIzin.tanggalMulai, endOfToday),
            ),
          })

          if (!approvedIzinPulangCepat) {
            const limitPulang = parseTimeStringToTodayDate(jamPulangStr)
            if (now < limitPulang) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Belum waktunya absen pulang. Jam pulang hari ini pukul ${jamPulangStr}`,
              })
            }
          }

          await db
            .update(absensiSiswa)
            .set({ jamPulang: now })
            .where(eq(absensiSiswa.id, existingAbsen.id))

          await logAudit(ctx, { action: "scan_checkout_siswa", entity: "absensi_siswa", entityId: existingAbsen.id, metadata: { name: student.namaLengkap } })
          return { success: true, type: "siswa", name: student.namaLengkap, action: "pulang", status: existingAbsen.status }
        }
      }

      // 2. Search for Teacher
      const teacher = await db.query.guru.findFirst({
        where: and(eq(guru.sekolahId, sekolahId), or(eq(guru.nipnuptk, code), eq(guru.nik, code), eq(guru.id, code))),
      })

      if (teacher) {
        const days = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
        const todayDay = days[now.getDay()]

        // Get schedules for this teacher today
        const schedules = await db.query.jadwalPelajaran.findMany({
          where: and(eq(jadwalPelajaran.guruId, teacher.id), eq(jadwalPelajaran.hari, todayDay as any)),
        })

        const existingAbsen = await db.query.absensiGuru.findFirst({
          where: and(eq(absensiGuru.guruId, teacher.id), between(absensiGuru.tanggal, startOfToday, endOfToday)),
        })

        if (schedules.length === 0) {
          // No schedule, but still allowed to check-in/out
          if (!existingAbsen) {
            const [created] = await db
              .insert(absensiGuru)
              .values({
                id: crypto.randomUUID(),
                sekolahId,
                guruId: teacher.id,
                tanggal: now,
                status: "hadir",
                jamMasuk: now,
              })
              .returning()

            await logAudit(ctx, { action: "scan_checkin_guru_no_schedule", entity: "absensi_guru", entityId: created.id, metadata: { name: teacher.namaLengkap } })
            return { success: true, type: "guru", name: teacher.namaLengkap, action: "masuk", status: "hadir" }
          } else {
            if (existingAbsen.jamPulang) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Guru sudah melakukan absensi pulang hari ini" })
            }

            await db
              .update(absensiGuru)
              .set({ jamPulang: now })
              .where(eq(absensiGuru.id, existingAbsen.id))

            await logAudit(ctx, { action: "scan_checkout_guru_no_schedule", entity: "absensi_guru", entityId: existingAbsen.id, metadata: { name: teacher.namaLengkap } })
            return { success: true, type: "guru", name: teacher.namaLengkap, action: "pulang", status: "hadir" }
          }
        }

        // Has schedule, find bounds
        // schedules jamMulai and jamSelesai are Dates (with 1970-01-01 time portions)
        let earliestMasuk: Date | null = null
        let latestPulang: Date | null = null

        for (const s of schedules) {
          if (s.jamMulai) {
            const sStart = new Date(s.jamMulai)
            if (!earliestMasuk || sStart.getHours() < earliestMasuk.getHours() || (sStart.getHours() === earliestMasuk.getHours() && sStart.getMinutes() < earliestMasuk.getMinutes())) {
              earliestMasuk = sStart
            }
          }
          if (s.jamSelesai) {
            const sEnd = new Date(s.jamSelesai)
            if (!latestPulang || sEnd.getHours() > latestPulang.getHours() || (sEnd.getHours() === latestPulang.getHours() && sEnd.getMinutes() > latestPulang.getMinutes())) {
              latestPulang = sEnd
            }
          }
        }

        const limitMasuk = earliestMasuk ? new Date() : new Date()
        if (earliestMasuk) {
          limitMasuk.setHours(earliestMasuk.getHours(), earliestMasuk.getMinutes(), 0, 0)
        } else {
          limitMasuk.setHours(7, 0, 0, 0)
        }

        const limitPulang = latestPulang ? new Date() : new Date()
        if (latestPulang) {
          limitPulang.setHours(latestPulang.getHours(), latestPulang.getMinutes(), 0, 0)
        } else {
          limitPulang.setHours(14, 0, 0, 0)
        }

        if (!existingAbsen) {
          // Check-in (Masuk)
          const isLate = now > limitMasuk
          const status = isLate ? "terlambat" : "hadir"

          const [created] = await db
            .insert(absensiGuru)
            .values({
              id: crypto.randomUUID(),
              sekolahId,
              guruId: teacher.id,
              tanggal: now,
              status,
              jamMasuk: now,
            })
            .returning()

          await logAudit(ctx, { action: "scan_checkin_guru", entity: "absensi_guru", entityId: created.id, metadata: { name: teacher.namaLengkap } })
          return { success: true, type: "guru", name: teacher.namaLengkap, action: "masuk", status }
        } else {
          // Check-out (Pulang)
          if (existingAbsen.jamPulang) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Guru sudah melakukan absensi pulang hari ini" })
          }

          if (now < limitPulang) {
            const targetTimeStr = limitPulang.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Absen pulang dikunci hingga jam mengajar terakhir selesai pada jam ${targetTimeStr}`,
            })
          }

          await db
            .update(absensiGuru)
            .set({ jamPulang: now })
            .where(eq(absensiGuru.id, existingAbsen.id))

          await logAudit(ctx, { action: "scan_checkout_guru", entity: "absensi_guru", entityId: existingAbsen.id, metadata: { name: teacher.namaLengkap } })
          return { success: true, type: "guru", name: teacher.namaLengkap, action: "pulang", status: existingAbsen.status }
        }
      }

      throw new TRPCError({ code: "NOT_FOUND", message: "Barcode/QR tidak valid atau tidak terdaftar" })
    }),

  getGuruAbsensi: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "yayasan"])
    .input(
      z.object({
        tanggal: z.coerce.date().optional(),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const conditions = [eq(absensiGuru.sekolahId, sekolahId)]

      if (input.tanggal) {
        const start = new Date(input.tanggal)
        start.setHours(0, 0, 0, 0)
        const end = new Date(input.tanggal)
        end.setHours(23, 59, 59, 999)
        conditions.push(between(absensiGuru.tanggal, start, end))
      }

      return db
        .select()
        .from(absensiGuru)
        .where(and(...conditions))
        .orderBy(desc(absensiGuru.tanggal))
        .limit(input.limit)
        .offset(input.offset)
    }),

  getGuruOwnAbsensi: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      // Find current guru
      const teacher = await db.query.guru.findFirst({
        where: and(eq(guru.sekolahId, sekolahId), or(eq(guru.usernameGuru, ctx.session.user.email ?? ""), eq(guru.email, ctx.session.user.email ?? ""), eq(guru.nipnuptk, ctx.session.user.email ?? ""))),
      })

      if (!teacher) throw new TRPCError({ code: "NOT_FOUND", message: "Profil guru tidak ditemukan" })

      return db
        .select()
        .from(absensiGuru)
        .where(and(eq(absensiGuru.sekolahId, sekolahId), eq(absensiGuru.guruId, teacher.id)))
        .orderBy(desc(absensiGuru.tanggal))
        .limit(input.limit)
        .offset(input.offset)
    }),

  getStudentOwnAbsensi: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const std = await db.query.siswa.findFirst({
        where: and(eq(siswa.sekolahId, sekolahId), or(eq(siswa.usernameSiswa, ctx.session.user.email ?? ""), eq(siswa.nisn, ctx.session.user.email ?? ""))),
      })

      if (!std) throw new TRPCError({ code: "NOT_FOUND", message: "Profil siswa tidak ditemukan" })

      return db
        .select()
        .from(absensiSiswa)
        .where(and(eq(absensiSiswa.sekolahId, sekolahId), eq(absensiSiswa.siswaId, std.id)))
        .orderBy(desc(absensiSiswa.tanggal))
        .limit(input.limit)
        .offset(input.offset)
    }),

  createOrUpdateGuruAbsensi: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(
      z.object({
        id: z.string().optional(),
        guruId: z.string(),
        tanggal: z.coerce.date(),
        status: z.enum(["hadir", "izin", "sakit", "alpha", "terlambat"]),
        jamMasuk: z.coerce.date().nullable().optional(),
        jamPulang: z.coerce.date().nullable().optional(),
        keterangan: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      if (input.id) {
        const result = await db
          .update(absensiGuru)
          .set({
            status: input.status,
            jamMasuk: input.jamMasuk,
            jamPulang: input.jamPulang,
            keterangan: input.keterangan,
            updatedAt: new Date(),
          })
          .where(eq(absensiGuru.id, input.id))
          .returning()
        await logAudit(ctx, { action: "update_guru_absensi", entity: "absensi_guru", entityId: result[0]?.id })
        return result[0]
      } else {
        const [result] = await db
          .insert(absensiGuru)
          .values({
            id: crypto.randomUUID(),
            sekolahId,
            guruId: input.guruId,
            tanggal: input.tanggal,
            status: input.status,
            jamMasuk: input.jamMasuk,
            jamPulang: input.jamPulang,
            keterangan: input.keterangan,
          })
          .returning()
        await logAudit(ctx, { action: "create_guru_absensi", entity: "absensi_guru", entityId: result.id })
        return result
      }
    }),
})
