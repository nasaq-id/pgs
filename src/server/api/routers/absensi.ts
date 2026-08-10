import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, between, or, asc, lte, gte, isNull } from "drizzle-orm"
import { db } from "@/server/db"
import { absensiSiswa, absensiGuru, pengaturanAbsensi, siswa, guru, kelas, jadwalPelajaran, pengajuanIzin, sekolah, kalenderEvent, pengaturanKalender, absensiHari } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"
import { getSchoolDayDate, getMinutesSinceMidnightInSchoolTime, getHariEfektif } from "@/server/datetime"

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

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}

function getMinutesSinceMidnightOfSchedule(date: Date | null | undefined): number | null {
  if (!date) return null
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

function formatSchoolTime(date: Date | null | undefined): string | null {
  if (!date) return null
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return formatter.format(date)
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

/**
 * Catat bahwa hari presensi benar-benar dioperasikan (sesi absensi dijalankan).
 * Sumber kebenaran "hari beroperasi" untuk perhitungan alfa implisit.
 * Izin otomatis TIDAK memanggil helper ini — hari yang hanya berisi record
 * izin/sakit tidak pernah menjadi hari operasional.
 */
async function ensureHariAbsensi(
  sekolahId: string,
  jenis: "siswa" | "guru",
  tanggal: Date,
  kelasId?: string | null
): Promise<void> {
  const schoolDay = getSchoolDayDate(new Date(tanggal))
  await db
    .insert(absensiHari)
    .values({
      id: crypto.randomUUID(),
      sekolahId,
      jenis,
      kelasId: kelasId ?? null,
      tanggal: schoolDay,
    })
    .onConflictDoNothing()
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
        tanggal: getSchoolDayDate(new Date(a.tanggal)),
      }))

      const result = await db.transaction(async (tx) => {
        // Mencegah duplikasi data: hapus record lama siswa & tanggal terkait sebelum menulis data baru
        for (const a of values) {
          const startOfDay = new Date(a.tanggal)
          startOfDay.setUTCHours(0, 0, 0, 0)
          const endOfDay = new Date(a.tanggal)
          endOfDay.setUTCHours(23, 59, 59, 999)

          await tx.delete(absensiSiswa).where(
            and(
              eq(absensiSiswa.siswaId, a.siswaId),
              between(absensiSiswa.tanggal, startOfDay, endOfDay)
            )
          )
        }
        return tx.insert(absensiSiswa).values(values as any).returning()
      })

      await logAudit(ctx, { action: "bulk_create", entity: "absensi_siswa", metadata: { count: result.length } })

      const hariKeys = new Set<string>()
      for (const a of values) {
        const key = `${a.kelasId}|${a.tanggal.toISOString()}`
        if (hariKeys.has(key)) continue
        hariKeys.add(key)
        await ensureHariAbsensi(sekolahId, "siswa", a.tanggal, a.kelasId)
      }

      return result
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru", "tu"])
    .input(sanitized(absensiUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const existing = await db.query.absensiSiswa.findFirst({
        where: eq(absensiSiswa.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Data absensi tidak ditemukan" })
      if (existing.kelas?.sekolahId !== sekolahId) {
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

  togglePulangCepatDarurat: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ aktif: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "FORBIDDEN", message: "Sekolah tidak ditemukan" })

      const existing = await db.query.pengaturanAbsensi.findFirst({
        where: eq(pengaturanAbsensi.sekolahId, sekolahId),
      })

      if (existing) {
        await db
          .update(pengaturanAbsensi)
          .set({ isPulangCepatDarurat: input.aktif, updatedAt: new Date() })
          .where(eq(pengaturanAbsensi.sekolahId, sekolahId))
      } else {
        await db.insert(pengaturanAbsensi).values({
          id: crypto.randomUUID(),
          sekolahId,
          isPulangCepatDarurat: input.aktif,
        })
      }

      await logAudit(ctx, {
        action: input.aktif ? "aktifkan_pulang_cepat_darurat" : "nonaktifkan_pulang_cepat_darurat",
        entity: "pengaturan_absensi",
        metadata: { aktif: input.aktif },
      })

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

        // Guru dapat memindai QR siswa seperti admin (semua kelas di sekolahnya).
        // Isolasi multi-tenant tetap dijaga via `sekolahId` di atas.

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

          // Keterlambatan tanpa alasan: jangan buat record dulu — tunggu alasan
          // dikirim. Ini mencegah record "nyangkut" (jam masuk terisi, jam pulang
          // kosong) yang membuat scan berikutnya diterjemahkan sebagai checkout
          // ("belum waktunya pulang") padahal siswa baru mau absen masuk.
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

          await ensureHariAbsensi(sekolahId, "siswa", schoolToday, student.kelasId)

          await logAudit(ctx, { action: "scan_checkin_siswa", entity: "absensi_siswa", entityId: created.id, metadata: { name: student.namaLengkap } })

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
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${student.namaLengkap} sudah tercatat masuk pukul ${formatSchoolTime(existingAbsen.jamMasuk) ?? "-"} dan pulang pukul ${formatSchoolTime(existingAbsen.jamPulang) ?? "-"} hari ini.`,
            })
          }

          // Record yang dibuat manual (pre-fill admin/guru) tanpa jam masuk:
          // scan berikutnya diperlakukan sebagai check-in, bukan checkout.
          if (!existingAbsen.jamMasuk) {
            const isLate = nowMinutes > limitMasukMinutes
            const status = isLate ? "terlambat" : "hadir"

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

            const [updated] = await db
              .update(absensiSiswa)
              .set({
                status,
                jamMasuk: now,
                keterangan: input.alasan ?? existingAbsen.keterangan,
              })
              .where(eq(absensiSiswa.id, existingAbsen.id))
              .returning()

            await logAudit(ctx, { action: "scan_checkin_siswa", entity: "absensi_siswa", entityId: updated.id, metadata: { name: student.namaLengkap } })
            return { success: true, type: "siswa" as const, name: student.namaLengkap, action: "masuk" as const, status }
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

          const isPulangCepatDaruratAktif = settings?.isPulangCepatDarurat ?? false

          if (!approvedIzinPulangCepat && !isPulangCepatDaruratAktif) {
            if (nowMinutes < limitPulangMinutes) {
              if (!input.alasan) {
                return {
                  success: true,
                  requireReason: true,
                  type: "siswa" as const,
                  name: student.namaLengkap,
                  action: "pulang" as const,
                  status: existingAbsen.status,
                  jamMasuk: formatSchoolTime(existingAbsen.jamMasuk),
                }
              }
            }
          }

          let keteranganValue = existingAbsen.keterangan
          if (input.alasan) {
            keteranganValue = existingAbsen.keterangan
              ? `${existingAbsen.keterangan} | [PULANG CEPAT] ${input.alasan}`
              : `[PULANG CEPAT] ${input.alasan}`
          } else if (isPulangCepatDaruratAktif) {
            keteranganValue = existingAbsen.keterangan
              ? `${existingAbsen.keterangan} | [PULANG CEPAT DARURAT MASAL]`
              : `[PULANG CEPAT DARURAT MASAL]`
          }

          await db
            .update(absensiSiswa)
            .set({ 
              jamPulang: now,
              keterangan: keteranganValue,
            })
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

        const limitMasukMinutes = earliestMasukMinutes !== null
          ? earliestMasukMinutes + toleransiMin
          : timeStringToMinutes(jamMasukStr) + toleransiMin

        const limitPulangMinutes = latestPulangMinutes !== null
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

          await ensureHariAbsensi(sekolahId, "guru", schoolToday)

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

          const isPulangCepatDaruratAktif = settings?.isPulangCepatDarurat ?? false

          if (!isPulangCepatDaruratAktif) {
            if (nowMinutes < limitPulangMinutes) {
              if (!input.alasan) {
                return {
                  success: true,
                  requireReason: true,
                  type: "guru" as const,
                  name: teacher.namaLengkap,
                  action: "pulang" as const,
                  status: existingAbsen.status,
                }
              }
            }
          }

          let keteranganValue = existingAbsen.keterangan
          if (input.alasan) {
            keteranganValue = existingAbsen.keterangan
              ? `${existingAbsen.keterangan} | [PULANG CEPAT] ${input.alasan}`
              : `[PULANG CEPAT] ${input.alasan}`
          } else if (isPulangCepatDaruratAktif) {
            keteranganValue = existingAbsen.keterangan
              ? `${existingAbsen.keterangan} | [PULANG CEPAT DARURAT MASAL]`
              : `[PULANG CEPAT DARURAT MASAL]`
          }

          await db
            .update(absensiGuru)
            .set({ 
              jamPulang: now,
              keterangan: keteranganValue,
            })
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
            tanggal: getSchoolDayDate(new Date(input.tanggal)),
            status: input.status,
            jamMasuk: input.jamMasuk,
            jamPulang: input.jamPulang,
            keterangan: input.keterangan,
          })
          .returning()
        await ensureHariAbsensi(sekolahId, "guru", input.tanggal)
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

      // Fetch dynamic effective days
      const { count: hariEfektifCount, dates: hariEfektifDates } = await getHariEfektif(sekolahId, start, end, "siswa")
      const hariEfektifSet = new Set(hariEfektifDates)

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
        kelasId: string | null
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
          kelasId: s.kelasId,
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
        const dateKey = log.tanggal.toISOString().split("T")[0]
        if (!hariEfektifSet.has(dateKey)) continue

        const item = studentMap.get(log.siswaId)
        if (item) {
          if (log.status === "hadir") item.hadirCount++
          else if (log.status === "terlambat") item.terlambatCount++
          else if (log.status === "izin") item.izinCount++
          else if (log.status === "sakit") item.sakitCount++
          else if (log.status === "alpha") item.alphaCount++
        }
      }

      // Hari operasional per kelas: sesi absensi yang benar-benar dijalankan di sistem.
      // Hari ini dikecualikan kecuali jika waktu operasional sekolah (jam pulang) sudah selesai.
      const todayKey = getSchoolDayDate(new Date()).toISOString().split("T")[0]
      const settings = await db.query.pengaturanAbsensi.findFirst({
        where: eq(pengaturanAbsensi.sekolahId, sekolahId),
      })
      const jamPulangStr = settings?.jamPulangSiswa ?? "14:00"
      const limitPulangMinutes = timeStringToMinutes(jamPulangStr)
      const nowMinutes = getMinutesSinceMidnightInSchoolTime(new Date())

      const sessionRows = await db
        .select({ kelasId: absensiHari.kelasId, tanggal: absensiHari.tanggal })
        .from(absensiHari)
        .where(
          and(
            eq(absensiHari.sekolahId, sekolahId),
            eq(absensiHari.jenis, "siswa"),
            between(absensiHari.tanggal, start, end)
          )
        )
      const classOperatedDays = new Map<string, Set<string>>()
      for (const row of sessionRows) {
        if (!row.kelasId) continue
        const dateKey = row.tanggal.toISOString().split("T")[0]
        if (!hariEfektifSet.has(dateKey)) continue

        // Pengecualian dinamis untuk hari ini:
        if (dateKey > todayKey) continue
        if (dateKey === todayKey && nowMinutes < limitPulangMinutes) continue

        let set = classOperatedDays.get(row.kelasId)
        if (!set) {
          set = new Set<string>()
          classOperatedDays.set(row.kelasId, set)
        }
        set.add(dateKey)
      }

      const summaryList = Array.from(studentMap.values()).map((item) => {
        const loggedDays = item.hadirCount + item.terlambatCount + item.izinCount + item.sakitCount + item.alphaCount
        // Alfa implisit: hari operasional kelas tanpa record apa pun (tidak hadir & tidak ada izin/sakit disetujui)
        const operatedDays = item.kelasId ? (classOperatedDays.get(item.kelasId)?.size ?? 0) : 0
        const alphaCount = item.alphaCount + Math.max(0, operatedDays - (item.hadirCount + item.terlambatCount + item.izinCount + item.sakitCount + item.alphaCount))
        // Pendekatan A: (Hadir + Terlambat) / Hari Efektif
        const effectiveHadir = item.hadirCount + item.terlambatCount
        const persentase = hariEfektifCount > 0 ? Math.round((effectiveHadir / hariEfektifCount) * 100) : 0
        return {
          ...item,
          alphaCount,
          hariEfektif: hariEfektifCount,
          hariTercatat: loggedDays,
          persentaseHadir: persentase,
        }
      })

      // Info hari efektif untuk tampilan rekap (dinamis, bukan hardcoded)
      const hariEfektifPertama = hariEfektifDates[0] ?? null
      const hariEfektifAwalLibur: string[] = []
      if (hariEfektifPertama) {
        const cur = new Date(start)
        while (cur.toISOString().split("T")[0] < hariEfektifPertama) {
          hariEfektifAwalLibur.push(cur.toISOString().split("T")[0])
          cur.setUTCDate(cur.getUTCDate() + 1)
        }
      }

      return {
        summary: summaryList,
        logs: attendanceLogs.filter(log => hariEfektifSet.has(log.tanggal.toISOString().split("T")[0])),
        hariEfektif: hariEfektifCount,
        hariEfektifPertama,
        hariEfektifAwalLibur,
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

      // 1. Fetch settings to determine Jam Kerja vs Jam Pelajaran (JP) rule
      const settings = await db.query.pengaturanAbsensi.findFirst({
        where: eq(pengaturanAbsensi.sekolahId, sekolahId),
      })
      const isPerJP = settings?.aturanGuru === "per_jp"

      // Weekly holidays for guru Jam Kerja mode (setting khusus guru di Kalender Akademik)
      const kaldikSetting = await db.query.pengaturanKalender.findFirst({
        where: eq(pengaturanKalender.sekolahId, sekolahId),
      })
      let weeklyHolidays: string[] = ["sabtu", "minggu"]
      if (kaldikSetting?.hariLiburMingguanGuru) {
        try {
          weeklyHolidays = JSON.parse(kaldikSetting.hariLiburMingguanGuru)
        } catch (e) {
          console.error("Failed to parse guru weekly holidays:", e)
        }
      }
      weeklyHolidays = weeklyHolidays.map((d) => d.toLowerCase())

      // 2. Fetch all calendar events representing school/national holidays
      const holidays = await db.query.kalenderEvent.findMany({
        where: and(
          eq(kalenderEvent.sekolahId, sekolahId),
          or(
            eq(kalenderEvent.tipe, "libur"),
            eq(kalenderEvent.isLiburNasional, true)
          ),
          lte(kalenderEvent.tanggalMulai, end),
          or(
            gte(kalenderEvent.tanggalSelesai, start),
            isNull(kalenderEvent.tanggalSelesai)
          )
        )
      })

      const calendarHolidays = new Set<string>()
      for (const h of holidays) {
        const s = getSchoolDayDate(h.tanggalMulai)
        const e = h.tanggalSelesai ? getSchoolDayDate(h.tanggalSelesai) : s
        const curr = new Date(s)
        while (curr <= e) {
          calendarHolidays.add(curr.toISOString().split("T")[0])
          curr.setUTCDate(curr.getUTCDate() + 1)
        }
      }

      // 3. Pre-generate list of calendar days in range
      const DAYS_OF_WEEK = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
      const calendarDays: { dateStr: string; dayName: string }[] = []
      const currDate = new Date(start)
      while (currDate <= end) {
        const dayOfWeek = currDate.getUTCDay()
        const dayName = DAYS_OF_WEEK[dayOfWeek]
        const dateStr = currDate.toISOString().split("T")[0]
        calendarDays.push({ dateStr, dayName })
        currDate.setUTCDate(currDate.getUTCDate() + 1)
      }

      // 4. Fetch teachers
      const guruConditions = [eq(guru.sekolahId, sekolahId)]
      if (input.guruId && input.guruId !== "all") {
        guruConditions.push(eq(guru.id, input.guruId))
      }

      const teachers = await db.query.guru.findMany({
        where: and(...guruConditions),
        orderBy: [asc(guru.namaLengkap)],
      })

      // 5. Fetch lesson schedules if under per_jp rule
      const schedules = isPerJP
        ? await db.query.jadwalPelajaran.findMany({
            where: eq(jadwalPelajaran.sekolahId, sekolahId),
          })
        : []

      const teacherDaysMap = new Map<string, Set<string>>()
      // Map guruId -> Map<hari lowercase -> total JP terjadwal per hari>
      const teacherJpPerDayMap = new Map<string, Map<string, number>>()
      if (isPerJP) {
        for (const sched of schedules) {
          if (!sched.jpCount) continue
          const day = sched.hari.toLowerCase()

          let daySet = teacherDaysMap.get(sched.guruId)
          if (!daySet) {
            daySet = new Set<string>()
            teacherDaysMap.set(sched.guruId, daySet)
          }
          daySet.add(day)

          let jpMap = teacherJpPerDayMap.get(sched.guruId)
          if (!jpMap) {
            jpMap = new Map<string, number>()
            teacherJpPerDayMap.set(sched.guruId, jpMap)
          }
          jpMap.set(day, (jpMap.get(day) || 0) + (sched.jpCount || 0))
        }
      }

      // 6. Compute individual effective days per teacher
      const teacherEfektifSets = new Map<string, Set<string>>()
      const teacherEfektifCounts = new Map<string, number>()

      for (const g of teachers) {
        const teacherEfektifSet = new Set<string>()
        
        if (isPerJP) {
          const teachingDays = teacherDaysMap.get(g.id) || new Set<string>()
          for (const day of calendarDays) {
            const isTeachingDay = teachingDays.has(day.dayName)
            const isHoliday = calendarHolidays.has(day.dateStr)
            if (isTeachingDay && !isHoliday) {
              teacherEfektifSet.add(day.dateStr)
            }
          }
        } else {
          // jam_kerja: weekly holidays off
          for (const day of calendarDays) {
            const isWeeklyHoliday = weeklyHolidays.includes(day.dayName)
            const isHoliday = calendarHolidays.has(day.dateStr)
            if (!isWeeklyHoliday && !isHoliday) {
              teacherEfektifSet.add(day.dateStr)
            }
          }
        }

        teacherEfektifSets.set(g.id, teacherEfektifSet)
        teacherEfektifCounts.set(g.id, teacherEfektifSet.size)
      }

      // 6b. Target JP per guru (mode JP): total JP terjadwal pada hari mengajar efektif
      const teacherTargetJPMap = new Map<string, number>()
      if (isPerJP) {
        for (const [guruId, daySet] of teacherEfektifSets) {
          const jpPerDay = teacherJpPerDayMap.get(guruId)
          let total = 0
          for (const dateKey of daySet) {
            const d = new Date(dateKey + "T00:00:00Z")
            const dayName = DAYS_OF_WEEK[d.getUTCDay()]
            total += jpPerDay?.get(dayName) || 0
          }
          teacherTargetJPMap.set(guruId, total)
        }
      }

      // 7. Fetch attendance logs
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

      // Track hari yang sudah tercatat per guru (untuk alpa implisit di mode JP)
      const loggedKeysByGuru = new Map<string, Set<string>>()

      for (const log of attendanceLogs) {
        const dateKey = log.tanggal.toISOString().split("T")[0]
        const teacherEfektifSet = teacherEfektifSets.get(log.guruId)
        if (!teacherEfektifSet || !teacherEfektifSet.has(dateKey)) continue

        const item = teacherMap.get(log.guruId)
        if (!item) continue

        let loggedKeys = loggedKeysByGuru.get(log.guruId)
        if (!loggedKeys) {
          loggedKeys = new Set<string>()
          loggedKeysByGuru.set(log.guruId, loggedKeys)
        }
        loggedKeys.add(dateKey)

        if (isPerJP) {
          // Mode JP: akumulasi JP terjadwal pada hari tersebut
          const d = new Date(dateKey + "T00:00:00Z")
          const jp = teacherJpPerDayMap.get(log.guruId)?.get(DAYS_OF_WEEK[d.getUTCDay()]) || 0
          if (log.status === "hadir") item.hadirCount += jp
          else if (log.status === "terlambat") item.terlambatCount += jp
          else if (log.status === "izin") item.izinCount += jp
          else if (log.status === "sakit") item.sakitCount += jp
          else if (log.status === "alpha") item.alphaCount += jp
        } else {
          if (log.status === "hadir") item.hadirCount++
          else if (log.status === "terlambat") item.terlambatCount++
          else if (log.status === "izin") item.izinCount++
          else if (log.status === "sakit") item.sakitCount++
          else if (log.status === "alpha") item.alphaCount++
        }
      }

      // Mode JP: alpa implisit — hari mengajar efektif tanpa log presensi
      if (isPerJP) {
        for (const [guruId, daySet] of teacherEfektifSets) {
          const item = teacherMap.get(guruId)
          if (!item) continue
          const loggedKeys = loggedKeysByGuru.get(guruId)
          if (!loggedKeys) continue
          const jpPerDay = teacherJpPerDayMap.get(guruId)
          for (const dateKey of daySet) {
            if (loggedKeys.has(dateKey)) continue
            const d = new Date(dateKey + "T00:00:00Z")
            const jp = jpPerDay?.get(DAYS_OF_WEEK[d.getUTCDay()]) || 0
            item.alphaCount += jp
          }
        }
      }

      // Hari operasional guru: sesi absensi guru yang benar-benar dijalankan di sistem.
      // Hari ini (belum genap selesai) dikecualikan — alfa baru dihitung besok.
      const todayKey = getSchoolDayDate(new Date()).toISOString().split("T")[0]
      const guruSessionRows = await db
        .select({ tanggal: absensiHari.tanggal })
        .from(absensiHari)
        .where(
          and(
            eq(absensiHari.sekolahId, sekolahId),
            eq(absensiHari.jenis, "guru"),
            between(absensiHari.tanggal, start, end)
          )
        )
      const guruOperatedDates = new Set<string>()
      for (const row of guruSessionRows) {
        const dateKey = row.tanggal.toISOString().split("T")[0]
        if (dateKey >= todayKey) continue
        guruOperatedDates.add(dateKey)
      }

      const summaryList = Array.from(teacherMap.values()).map((item) => {
        const teacherEfektifCount = teacherEfektifCounts.get(item.guruId) || 0

        if (isPerJP) {
          // Pendekatan B (JP): akumulasi JP; Sakit/Izin tidak mengurangi
          const targetJP = teacherTargetJPMap.get(item.guruId) || 0
          const totalJPHadirKerja = item.hadirCount + item.terlambatCount + item.sakitCount + item.izinCount
          const jpTercatat = item.hadirCount + item.terlambatCount + item.izinCount + item.sakitCount + item.alphaCount
          const persentase = targetJP > 0 ? Math.round((totalJPHadirKerja / targetJP) * 100) : 0
          return {
            ...item,
            hariEfektif: teacherEfektifCount,
            targetJP,
            hariTercatat: jpTercatat,
            persentaseHadir: persentase,
          }
        }

        // Jam Kerja: Pendekatan B — Sakit/Izin dimaklumi (tidak mengurangi persentase)
        const loggedDays = item.hadirCount + item.terlambatCount + item.izinCount + item.sakitCount + item.alphaCount
        // Alfa implisit: hari operasional guru (sesi berjalan di sistem) tanpa record apa pun
        const teacherEfektifSet = teacherEfektifSets.get(item.guruId)
        let operatedDays = 0
        if (teacherEfektifSet) {
          for (const d of teacherEfektifSet) {
            if (guruOperatedDates.has(d)) operatedDays++
          }
        }
        const alphaCount = item.alphaCount + Math.max(0, operatedDays - (item.hadirCount + item.terlambatCount + item.izinCount + item.sakitCount + item.alphaCount))
        const effectiveHadir = item.hadirCount + item.terlambatCount + item.sakitCount + item.izinCount
        const persentase = teacherEfektifCount > 0 ? Math.round((effectiveHadir / teacherEfektifCount) * 100) : 0
        return {
          ...item,
          alphaCount,
          hariEfektif: teacherEfektifCount,
          hariTercatat: loggedDays,
          persentaseHadir: persentase,
        }
      })

      // Generate a baseline count of school days (guru weekly holidays off, minus calendar holidays) for the response metadata
      const baselineEfektifDates: string[] = []
      for (const day of calendarDays) {
        const isWeeklyHoliday = weeklyHolidays.includes(day.dayName)
        const isHoliday = calendarHolidays.has(day.dateStr)
        if (!isWeeklyHoliday && !isHoliday) {
          baselineEfektifDates.push(day.dateStr)
        }
      }

      const filteredLogs = attendanceLogs.filter(log => {
        const dateKey = log.tanggal.toISOString().split("T")[0]
        const teacherEfektifSet = teacherEfektifSets.get(log.guruId)
        return teacherEfektifSet ? teacherEfektifSet.has(dateKey) : false
      })

      // Info hari efektif untuk tampilan rekap (dinamis, bukan hardcoded)
      const hariEfektifPertama = baselineEfektifDates[0] ?? null
      const hariEfektifAwalLibur: string[] = []
      if (hariEfektifPertama) {
        const cur = new Date(start)
        while (cur.toISOString().split("T")[0] < hariEfektifPertama) {
          hariEfektifAwalLibur.push(cur.toISOString().split("T")[0])
          cur.setUTCDate(cur.getUTCDate() + 1)
        }
      }

      return {
        summary: summaryList,
        logs: filteredLogs,
        hariEfektif: baselineEfektifDates.length,
        hariEfektifPertama,
        hariEfektifAwalLibur,
        isPerJP,
      }
    }),
  getInfoHariEfektif: protectedProcedure
    .input(
      z.object({
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

      const { count, dates } = await getHariEfektif(sekolahId, start, end, "siswa")
      const hariEfektifPertama = dates[0] ?? null
      const hariEfektifAwalLibur: string[] = []
      if (hariEfektifPertama) {
        const cur = new Date(start)
        while (cur.toISOString().split("T")[0] < hariEfektifPertama) {
          hariEfektifAwalLibur.push(cur.toISOString().split("T")[0])
          cur.setUTCDate(cur.getUTCDate() + 1)
        }
      }

      return {
        hariEfektif: count,
        hariEfektifPertama,
        hariEfektifAwalLibur,
      }
    }),
  getStaticQrGuru: protectedProcedure
    .query(async ({ ctx }) => {
      const sekolahId = requireSekolahId(ctx)

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
      const sekolahId = requireSekolahId(ctx)

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

        await ensureHariAbsensi(sekolahId, "guru", schoolToday)

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

        const isPulangCepatDaruratAktif = settings?.isPulangCepatDarurat ?? false

        if (!isPulangCepatDaruratAktif) {
          if (nowMinutes < checkoutLimitMinutes) {
            if (!input.alasan) {
              return {
                success: true,
                requireReason: true,
                type: "guru" as const,
                name: teacherRecord.namaLengkap,
                action: "pulang" as const,
                status: existingAbsen.status,
              }
            }
          }
        }

        let keteranganValue = existingAbsen.keterangan
        if (input.alasan) {
          keteranganValue = existingAbsen.keterangan
            ? `${existingAbsen.keterangan} | [PULANG CEPAT] ${input.alasan}`
            : `[PULANG CEPAT] ${input.alasan}`
        } else if (isPulangCepatDaruratAktif) {
          keteranganValue = existingAbsen.keterangan
            ? `${existingAbsen.keterangan} | [PULANG CEPAT DARURAT MASAL]`
            : `[PULANG CEPAT DARURAT MASAL]`
        }

        await db
          .update(absensiGuru)
          .set({ 
            jamPulang: now,
            keterangan: keteranganValue,
          })
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
