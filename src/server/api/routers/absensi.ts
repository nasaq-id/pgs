import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, between, or, asc, lte, gte } from "drizzle-orm"
import { db } from "@/server/db"
import { absensiSiswa, absensiGuru, pengaturanAbsensi, siswa, guru, kelas, jadwalPelajaran, pengajuanIzin, sekolah } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // in meters
}

function getSchoolTime(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  })
  const parts = formatter.formatToParts(date)
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  return { hour, minute }
}

function getMinutesSinceMidnightInSchoolTime(date: Date): number {
  const { hour, minute } = getSchoolTime(date)
  return hour * 60 + minute
}

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}

function getMinutesSinceMidnightOfSchedule(date: Date | null | undefined): number | null {
  if (!date) return null
  const { hour, minute } = getSchoolTime(date)
  return hour * 60 + minute
}

function getSchoolDayDate(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  })
  const parts = formatter.formatToParts(date)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970', 10)
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10)
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

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
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
        }
      }
      const conditions = [eq(absensiSiswa.kelasId, input.kelasId)]
      if (input.tanggal) {
        const start = getSchoolDayDate(new Date(input.tanggal))
        const end = getSchoolDayDate(new Date(input.tanggal))
        end.setUTCHours(23, 59, 59, 999)
        conditions.push(between(absensiSiswa.tanggal, start, end))
      }
      if (input.tanggalMulai && input.tanggalSelesai) {
        const start = getSchoolDayDate(new Date(input.tanggalMulai))
        const end = getSchoolDayDate(new Date(input.tanggalSelesai))
        end.setUTCHours(23, 59, 59, 999)
        conditions.push(between(absensiSiswa.tanggal, start, end))
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
    .input(sanitized(absensiBulkCreateSchema))
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
    .input(sanitized(absensiUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
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

  getPengaturan: protectedProcedure
    .input(z.object({ sekolahId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let sekolahId = ctx.session.user.sekolahId || input?.sekolahId
      if (!sekolahId && ctx.session.user.role === "super_admin") {
        const first = await db.query.sekolah.findFirst()
        sekolahId = first?.id
      }
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
            jamMasukSiswa: "07:00",
            jamPulangSiswa: "14:00",
            toleransiSiswa: 15,
            radius: 100,
            aturanGuru: "per_jp",
          })
          .returning()
        settings = newSettings
      }
      return settings
    }),

  savePengaturan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(
      sanitized(z.object({
        sekolahId: z.string().optional(),
        jamMasuk: z.string(),
        jamPulang: z.string(),
        toleransi: z.number(),
        jamMasukSiswa: z.string().optional(),
        jamPulangSiswa: z.string().optional(),
        toleransiSiswa: z.number().optional(),
        latitude: z.string().nullable().optional(),
        longitude: z.string().nullable().optional(),
        radius: z.number().optional().default(100),
        aturanGuru: z.enum(["per_jp", "umum"]).optional().default("per_jp"),
      })),
    )
    .mutation(async ({ ctx, input }) => {
      const { sekolahId: inputSekolahId, ...rest } = input
      let sekolahId = ctx.session.user.sekolahId || inputSekolahId
      if (!sekolahId && ctx.session.user.role === "super_admin") {
        const first = await db.query.sekolah.findFirst()
        sekolahId = first?.id
      }
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const existing = await db.query.pengaturanAbsensi.findFirst({
        where: eq(pengaturanAbsensi.sekolahId, sekolahId),
      })

      if (existing) {
        await db
          .update(pengaturanAbsensi)
          .set({ ...rest, updatedAt: new Date() })
          .where(eq(pengaturanAbsensi.sekolahId, sekolahId))
      } else {
        await db.insert(pengaturanAbsensi).values({
          id: crypto.randomUUID(),
          sekolahId,
          ...rest,
        })
      }
      await logAudit(ctx, { action: "update_pengaturan_absensi", entity: "pengaturan_absensi", metadata: input })
      return { success: true }
    }),

  absenViaBarcode: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "tu"])
    .input(
      sanitized(z.object({
        barcode: z.string(),
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),
        alasan: z.string().optional(),
      })),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const code = input.barcode.trim()
      const now = new Date()
      const schoolToday = getSchoolDayDate(now)
      const startOfToday = new Date(schoolToday)
      const endOfToday = new Date(schoolToday)
      endOfToday.setUTCHours(23, 59, 59, 999)

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

        // Geofencing verification
        if (settings?.latitude && settings?.longitude) {
          const schoolLat = parseFloat(settings.latitude)
          const schoolLng = parseFloat(settings.longitude)
          const radius = settings.radius ?? 100

          if (input.latitude === null || input.latitude === undefined || input.longitude === null || input.longitude === undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Gagal memproses absensi: Izin lokasi (GPS) perangkat diperlukan untuk memverifikasi posisi Anda di area sekolah.",
            })
          }

          const distance = getDistanceInMeters(schoolLat, schoolLng, input.latitude, input.longitude)
          if (distance > radius) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Absen ditolak: Posisi perangkat Anda berada di luar area sekolah (${Math.round(distance)} meter dari titik koordinat resmi). Batas maksimal: ${radius} meter.`,
            })
          }
        }

        const jamMasukStr = settings?.jamMasukSiswa ?? "07:00"
        const jamPulangStr = settings?.jamPulangSiswa ?? "14:00"
        const toleransi = settings?.toleransiSiswa ?? 15

        const nowMinutes = getMinutesSinceMidnightInSchoolTime(now)
        const limitMasukMinutes = timeStringToMinutes(jamMasukStr) + toleransi
        const limitPulangMinutes = timeStringToMinutes(jamPulangStr)

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
          const isLate = nowMinutes > limitMasukMinutes
          const status = isLate ? "terlambat" : "hadir"

          // Defensive re-check to prevent race condition duplicates
          const recheckAbsen = await db.query.absensiSiswa.findFirst({
            where: and(eq(absensiSiswa.siswaId, student.id), between(absensiSiswa.tanggal, startOfToday, endOfToday)),
          })
          if (recheckAbsen) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Absensi sudah dicatat. Silakan refresh halaman." })
          }

          const [created] = await db
            .insert(absensiSiswa)
            .values({
              id: crypto.randomUUID(),
              sekolahId,
              siswaId: student.id,
              kelasId: student.kelasId,
              tanggal: schoolToday,
              status,
              jamMasuk: now,
              keterangan: input.alasan ?? null,
            })
            .returning()

          await logAudit(ctx, { action: "scan_checkin_siswa", entity: "absensi_siswa", entityId: created.id, metadata: { name: student.namaLengkap } })

          if (isLate && !input.alasan) {
            return {
              success: true,
              requireReason: true,
              type: "siswa" as const,
              name: student.namaLengkap,
              action: "masuk" as const,
              status,
            }
          }

          return { success: true, type: "siswa" as const, name: student.namaLengkap, action: "masuk" as const, status }
        } else {
          // Check if updating reason for existing late check-in
          if (input.alasan && existingAbsen.status === "terlambat") {
            const [updated] = await db
              .update(absensiSiswa)
              .set({ keterangan: input.alasan })
              .where(eq(absensiSiswa.id, existingAbsen.id))
              .returning()

            await logAudit(ctx, { action: "update_reason_siswa", entity: "absensi_siswa", entityId: updated.id, metadata: { name: student.namaLengkap } })
            return { success: true, type: "siswa" as const, name: student.namaLengkap, action: "masuk" as const, status: "terlambat" as const }
          }

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
            if (nowMinutes < limitPulangMinutes) {
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
        const todayDay = days[schoolToday.getUTCDay()]

        // Get schedules for this teacher today
        const schedules = await db.query.jadwalPelajaran.findMany({
          where: and(eq(jadwalPelajaran.guruId, teacher.id), eq(jadwalPelajaran.hari, todayDay as any)),
        })

        const existingAbsen = await db.query.absensiGuru.findFirst({
          where: and(eq(absensiGuru.guruId, teacher.id), between(absensiGuru.tanggal, startOfToday, endOfToday)),
        })

        const settings = await db.query.pengaturanAbsensi.findFirst({
          where: eq(pengaturanAbsensi.sekolahId, sekolahId),
        })

        const jamMasukStr = settings?.jamMasuk || "07:00"
        const jamPulangStr = settings?.jamPulang || "14:00"
        const toleransiMin = settings?.toleransi || 15
        const aturanGuru = settings?.aturanGuru || "per_jp"

        if (aturanGuru === "per_jp" && schedules.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Presensi ditolak karena guru bersangkutan tidak memiliki jadwal mengajar (JP) hari ini.",
          })
        }

        // Has schedule or rule is 'umum', find bounds
        let earliestMasukMinutes: number | null = null
        let latestPulangMinutes: number | null = null

        if (aturanGuru === "per_jp") {
          for (const s of schedules) {
            const mMulai = getMinutesSinceMidnightOfSchedule(s.jamMulai)
            if (mMulai !== null) {
              if (earliestMasukMinutes === null || mMulai < earliestMasukMinutes) {
                earliestMasukMinutes = mMulai
              }
            }
            const mSelesai = getMinutesSinceMidnightOfSchedule(s.jamSelesai)
            if (mSelesai !== null) {
              if (latestPulangMinutes === null || mSelesai > latestPulangMinutes) {
                latestPulangMinutes = mSelesai
              }
            }
          }
        }

        const nowMinutes = getMinutesSinceMidnightInSchoolTime(now)

        let limitMasukMinutes = earliestMasukMinutes !== null 
          ? earliestMasukMinutes + toleransiMin
          : timeStringToMinutes(jamMasukStr) + toleransiMin

        let limitPulangMinutes = latestPulangMinutes !== null
          ? latestPulangMinutes
          : timeStringToMinutes(jamPulangStr)

        if (!existingAbsen) {
          // Check-in (Masuk)
          const isLate = nowMinutes > limitMasukMinutes
          const status = isLate ? "terlambat" : "hadir"

          const [created] = await db
            .insert(absensiGuru)
            .values({
              id: crypto.randomUUID(),
              sekolahId,
              guruId: teacher.id,
              tanggal: schoolToday,
              status,
              jamMasuk: now,
              keterangan: input.alasan ?? null,
            })
            .returning()

          await logAudit(ctx, { action: "scan_checkin_guru", entity: "absensi_guru", entityId: created.id, metadata: { name: teacher.namaLengkap } })

          if (isLate && !input.alasan) {
            return {
              success: true,
              requireReason: true,
              type: "guru" as const,
              name: teacher.namaLengkap,
              action: "masuk" as const,
              status,
            }
          }

          return { success: true, type: "guru" as const, name: teacher.namaLengkap, action: "masuk" as const, status }
        } else {
          // Check if updating reason for existing late check-in
          if (input.alasan && existingAbsen.status === "terlambat") {
            const [updated] = await db
              .update(absensiGuru)
              .set({ keterangan: input.alasan })
              .where(eq(absensiGuru.id, existingAbsen.id))
              .returning()

            await logAudit(ctx, { action: "update_reason_guru", entity: "absensi_guru", entityId: updated.id, metadata: { name: teacher.namaLengkap } })
            return { success: true, type: "guru" as const, name: teacher.namaLengkap, action: "masuk" as const, status: "terlambat" as const }
          }

          // Check-out (Pulang)
          if (existingAbsen.jamPulang) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Guru sudah melakukan absensi pulang hari ini" })
          }

          if (nowMinutes < limitPulangMinutes) {
            const targetHour = Math.floor(limitPulangMinutes / 60)
            const targetMin = limitPulangMinutes % 60
            const targetTimeStr = `${targetHour.toString().padStart(2, "0")}:${targetMin.toString().padStart(2, "0")}`
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

  getGuruAbsensi: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu", "yayasan", "guru"])
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
        const start = getSchoolDayDate(new Date(input.tanggal))
        const end = getSchoolDayDate(new Date(input.tanggal))
        end.setUTCHours(23, 59, 59, 999)
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
      sanitized(z.object({
        id: z.string().optional(),
        guruId: z.string(),
        tanggal: z.coerce.date(),
        status: z.enum(["hadir", "izin", "sakit", "alpha", "terlambat"]),
        jamMasuk: z.coerce.date().nullable().optional(),
        jamPulang: z.coerce.date().nullable().optional(),
        keterangan: z.string().nullable().optional(),
      })),
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

  getRekapSiswa: protectedProcedure
    .input(
      z.object({
        kelasId: z.string().optional(),
        siswaId: z.string().optional(),
        tanggalMulai: z.coerce.date(),
        tanggalSelesai: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const start = getSchoolDayDate(new Date(input.tanggalMulai))
      const end = getSchoolDayDate(new Date(input.tanggalSelesai))
      end.setUTCHours(23, 59, 59, 999)

      const siswaConditions = [eq(siswa.sekolahId, sekolahId)]
      if (input.kelasId && input.kelasId !== "all") {
        siswaConditions.push(eq(siswa.kelasId, input.kelasId))
      }
      if (input.siswaId && input.siswaId !== "all") {
        siswaConditions.push(eq(siswa.id, input.siswaId))
      }

      const students = await db.query.siswa.findMany({
        where: and(...siswaConditions),
        with: {
          kelas: true,
        },
        orderBy: [asc(siswa.namaLengkap)],
      })

      const attendanceConditions = [
        eq(absensiSiswa.sekolahId, sekolahId),
        between(absensiSiswa.tanggal, start, end),
      ]
      if (input.kelasId && input.kelasId !== "all") {
        attendanceConditions.push(eq(absensiSiswa.kelasId, input.kelasId))
      }
      if (input.siswaId && input.siswaId !== "all") {
        attendanceConditions.push(eq(absensiSiswa.siswaId, input.siswaId))
      }

      const attendanceLogs = await db.query.absensiSiswa.findMany({
        where: and(...attendanceConditions),
        orderBy: [desc(absensiSiswa.tanggal)],
      })

      const studentMap = new Map<string, {
        siswaId: string
        namaLengkap: string
        nisn: string | null
        nisLokal: string | null
        kelasNama: string
        totalHari: number
        hadirCount: number
        terlambatCount: number
        izinCount: number
        sakitCount: number
        alphaCount: number
        persentaseHadir: number
      }>()

      for (const s of students) {
        studentMap.set(s.id, {
          siswaId: s.id,
          namaLengkap: s.namaLengkap,
          nisn: s.nisn,
          nisLokal: s.nisLokal,
          kelasNama: s.kelas?.namaKelas || "-",
          totalHari: 0,
          hadirCount: 0,
          terlambatCount: 0,
          izinCount: 0,
          sakitCount: 0,
          alphaCount: 0,
          persentaseHadir: 0,
        })
      }

      for (const log of attendanceLogs) {
        const item = studentMap.get(log.siswaId)
        if (item) {
          item.totalHari++
          if (log.status === "hadir") item.hadirCount++
          else if (log.status === "terlambat") item.terlambatCount++
          else if (log.status === "izin") item.izinCount++
          else if (log.status === "sakit") item.sakitCount++
          else if (log.status === "alpha") item.alphaCount++
        }
      }

      const summaryList = Array.from(studentMap.values()).map((item) => {
        const effectiveHadir = item.hadirCount + item.terlambatCount
        const persentase = item.totalHari > 0 ? Math.round((effectiveHadir / item.totalHari) * 100) : 0
        return {
          ...item,
          persentaseHadir: persentase,
        }
      })

      return {
        summary: summaryList,
        logs: attendanceLogs,
      }
    }),

  getRekapGuru: protectedProcedure
    .input(
      z.object({
        guruId: z.string().optional(),
        tanggalMulai: z.coerce.date(),
        tanggalSelesai: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const start = getSchoolDayDate(new Date(input.tanggalMulai))
      const end = getSchoolDayDate(new Date(input.tanggalSelesai))
      end.setUTCHours(23, 59, 59, 999)

      const guruConditions = [eq(guru.sekolahId, sekolahId)]
      if (input.guruId && input.guruId !== "all") {
        guruConditions.push(eq(guru.id, input.guruId))
      }

      const teachers = await db.query.guru.findMany({
        where: and(...guruConditions),
        orderBy: [asc(guru.namaLengkap)],
      })

      const attendanceConditions = [
        eq(absensiGuru.sekolahId, sekolahId),
        between(absensiGuru.tanggal, start, end),
      ]
      if (input.guruId && input.guruId !== "all") {
        attendanceConditions.push(eq(absensiGuru.guruId, input.guruId))
      }

      const attendanceLogs = await db.query.absensiGuru.findMany({
        where: and(...attendanceConditions),
        orderBy: [desc(absensiGuru.tanggal)],
      })

      const teacherMap = new Map<string, {
        guruId: string
        namaLengkap: string
        nipnuptk: string | null
        totalHari: number
        hadirCount: number
        terlambatCount: number
        izinCount: number
        sakitCount: number
        alphaCount: number
        persentaseHadir: number
      }>()

      for (const g of teachers) {
        teacherMap.set(g.id, {
          guruId: g.id,
          namaLengkap: g.namaLengkap,
          nipnuptk: g.nipnuptk,
          totalHari: 0,
          hadirCount: 0,
          terlambatCount: 0,
          izinCount: 0,
          sakitCount: 0,
          alphaCount: 0,
          persentaseHadir: 0,
        })
      }

      for (const log of attendanceLogs) {
        const item = teacherMap.get(log.guruId)
        if (item) {
          item.totalHari++
          if (log.status === "hadir") item.hadirCount++
          else if (log.status === "terlambat") item.terlambatCount++
          else if (log.status === "izin") item.izinCount++
          else if (log.status === "sakit") item.sakitCount++
          else if (log.status === "alpha") item.alphaCount++
        }
      }

      const summaryList = Array.from(teacherMap.values()).map((item) => {
        const effectiveHadir = item.hadirCount + item.terlambatCount
        const persentase = item.totalHari > 0 ? Math.round((effectiveHadir / item.totalHari) * 100) : 0
        return {
          ...item,
          persentaseHadir: persentase,
        }
      })

      return {
        summary: summaryList,
        logs: attendanceLogs,
      }
    }),

  getStaticQrGuru: protectedProcedure
    .query(async ({ ctx }) => {
      const sekolahId = getSekolahIdFilter(ctx) || ctx.session.user.sekolahId
      if (!sekolahId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID tidak ditemukan" })
      }

      const schoolRecord = await db.query.sekolah.findFirst({
        where: eq(sekolah.id, sekolahId),
      })
      const settings = await db.query.pengaturanAbsensi.findFirst({
        where: eq(pengaturanAbsensi.sekolahId, sekolahId),
      })

      const qrCodeValue = `PGS-PRESENSI-GURU-${sekolahId}`

      let jamMasuk = settings?.jamMasuk || "07:00"
      let jamPulang = settings?.jamPulang || "14:00"
      const toleransi = settings?.toleransi || 15

      const aturanGuru = settings?.aturanGuru || "per_jp"

      // Check if user is a Guru and load their schedule for today (only if aturanGuru is per_jp)
      const userRole = ctx.session.user.role
      const userEmail = ctx.session.user.email
      if (userRole === "guru" && userEmail && aturanGuru === "per_jp") {
        const teacher = await db.query.guru.findFirst({
          where: and(
            eq(guru.sekolahId, sekolahId),
            or(
              eq(guru.email, userEmail),
              eq(guru.usernameGuru, userEmail),
              eq(guru.nipnuptk, userEmail)
            )
          ),
        })

        if (teacher) {
          const daysOfWeek = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
          const now = new Date()
          const schoolToday = getSchoolDayDate(now)
          const todayDay = daysOfWeek[schoolToday.getUTCDay()]

          const schedules = await db.query.jadwalPelajaran.findMany({
            where: and(
              eq(jadwalPelajaran.guruId, teacher.id),
              eq(jadwalPelajaran.hari, todayDay as any)
            ),
          })

          if (schedules.length > 0) {
            let earliestMasukMinutes: number | null = null
            let latestPulangMinutes: number | null = null

            for (const s of schedules) {
              const mMulai = getMinutesSinceMidnightOfSchedule(s.jamMulai)
              if (mMulai !== null) {
                if (earliestMasukMinutes === null || mMulai < earliestMasukMinutes) {
                  earliestMasukMinutes = mMulai
                }
              }
              const mSelesai = getMinutesSinceMidnightOfSchedule(s.jamSelesai)
              if (mSelesai !== null) {
                if (latestPulangMinutes === null || mSelesai > latestPulangMinutes) {
                  latestPulangMinutes = mSelesai
                }
              }
            }

            if (earliestMasukMinutes !== null) {
              const hour = Math.floor(earliestMasukMinutes / 60)
              const min = earliestMasukMinutes % 60
              jamMasuk = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
            }
            if (latestPulangMinutes !== null) {
              const hour = Math.floor(latestPulangMinutes / 60)
              const min = latestPulangMinutes % 60
              jamPulang = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
            }
          }
        }
      }

      return {
        qrCodeValue,
        sekolahNama: schoolRecord?.namaSekolah || "Sekolah",
        jamMasuk,
        jamPulang,
        toleransi,
      }
    }),

  scanSingleQrGuru: protectedProcedure
    .input(
      z.object({
        qrCode: z.string(),
        targetGuruId: z.string().optional(),
        alasan: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = getSekolahIdFilter(ctx) || ctx.session.user.sekolahId
      if (!sekolahId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID tidak ditemukan" })
      }

      if (!input.qrCode.startsWith("PGS-PRESENSI-GURU-")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "QR Code tidak valid untuk Presensi Guru Sekolah." })
      }

      const qrSekolahId = input.qrCode.replace("PGS-PRESENSI-GURU-", "")
      if (qrSekolahId !== sekolahId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "QR Code ini milik sekolah lain." })
      }

      let teacherId = input.targetGuruId
      if (!teacherId) {
        const userEmail = ctx.session.user.email
        if (userEmail) {
          const gRecord = await db.query.guru.findFirst({
            where: and(
              eq(guru.sekolahId, sekolahId),
              or(
                eq(guru.email, userEmail),
                eq(guru.usernameGuru, userEmail),
                eq(guru.nipnuptk, userEmail),
                eq(guru.id, userEmail)
              )
            ),
          })
          if (gRecord) teacherId = gRecord.id
        }
      }

      if (!teacherId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Data akun Guru Anda tidak ditemukan di sistem sekolah ini." })
      }

      const teacherRecord = await db.query.guru.findFirst({
        where: eq(guru.id, teacherId),
      })
      if (!teacherRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan." })
      }

      const now = new Date()
      const schoolToday = getSchoolDayDate(now)
      const startOfToday = new Date(schoolToday)
      const endOfToday = new Date(schoolToday)
      endOfToday.setUTCHours(23, 59, 59, 999)

      const existingAbsen = await db.query.absensiGuru.findFirst({
        where: and(eq(absensiGuru.guruId, teacherId), between(absensiGuru.tanggal, startOfToday, endOfToday)),
      })

      // Get teacher schedule for today to determine jamMasuk and jamPulang bounds
      const daysOfWeek = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
      const todayDay = daysOfWeek[schoolToday.getUTCDay()]

      const schedules = await db.query.jadwalPelajaran.findMany({
        where: and(
          eq(jadwalPelajaran.guruId, teacherId),
          eq(jadwalPelajaran.hari, todayDay as any)
        ),
      })

      const settings = await db.query.pengaturanAbsensi.findFirst({
        where: eq(pengaturanAbsensi.sekolahId, sekolahId),
      })

      const jamMasukStr = settings?.jamMasuk || "07:00"
      const jamPulangStr = settings?.jamPulang || "14:00"
      const toleransiMin = settings?.toleransi || 15
      const aturanGuru = settings?.aturanGuru || "per_jp"

      let earliestMasukMinutes: number | null = null
      let latestPulangMinutes: number | null = null

      if (aturanGuru === "per_jp") {
        for (const s of schedules) {
          const mMulai = getMinutesSinceMidnightOfSchedule(s.jamMulai)
          if (mMulai !== null) {
            if (earliestMasukMinutes === null || mMulai < earliestMasukMinutes) {
              earliestMasukMinutes = mMulai
            }
          }
          const mSelesai = getMinutesSinceMidnightOfSchedule(s.jamSelesai)
          if (mSelesai !== null) {
            if (latestPulangMinutes === null || mSelesai > latestPulangMinutes) {
              latestPulangMinutes = mSelesai
            }
          }
        }
      }

      if (aturanGuru === "per_jp" && earliestMasukMinutes === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Presensi ditolak karena Anda tidak memiliki jadwal mengajar (JP) hari ini.",
        })
      }

      const nowMinutes = getMinutesSinceMidnightInSchoolTime(now)

      const limitTimeMinutes = earliestMasukMinutes !== null
        ? earliestMasukMinutes + toleransiMin
        : timeStringToMinutes(jamMasukStr) + toleransiMin

      const checkoutLimitMinutes = latestPulangMinutes !== null
        ? latestPulangMinutes
        : timeStringToMinutes(jamPulangStr)

      if (!existingAbsen) {
        const status = nowMinutes > limitTimeMinutes ? "terlambat" : "hadir"

        // Defensive re-check to prevent race condition duplicates
        const recheckAbsen = await db.query.absensiGuru.findFirst({
          where: and(eq(absensiGuru.guruId, teacherId), between(absensiGuru.tanggal, startOfToday, endOfToday)),
        })
        if (recheckAbsen) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Presensi sudah dicatat. Silakan refresh halaman." })
        }

        const [created] = await db
          .insert(absensiGuru)
          .values({
            id: crypto.randomUUID(),
            sekolahId,
            guruId: teacherId,
            tanggal: schoolToday,
            status,
            jamMasuk: now,
            keterangan: input.alasan ?? null,
          })
          .returning()

        await logAudit(ctx, {
          action: "scan_single_qr_guru_masuk",
          entity: "absensi_guru",
          entityId: created.id,
          metadata: { name: teacherRecord.namaLengkap, status },
        })

        if (status === "terlambat" && !input.alasan) {
          return {
            success: true,
            requireReason: true,
            type: "guru" as const,
            name: teacherRecord.namaLengkap,
            action: "masuk" as const,
            status,
          }
        }

        return {
          success: true,
          action: "masuk",
          name: teacherRecord.namaLengkap,
          status,
          time: now,
        }
      } else {
        // Check if updating reason for existing late check-in
        if (input.alasan && existingAbsen.status === "terlambat") {
          await db
            .update(absensiGuru)
            .set({ keterangan: input.alasan })
            .where(eq(absensiGuru.id, existingAbsen.id))

          await logAudit(ctx, {
            action: "update_reason_single_qr_guru",
            entity: "absensi_guru",
            entityId: existingAbsen.id,
            metadata: { name: teacherRecord.namaLengkap },
          })

          return {
            success: true,
            action: "masuk",
            name: teacherRecord.namaLengkap,
            status: "terlambat",
            time: now,
          }
        }

        if (existingAbsen.jamPulang) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Guru ${teacherRecord.namaLengkap} sudah melakukan presensi masuk dan pulang hari ini.`,
          })
        }

        if (nowMinutes < checkoutLimitMinutes) {
          const targetHour = Math.floor(checkoutLimitMinutes / 60)
          const targetMin = checkoutLimitMinutes % 60
          const targetTimeStr = `${targetHour.toString().padStart(2, "0")}:${targetMin.toString().padStart(2, "0")}`
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Presensi pulang dikunci hingga jam mengajar terakhir selesai pada pukul ${targetTimeStr} WIB.`,
          })
        }

        await db
          .update(absensiGuru)
          .set({ jamPulang: now })
          .where(eq(absensiGuru.id, existingAbsen.id))

        await logAudit(ctx, {
          action: "scan_single_qr_guru_pulang",
          entity: "absensi_guru",
          entityId: existingAbsen.id,
          metadata: { name: teacherRecord.namaLengkap },
        })

        return {
          success: true,
          action: "pulang",
          name: teacherRecord.namaLengkap,
          status: existingAbsen.status,
          time: now,
        }
      }
    }),
})
