import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { jadwalPelajaran, kelas, pengaturanJadwal, timelineItem, pengampu, mataPelajaran, guru } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"

const jadwalCreateSchema = z.object({
  id: z.string().optional(),
  kelasId: z.string(),
  mataPelajaranId: z.string(),
  guruId: z.string(),
  hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
  jamMulai: z.coerce.date().nullable().optional(),
  jamSelesai: z.coerce.date().nullable().optional(),
  jpMulai: z.number().nullable().optional(),
  jpCount: z.number().nullable().optional(),
})

const jadwalUpdateSchema = jadwalCreateSchema.partial()

const autoGenerateInputSchema = z.object({
  kelasId: z.string().optional(),
  hariLibur: z.array(z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"])).optional().default([]),
  allocations: z.array(
    z.object({
      kelasId: z.string(),
      mataPelajaranId: z.string(),
      guruId: z.string(),
      jpCount: z.number().min(1).max(20),
    })
  ).optional(),
  constraints: z.array(
    z.object({
      guruId: z.string(),
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      jpMulai: z.number().min(1),
      jpSelesai: z.number().min(1),
      isFullDay: z.boolean().optional(),
    })
  ).optional().default([]),
})


async function getKelasIdsForSekolah(sekolahId: string | null): Promise<string[]> {
  if (!sekolahId) return []
  const rows = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.sekolahId, sekolahId))
  return rows.map((r) => r.id)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

/**
 * Pecah total JP menjadi blok pertemuan: maks 3 JP per pertemuan,
 * minimal 2 JP (hindari 1 JP), pecahan merata. Contoh: 4→2+2, 5→3+2,
 * 6→3+3, 7→3+2+2, 8→3+3+2.
 */
function splitJP(total: number): number[] {
  if (total <= 0) return []
  if (total <= 3) return [total]
  const nBlok = Math.ceil(total / 3)
  const base = Math.floor(total / nBlok)
  const sisa = total - base * nBlok
  const chunks: number[] = []
  for (let i = 0; i < nBlok; i++) {
    chunks.push(base + (i < sisa ? 1 : 0))
  }
  return chunks
}

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number)
  return new Date(Date.UTC(1970, 0, 1, h, m, 0))
}

async function computeTimesForJadwal(
  pengaturanJadwalId: string,
  hari: string,
  jpMulai: number,
  jpCount: number
): Promise<{ jamMulai: Date; jamSelesai: Date }> {
  const jpItems = await db.query.timelineItem.findMany({
    where: and(
      eq(timelineItem.pengaturanJadwalId, pengaturanJadwalId),
      eq(timelineItem.hari, hari as any),
      eq(timelineItem.tipe, "jp"),
    ),
    orderBy: [asc(timelineItem.urutan)],
  })

  const startItem = jpItems[jpMulai - 1]
  const endItem = jpItems[jpMulai + jpCount - 2]

  return {
    jamMulai: timeStringToDate(startItem?.jamMulai ?? "07:00"),
    jamSelesai: timeStringToDate(endItem?.jamSelesai ?? "07:40"),
  }
}

async function shiftSchedulesIfNeeded(
  sekolahId: string,
  kelasId: string,
  hari: string,
  targetJpMulai: number,
  targetJpCount: number,
  excludeId?: string
) {
  // Get all existing schedule entries for this class and day
  const existing = await db.query.jadwalPelajaran.findMany({
    where: and(
      eq(jadwalPelajaran.kelasId, kelasId),
      eq(jadwalPelajaran.hari, hari as any)
    ),
  })

  // Filter out the excluded schedule
  const schedulesToProcess = existing.filter((s) => s.id !== excludeId && s.jpMulai !== null && s.jpCount !== null)

  const allItems = [
    ...schedulesToProcess.map((s) => ({
      id: s.id,
      jpMulai: s.jpMulai!,
      jpCount: s.jpCount!,
      isAnchor: false,
    })),
    {
      id: "anchor",
      jpMulai: targetJpMulai,
      jpCount: targetJpCount,
      isAnchor: true,
    },
  ]

  // Detect conflicts and shift
  const sorted = allItems.sort((a, b) => a.jpMulai - b.jpMulai)
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]
    if (!curr.isAnchor) continue
    const conflicts = allItems.filter(
      (s) => s.id !== curr.id && !(s.jpMulai + s.jpCount <= curr.jpMulai || s.jpMulai >= curr.jpMulai + curr.jpCount)
    )
    if (conflicts.length === 0) return // No conflict, nothing to shift

    // Calculate new position
    const occupied = new Set<number>()
    for (const s of allItems) {
      if (s.id === curr.id) continue
      for (let j = 0; j < s.jpCount; j++) {
        occupied.add(s.jpMulai + j)
      }
    }

    // Try to find a non-conflicting position
    let newPos = curr.jpMulai
    while (true) {
      let conflict = false
      for (let j = 0; j < curr.jpCount; j++) {
        if (occupied.has(newPos + j)) {
          conflict = true
          break
        }
      }
      if (!conflict) break
      newPos++
      if (newPos > 20) break // Safety limit
    }

    if (newPos !== curr.jpMulai) {
      await db
        .update(jadwalPelajaran)
        .set({ jpMulai: newPos })
        .where(eq(jadwalPelajaran.id, curr.id))
    }
  }
}

async function getAcademicJpSlots(
  pengaturanJadwalId: string,
  hari: string
): Promise<number> {
  const jpItems = await db.query.timelineItem.findMany({
    where: and(
      eq(timelineItem.pengaturanJadwalId, pengaturanJadwalId),
      eq(timelineItem.hari, hari as any),
      eq(timelineItem.tipe, "jp"),
    ),
    orderBy: [asc(timelineItem.urutan)],
  })
  return jpItems.length
}

async function findAvailableSlots(
  pengaturanJadwalId: string,
  hari: string,
  jpCount: number
): Promise<number | null> {
  const pengaturan = await db.query.pengaturanJadwal.findFirst({
    where: eq(pengaturanJadwal.id, pengaturanJadwalId),
  })
  if (!pengaturan) return null

  const totalSlots = await getAcademicJpSlots(pengaturanJadwalId, hari)
  if (totalSlots === 0) return null

  // Find first available contiguous block
  for (let start = 1; start <= totalSlots - jpCount + 1; start++) {
    return start
  }
  return null
}

export const jadwalRouter = router({
  getTimelineWithJadwal: protectedProcedure
    .input(z.object({
      kelasId: z.string(),
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const sekolahId = sekolahIdFilter ?? ctx.session.user.sekolahId
      const pengaturan = sekolahId
        ? await db.query.pengaturanJadwal.findFirst({
            where: eq(pengaturanJadwal.sekolahId, sekolahId),
          })
        : await db.query.pengaturanJadwal.findFirst()
      if (!pengaturan) {
        return { timelineItems: [], jadwalList: [], durasiJP: 40 }
      }

      const timelineItems = await db.query.timelineItem.findMany({
        where: and(
          eq(timelineItem.pengaturanJadwalId, pengaturan.id),
          eq(timelineItem.hari, input.hari as any),
        ),
        orderBy: [asc(timelineItem.urutan)],
      })

      const jadwalList = await db.query.jadwalPelajaran.findMany({
        where: and(
          eq(jadwalPelajaran.kelasId, input.kelasId),
          eq(jadwalPelajaran.hari, input.hari as any),
          sekolahIdFilter ? eq(jadwalPelajaran.sekolahId, sekolahIdFilter) : undefined,
        ),
      })

      return {
        timelineItems,
        jadwalList: jadwalList.map((j) => ({
          id: j.id,
          jpMulai: j.jpMulai,
          jpCount: j.jpCount,
        })),
        durasiJP: pengaturan.durasiJP ?? 40,
      }
    }),

  getSisaJp: protectedProcedure
    .input(z.object({ kelasId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)

      const pengampuList = await db.query.pengampu.findMany({
        where: and(
          eq(pengampu.kelasId, input.kelasId),
          sekolahIdFilter ? eq(pengampu.sekolahId, sekolahIdFilter) : undefined,
        ),
      })

      const jadwalList = await db
        .select({ mataPelajaranId: jadwalPelajaran.mataPelajaranId, jpTerpakai: jadwalPelajaran.jpCount })
        .from(jadwalPelajaran)
        .where(and(
          eq(jadwalPelajaran.kelasId, input.kelasId),
          sekolahIdFilter ? eq(jadwalPelajaran.sekolahId, sekolahIdFilter) : undefined,
        ))

      const jpTerpakaiMap = new Map<string, number>()
      for (const j of jadwalList) {
        jpTerpakaiMap.set(j.mataPelajaranId, (jpTerpakaiMap.get(j.mataPelajaranId) ?? 0) + (j.jpTerpakai ?? 0))
      }

      const result: { mataPelajaranId: string; jumlahJam: number; terpakai: number; sisa: number }[] = []
      for (const p of pengampuList) {
        const terpakai = jpTerpakaiMap.get(p.mataPelajaranId) ?? 0
        result.push({
          mataPelajaranId: p.mataPelajaranId,
          jumlahJam: p.jumlahJam,
          terpakai,
          sisa: Math.max(0, p.jumlahJam - terpakai),
        })
      }

      return result
    }),

  getAll: protectedProcedure
    .input(z.object({
      kelasId: z.string().optional(),
      guruId: z.string().optional(),
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]).optional(),
      limit: z.number().min(1).max(1000).optional().default(500),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions: any[] = [eq(jadwalPelajaran.kelasId, kelas.id)]

      if (input.kelasId) {
        conditions.push(eq(jadwalPelajaran.kelasId, input.kelasId))
      }
      if (input.guruId) {
        conditions.push(eq(jadwalPelajaran.guruId, input.guruId))
      }
      if (input.hari) {
        conditions.push(eq(jadwalPelajaran.hari, input.hari as any))
      }
      if (sekolahIdFilter) {
        conditions.push(eq(kelas.sekolahId, sekolahIdFilter))
      }

      const result = await db
        .select()
        .from(jadwalPelajaran)
        .leftJoin(kelas, eq(jadwalPelajaran.kelasId, kelas.id))
        .where(and(...conditions))
        .orderBy(desc(jadwalPelajaran.jpMulai))
        .limit(input.limit)

      return result.map((r) => ({
        ...r.jadwal_pelajaran,
        kelas: r.kelas,
      }))
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(jadwalCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const kelasIds = await getKelasIdsForSekolah(sekolahId)
      if (!kelasIds.includes(input.kelasId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
      }

      const pengaturan = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      const pengaturanJadwalId = pengaturan?.id
      if (!pengaturanJadwalId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pengaturan jadwal belum dibuat" })
      }

      // Auto-assign jpMulai if not provided
      let jpMulai = input.jpMulai ?? null
      const jpCount = input.jpCount ?? null

      if (jpMulai === null && jpCount !== null) {
        const existingSchedules = await db.query.jadwalPelajaran.findMany({
          where: and(
            eq(jadwalPelajaran.kelasId, input.kelasId),
            eq(jadwalPelajaran.hari, input.hari as any),
          ),
        })

        const occupiedSlots = new Set<number>()
        for (const s of existingSchedules) {
          if (s.jpMulai !== null && s.jpCount !== null) {
            for (let i = 0; i < s.jpCount; i++) {
              occupiedSlots.add(s.jpMulai + i)
            }
          }
        }

        const totalJpSlots = await getAcademicJpSlots(pengaturanJadwalId, input.hari)
        for (let slot = 1; slot <= totalJpSlots; slot++) {
          let available = true
          for (let offset = 0; offset < jpCount; offset++) {
            if (occupiedSlots.has(slot + offset)) {
              available = false
              break
            }
          }
          if (available) {
            jpMulai = slot
            break
          }
        }

        if (jpMulai === null) {
          throw new TRPCError({ code: "CONFLICT", message: "Tidak ada slot JP yang tersedia untuk hari ini" })
        }
      }

      // Time calculation
      let { jamMulai, jamSelesai } = input
      if (jpMulai !== null && jpCount !== null) {
        const computed = await computeTimesForJadwal(pengaturanJadwalId, input.hari, jpMulai, jpCount)
        jamMulai = computed.jamMulai
        jamSelesai = computed.jamSelesai
      }

      // Auto sequential shifting
      if (jpMulai !== null && jpCount !== null) {
        await shiftSchedulesIfNeeded(sekolahId, input.kelasId, input.hari, jpMulai, jpCount, input.id)
      }

      const id = input.id || crypto.randomUUID()
      const result = await db.insert(jadwalPelajaran).values({
        ...input,
        id,
        sekolahId,
        jpMulai,
        jpCount,
        jamMulai,
        jamSelesai,
      } as any).returning()

      await logAudit(ctx, { action: "create", entity: "jadwal_pelajaran", entityId: result[0]?.id, metadata: { kelasId: input.kelasId } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: jadwalUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const existing = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (existing.kelas?.sekolahId !== sekolahId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      if (input.data.kelasId) {
        const kelasIds = await getKelasIdsForSekolah(sekolahId)
        if (!kelasIds.includes(input.data.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }
      const newJpMulai = input.data.jpMulai !== undefined ? input.data.jpMulai : existing.jpMulai
      const newJpCount = input.data.jpCount !== undefined ? input.data.jpCount : existing.jpCount
      const newHari = input.data.hari !== undefined ? input.data.hari : existing.hari
      const newKelasId = input.data.kelasId !== undefined ? input.data.kelasId : existing.kelasId

      const pengaturan = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      const pengaturanJadwalId = pengaturan?.id
      if (!pengaturanJadwalId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pengaturan jadwal belum dibuat" })
      }

      // Auto sequential shifting logic
      if (newJpMulai !== null && newJpMulai !== undefined && newJpCount !== null && newJpCount !== undefined) {
        await shiftSchedulesIfNeeded(sekolahId, newKelasId, newHari, newJpMulai, newJpCount, input.id)
      }

      // Auto time calculation
      let { jamMulai, jamSelesai } = input.data
      if (newJpMulai !== null && newJpMulai !== undefined && newJpCount !== null && newJpCount !== undefined) {
        const computed = await computeTimesForJadwal(pengaturanJadwalId, newHari, newJpMulai, newJpCount)
        jamMulai = computed.jamMulai
        jamSelesai = computed.jamSelesai
      }

      const result = await db
        .update(jadwalPelajaran)
        .set({
          ...input.data,
          jpMulai: newJpMulai,
          jpCount: newJpCount,
          jamMulai,
          jamSelesai,
        } as any)
        .where(eq(jadwalPelajaran.id, input.id))
        .returning()

      await logAudit(ctx, { action: "update", entity: "jadwal_pelajaran", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const existing = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (existing.kelas?.sekolahId !== sekolahId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      await db.delete(jadwalPelajaran).where(eq(jadwalPelajaran.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "jadwal_pelajaran", entityId: input.id })
      return { success: true }
    }),

  clearAll: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ kelasId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const t0 = performance.now()
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(jadwalPelajaran.sekolahId, sekolahId)]
      if (input.kelasId) conditions.push(eq(jadwalPelajaran.kelasId, input.kelasId))
      const deleted = await db.delete(jadwalPelajaran).where(and(...conditions)).returning()
      const durationMs = Math.round(performance.now() - t0)
      console.log(`[jadwal] clearAll selesai: ${durationMs}ms, ${deleted.length} entri dihapus${input.kelasId ? ` (kelas ${input.kelasId})` : " (semua kelas)"}`)
      await logAudit(ctx, { action: "clear_all", entity: "jadwal_pelajaran", metadata: { kelasId: input.kelasId ?? null, count: deleted.length } })
      return { success: true, count: deleted.length, durationMs }
    }),

  autoGenerate: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(autoGenerateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { sekolahId, pengaturanJadwalId, activeDays, allocations } = await prepareGenerate(ctx, input)

      const seedKey = buildSeedKey(sekolahId, input)
      const t0 = performance.now()
      const result = await solveSchedule({ sekolahId, pengaturanJadwalId, allocations, activeDays, hariLibur: input.hariLibur || [], constraints: input.constraints || [], seedKey })

      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error })
      }

      // Delete existing schedules for the classes we generated
      const targetKelasIds = Array.from(new Set(allocations.map((a) => a.kelasId)))
      if (targetKelasIds.length > 0) {
        await db.delete(jadwalPelajaran).where(inArray(jadwalPelajaran.kelasId, targetKelasIds))
      }

      // Group contiguous assignments into single records
      const groups: {
        kelasId: string
        hari: string
        mataPelajaranId: string
        guruId: string
        jpMulai: number
        jpCount: number
      }[] = []

      const assignmentsList = Array.from(result.assigned.entries()).map(([key, val]) => {
        const [kelasId, hari, academicJpStr] = key.split("|")
        return {
          kelasId,
          hari,
          academicJp: parseInt(academicJpStr),
          mataPelajaranId: val.mataPelajaranId,
          guruId: val.guruId,
        }
      })

      assignmentsList.sort((a, b) => {
        if (a.kelasId !== b.kelasId) return a.kelasId.localeCompare(b.kelasId)
        if (a.hari !== b.hari) return a.hari.localeCompare(b.hari)
        return a.academicJp - b.academicJp
      })

      for (const item of assignmentsList) {
        const lastGroup = groups[groups.length - 1]
        const isContiguous =
          lastGroup &&
          lastGroup.kelasId === item.kelasId &&
          lastGroup.hari === item.hari &&
          lastGroup.mataPelajaranId === item.mataPelajaranId &&
          lastGroup.guruId === item.guruId &&
          lastGroup.jpCount < 3 &&
          lastGroup.jpMulai + lastGroup.jpCount === item.academicJp

        if (isContiguous) {
          lastGroup.jpCount++
        } else {
          groups.push({
            kelasId: item.kelasId,
            hari: item.hari,
            mataPelajaranId: item.mataPelajaranId,
            guruId: item.guruId,
            jpMulai: item.academicJp,
            jpCount: 1,
          })
        }
      }

      const insertData: any[] = []
      for (const g of groups) {
        const { jamMulai, jamSelesai } = await computeTimesForJadwal(pengaturanJadwalId, g.hari, g.jpMulai, g.jpCount)
        insertData.push({
          id: crypto.randomUUID(),
          sekolahId,
          kelasId: g.kelasId,
          mataPelajaranId: g.mataPelajaranId,
          guruId: g.guruId,
          hari: g.hari,
          jpMulai: g.jpMulai,
          jpCount: g.jpCount,
          jamMulai,
          jamSelesai,
        })
      }

      if (insertData.length > 0) {
        await db.insert(jadwalPelajaran).values(insertData)
      }

      const totalJpTerjadwal = insertData.reduce((sum, d) => sum + (d.jpCount || 0), 0)
      const durationMs = Math.round(performance.now() - t0)
      console.log(`[jadwal] autoGenerate selesai: ${durationMs}ms, ${insertData.length} blok, ${totalJpTerjadwal} JP, ${targetKelasIds.length} rombel`)
      await logAudit(ctx, { action: "create", entity: "jadwal_pelajaran", entityId: "auto-generate", metadata: { kelasIds: targetKelasIds, totalJp: totalJpTerjadwal, totalBlocks: insertData.length } })
      return { success: true, totalJp: totalJpTerjadwal, totalBlocks: insertData.length, durationMs }
    }),

  previewGenerate: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(autoGenerateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { sekolahId, pengaturanJadwalId, activeDays, allocations } = await prepareGenerate(ctx, input)

      const [guruRows, kelasRows, mapelRows] = await Promise.all([
        db.query.guru.findMany({ where: eq(guru.sekolahId, sekolahId) }),
        db.query.kelas.findMany({ where: eq(kelas.sekolahId, sekolahId) }),
        db.query.mataPelajaran.findMany({ where: eq(mataPelajaran.sekolahId, sekolahId) }),
      ])
      const namaGuru = new Map(guruRows.map((g) => [g.id, g.namaLengkap]))
      const namaKelas = new Map(kelasRows.map((k) => [k.id, k.namaKelas]))
      const namaMapel = new Map(mapelRows.map((m) => [m.id, m.namaMapel]))

      const seedKey = buildSeedKey(sekolahId, input)
      const t0 = performance.now()
      const result = await solveSchedule({
        sekolahId,
        pengaturanJadwalId,
        allocations,
        activeDays,
        hariLibur: input.hariLibur || [],
        constraints: input.constraints || [],
        seedKey,
        namaGuru,
        namaKelas,
      })

      if (!result.ok) {
        return { ok: false, error: result.error ?? null, totalJp: 0, perKelas: [], durationMs: Math.round(performance.now() - t0) }
      }

      const kelasBeban = new Map<string, number>()
      for (const a of allocations) {
        kelasBeban.set(a.kelasId, (kelasBeban.get(a.kelasId) || 0) + a.jpCount)
      }

      const targetKelas = Array.from(new Set(allocations.map((a) => a.kelasId))).sort()
      const perKelas = targetKelas.map((kId) => {
        const slotsPerDay = result.academicSlotsPerDay
        const hari: {
          hari: string
          blocks: { jpMulai: number; jpCount: number; mapelId: string; mapelNama: string; guruNama: string }[]
          empty: { jp: number; alasan: string | null }[]
        }[] = []

        for (const day of activeDays) {
          const daySlots = slotsPerDay.get(day) || []
          const blocks: { jpMulai: number; jpCount: number; mapelId: string; mapelNama: string; guruNama: string }[] = []
          const empty: { jp: number; alasan: string | null }[] = []

          let cursor = 1
          while (cursor <= daySlots.length) {
            const slotKey = `${kId}|${day}|${cursor}`
            const val = result.assigned.get(slotKey)
            if (val) {
              blocks.push({
                jpMulai: cursor,
                jpCount: val.jpCount,
                mapelId: val.mataPelajaranId,
                mapelNama: namaMapel.get(val.mataPelajaranId) || "-",
                guruNama: namaGuru.get(val.guruId) || "-",
              })
              cursor += val.jpCount
            } else {
              empty.push({
                jp: cursor,
                alasan: result.reasons.get(slotKey) || null,
              })
              cursor += 1
            }
          }

          hari.push({ hari: day, blocks, empty })
        }

        return {
          kelasId: kId,
          namaKelas: namaKelas.get(kId) || kId,
          bebanJP: kelasBeban.get(kId) || 0,
          kapasitasJP: result.kapasitasPerKelas.get(kId) || 0,
          kapasitasRealistisJP: result.kapasitasRealistisPerKelas.get(kId) || 0,
          terpasangJP: result.blocks.filter((b) => b.kelasId === kId).reduce((s, b) => s + b.jpCount, 0),
          hari,
        }
      })

      return { ok: true, error: null, totalJp: result.totalJp, perKelas, durationMs: Math.round(performance.now() - t0) }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for auto-generate & preview (dry-run) jadwal
// ─────────────────────────────────────────────────────────────────────────────

export type GenerateAllocation = { kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }
export type GenerateConstraint = { guruId: string; hari: string; jpMulai: number; jpSelesai: number; isFullDay?: boolean }

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** PRNG deterministik (mulberry32) agar preview identik dengan hasil generate. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildSeedKey(sekolahId: string, input: { kelasId?: string; hariLibur?: string[]; constraints?: GenerateConstraint[] }): string {
  return `${sekolahId}|${input.kelasId ?? "all"}|${(input.hariLibur || []).join(",")}|${JSON.stringify(input.constraints || [])}`
}

/**
 * Hitung kapasitas realistis: minimal jumlah hari untuk mengemas SEMUA blok
 * (ukuran 1/2/3 JP) ke hari-hari dengan kapasitas slot tertentu, via DP exact
 * bin-packing (BFS per layer hari). Kapasitas mentah (Σ slot) menyesatkan:
 * misal 16 mapel × 3 JP = 48 JP < 50 slot, tapi blok 3 JP hanya muat 9 JP/hari
 * (3+3+3, sisa 1) → butuh 6 hari → tidak mungkin.
 *
 * Return:
 * - totalSlots  : Σ kapasitas slot semua hari (kapasitas mentah)
 * - packableMax : total JP maksimum yang bisa dikemas dalam semua hari
 * - minDays     : hari minimum yang dibutuhkan (totalSlots+1 hari = tidak muat)
 */
function computePackableCapacity(
  blockSizes: number[],
  dayCapacities: number[]
): { totalSlots: number; packableMax: number; minDays: number } {
  const totalSlots = dayCapacities.reduce((s, c) => s + c, 0)
  if (blockSizes.length === 0) return { totalSlots, packableMax: 0, minDays: 0 }

  const c1 = blockSizes.filter((b) => b === 1).length
  const c2 = blockSizes.filter((b) => b === 2).length
  const c3 = blockSizes.filter((b) => b === 3).length
  const maxDays = dayCapacities.length
  if (maxDays === 0) return { totalSlots, packableMax: 0, minDays: maxDays + 1 }

  const caps = [...dayCapacities].sort((a, b) => b - a)

  // Semua kombinasi isi satu hari: [x1, x2, x3] dengan x1 + 2x2 + 3x3 <= cap
  const fillOptions = (cap: number): [number, number, number][] => {
    const opts: [number, number, number][] = []
    for (let x3 = 0; x3 * 3 <= cap; x3++) {
      for (let x2 = 0; x2 * 2 + x3 * 3 <= cap; x2++) {
        const remaining = cap - x3 * 3 - x2 * 2
        for (let x1 = 0; x1 <= Math.min(remaining, c1); x1++) {
          opts.push([x1, x2, x3])
        }
      }
    }
    return opts
  }

  const key = (a: number, b: number, c: number) => `${a}|${b}|${c}`
  const targetKey = key(c1, c2, c3)

  // BFS per layer (satu layer = satu hari terpakai)
  let frontier = new Set<string>([key(0, 0, 0)])
  const visited = new Set<string>(frontier)

  for (let day = 0; day < maxDays; day++) {
    const opts = fillOptions(caps[day] ?? caps[caps.length - 1] ?? 10)
    const next = new Set<string>()
    for (const f of frontier) {
      const [a1, a2, a3] = f.split("|").map(Number)
      for (const [x1, x2, x3] of opts) {
        if (a1 + x1 > c1 || a2 + x2 > c2 || a3 + x3 > c3) continue
        const nk = key(a1 + x1, a2 + x2, a3 + x3)
        if (nk === targetKey) {
          return { totalSlots, packableMax: c1 + 2 * c2 + 3 * c3, minDays: day + 1 }
        }
        if (!visited.has(nk)) {
          visited.add(nk)
          next.add(nk)
        }
      }
    }
    frontier = next
    if (frontier.size === 0) break
  }

  // Tidak semua blok muat: laporkan maksimum yang tercapai
  let packableMax = 0
  for (const f of visited) {
    const [a1, a2, a3] = f.split("|").map(Number)
    const sum = a1 + 2 * a2 + 3 * a3
    if (sum > packableMax) packableMax = sum
  }
  return { totalSlots, packableMax, minDays: maxDays + 1 }
}

async function prepareGenerate(
  ctx: { session: { user: { sekolahId: string | null } } },
  input: { kelasId?: string; hariLibur?: string[]; allocations?: GenerateAllocation[] }
): Promise<{ sekolahId: string; pengaturanJadwalId: string; activeDays: string[]; allocations: GenerateAllocation[] }> {
  const sekolahId = ctx.session.user.sekolahId
  if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })

  const pengaturan = await db.query.pengaturanJadwal.findFirst({
    where: eq(pengaturanJadwal.sekolahId, sekolahId),
  })
  if (!pengaturan) throw new TRPCError({ code: "BAD_REQUEST", message: "Pengaturan jadwal belum dibuat" })

  const pengaturanJadwalId = pengaturan.id

  // Get active days from timeline items
  const hariRows = await db
    .select({ hari: timelineItem.hari })
    .from(timelineItem)
    .where(and(
      eq(timelineItem.pengaturanJadwalId, pengaturanJadwalId),
      eq(timelineItem.tipe, "jp"),
    ))
    .groupBy(timelineItem.hari)

  const hariLiburSet = new Set(input.hariLibur || [])
  const DAY_ORDER = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]
  const activeDays = hariRows
    .map(r => r.hari)
    .filter(h => !hariLiburSet.has(h as any))
    .sort((a, b) => DAY_ORDER.indexOf(a as string) - DAY_ORDER.indexOf(b as string))

  if (activeDays.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tidak ada hari aktif yang tersisa. Silakan sesuaikan pilihan hari libur sekolah." })
  }

  // 1. Get allocations from input or automatically from DB plotting pengajar (pengampu)
  if (input.kelasId && input.kelasId !== "all") {
    const kelasTarget = await db.query.kelas.findFirst({
      where: and(eq(kelas.id, input.kelasId), eq(kelas.sekolahId, sekolahId)),
      columns: { id: true },
    })
    if (!kelasTarget) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Kelas yang dipilih tidak berada di sekolah Anda. Generate dibatalkan." })
    }
  }

  let allocations = input.allocations || []
  if (allocations.length === 0) {
    const pengampuConditions = [eq(pengampu.sekolahId, sekolahId)]
    if (input.kelasId && input.kelasId !== "all") {
      pengampuConditions.push(eq(pengampu.kelasId, input.kelasId))
    }
    const pengampuRows = await db.query.pengampu.findMany({
      where: and(...pengampuConditions),
    })

    allocations = pengampuRows
      .filter((p) => p.jumlahJam > 0)
      .map((p) => ({
        kelasId: p.kelasId,
        mataPelajaranId: p.mataPelajaranId,
        guruId: p.guruId,
        jpCount: p.jumlahJam,
      }))
  }

  if (allocations.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Belum ada data Plotting Pengajar (Pengampu) di database. Silakan isi Plotting Pengajar terlebih dahulu di menu Akademik.",
    })
  }

  // ── VALIDASI TENANT: semua kelas/guru/mapel dalam alokasi wajib milik sekolah ini ──
  // (mencegah generate di sekolah A menghapus/membuat jadwal kelas sekolah B
  //  bila client mengirim input.allocations dengan id dari sekolah lain)
  const [kelasIds, guruIds, mapelIds] = await Promise.all([
    db.query.kelas.findMany({ where: eq(kelas.sekolahId, sekolahId), columns: { id: true } }),
    db.query.guru.findMany({ where: eq(guru.sekolahId, sekolahId), columns: { id: true } }),
    db.query.mataPelajaran.findMany({ where: eq(mataPelajaran.sekolahId, sekolahId), columns: { id: true } }),
  ])
  const kelasSet = new Set(kelasIds.map((k) => k.id))
  const guruSet = new Set(guruIds.map((g) => g.id))
  const mapelSet = new Set(mapelIds.map((m) => m.id))
  const asing = allocations.filter(
    (a) => !kelasSet.has(a.kelasId) || !guruSet.has(a.guruId) || !mapelSet.has(a.mataPelajaranId)
  )
  if (asing.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Generate dibatalkan: ${asing.length} alokasi mengacu kelas/guru/mata pelajaran di luar sekolah Anda. Periksa kembali data Plotting Pengajar.`,
    })
  }

  return { sekolahId, pengaturanJadwalId, activeDays, allocations }
}

export async function solveSchedule(args: {
  sekolahId: string
  pengaturanJadwalId: string
  allocations: GenerateAllocation[]
  activeDays: string[]
  hariLibur: string[]
  constraints: GenerateConstraint[]
  seedKey: string
  namaGuru?: Map<string, string>
  namaKelas?: Map<string, string>
}): Promise<{
  ok: boolean
  error?: string
  assigned: Map<string, { mataPelajaranId: string; guruId: string; jpCount: number }>
  reasons: Map<string, string>
  blocks: { id: string; kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[]
  academicSlotsPerDay: Map<string, number[]>
  kapasitasPerKelas: Map<string, number>
  kapasitasRealistisPerKelas: Map<string, number>
  totalJp: number
}> {
  const { pengaturanJadwalId, allocations, activeDays, constraints, seedKey, namaGuru, namaKelas } = args

  // Get all timeline items for slot mapping
  const timelineList = await db.query.timelineItem.findMany({
    where: and(
      eq(timelineItem.pengaturanJadwalId, pengaturanJadwalId),
    ),
    orderBy: [asc(timelineItem.urutan)],
  })

  // Pre-map academic slots per day
  const academicSlotsPerDay = new Map<string, number[]>()
  for (const day of activeDays) {
    const dayItems = timelineList.filter(t => t.hari === day).sort((a, b) => a.urutan - b.urutan)
    const academicSlots: number[] = []
    let academicCounter = 1
    for (const item of dayItems) {
      if (item.tipe === "jp") {
        academicSlots.push(academicCounter++)
      }
    }
    academicSlotsPerDay.set(day, academicSlots)
  }

  // ── VALIDASI OVERLOAD: beban JP per kelas vs kapasitas realistis (pakai blok) ──
  const kapasitasPerKelas = new Map<string, number>()
  const kapasitasRealistisPerKelas = new Map<string, number>()
  const kapasitasTotal = activeDays.reduce(
    (sum, day) => sum + (academicSlotsPerDay.get(day)?.length || 0),
    0
  )
  const dayCapacities = activeDays.map((day) => academicSlotsPerDay.get(day)?.length || 0)
  const targetKelasAll = Array.from(new Set(allocations.map((a) => a.kelasId)))

  // Pecah blok per kelas dulu untuk validasi kapasitas realistis
  const blocksPerKelas = new Map<string, { sizes: number[]; beban: number }>()
  for (const a of allocations) {
    const entry = blocksPerKelas.get(a.kelasId) || { sizes: [], beban: 0 }
    entry.beban += a.jpCount
    for (const chunk of splitJP(a.jpCount)) entry.sizes.push(chunk)
    blocksPerKelas.set(a.kelasId, entry)
  }

  const overloaded: { kelasId: string; beban: number; kapasitas: number; slotMentah: number }[] = []
  for (const kelasId of targetKelasAll) {
    kapasitasPerKelas.set(kelasId, kapasitasTotal)
    const entry = blocksPerKelas.get(kelasId) || { sizes: [], beban: 0 }
    const { packableMax } = computePackableCapacity(entry.sizes, dayCapacities)
    kapasitasRealistisPerKelas.set(kelasId, packableMax)
    if (entry.beban > packableMax) {
      overloaded.push({ kelasId, beban: entry.beban, kapasitas: packableMax, slotMentah: kapasitasTotal })
    }
  }
  if (overloaded.length > 0) {
    const butuhHari = activeDays.length + 1
    const detail = overloaded
      .map((o) => {
        const sisaSlot = o.slotMentah - o.kapasitas
        const nama = namaKelas?.get(o.kelasId) || o.kelasId.slice(0, 8)
        const core = `${nama}: beban ${o.beban} JP > kapasitas realistis ${o.kapasitas} JP`
        return sisaSlot > 0
          ? `${core} (slot mentah ${o.slotMentah}, ${sisaSlot} slot tak bisa diisi blok 2-3 JP — butuh ${butuhHari} hari)`
          : core
      })
      .join("; ")
    return {
      ok: false,
      error:
        `Overload jadwal terdeteksi — generate dibatalkan: ${detail}. ` +
        `Solusi: (1) kurangi jumlah JP di Plotting Pengajar, ` +
        `(2) tambah slot JP di Pengaturan Jadwal, atau ` +
        `(3) pecah bobot mapel agar blok pertemuannya lebih kecil (≤ 2 JP).`,
      assigned: new Map(),
      reasons: new Map(),
      blocks: [],
      academicSlotsPerDay,
      kapasitasPerKelas,
      kapasitasRealistisPerKelas,
      totalJp: 0,
    }
  }

  // Convert constraints to a fast-lookup Set "guruId-day-academicJp"
  const teacherExclusions = new Set<string>()
  for (const c of constraints) {
    const slotsForDay = academicSlotsPerDay.get(c.hari) || []
    const maxSlotCount = slotsForDay.length || 10
    const endJp = c.isFullDay ? maxSlotCount : c.jpSelesai

    for (let jp = c.jpMulai; jp <= Math.min(endJp, maxSlotCount); jp++) {
      const academicJp = slotsForDay[jp - 1]
      if (academicJp !== undefined) {
        teacherExclusions.add(`${c.guruId}|${c.hari}|${academicJp}`)
      }
    }
  }

  // Pecah alokasi JP menjadi blok pertemuan: maks 3 JP, min 2 JP, merata
  const blocks: { id: string; kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[] = []
  for (const alloc of allocations) {
    const chunks = splitJP(alloc.jpCount)
    chunks.forEach((chunk, part) => {
      blocks.push({
        id: `${alloc.kelasId}-${alloc.mataPelajaranId}-${alloc.guruId}-${part + 1}`,
        kelasId: alloc.kelasId,
        mataPelajaranId: alloc.mataPelajaranId,
        guruId: alloc.guruId,
        jpCount: chunk,
      })
    })
  }

  // Sort by size descending as base ordering
  blocks.sort((a, b) => b.jpCount - a.jpCount)

  const assigned = new Map<string, { mataPelajaranId: string; guruId: string; jpCount: number }>()
  const guruSlotKelas = new Map<string, string>() // `${guruId}|${day}|${jp}` -> kelasId (O(1) lookup alasan bentrok)
  const teacherBusy = new Map<string, boolean>()
  const kelasDaysMap = new Map<string, Set<string>>()
  const kelasLoad = new Map<string, Map<string, number>>()
  const kelasMapelDays = new Map<string, Map<string, Set<string>>>()
  const reasons = new Map<string, string>()
  const rng = mulberry32(hashString(seedKey))

  const recordReason = (slotKey: string, msg: string) => {
    reasons.set(slotKey, msg)
  }

  let success = false

  // ── PHASE 1: Backtracking dengan Pengecualian Guru & Shuffling (Mencari Solusi Sempurna) ──
  for (let attempt = 0; attempt < 12; attempt++) {
    assigned.clear()
    teacherBusy.clear()
    guruSlotKelas.clear()
    kelasDaysMap.clear()
    kelasLoad.clear()
    kelasMapelDays.clear()
    reasons.clear()

    const shuffledBlocks = [...blocks]
    if (attempt > 0) {
      // Acak urutan block dengan PRNG ter-seed agar preview identik dengan generate
      for (let i = shuffledBlocks.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        const temp = shuffledBlocks[i]!
        shuffledBlocks[i] = shuffledBlocks[j]!
        shuffledBlocks[j] = temp
      }
    }

    const options = {
      avoidSame: attempt < 20,
      avoidConsecutive: attempt < 10,
    }

    const solverState: { steps: number; maxSteps: number; aborted: boolean } = { steps: 0, maxSteps: 5000, aborted: false }
    success = runBacktrackingSolver(
      shuffledBlocks,
      0,
      assigned,
      teacherBusy,
      [...activeDays],
      academicSlotsPerDay,
      teacherExclusions,
      kelasDaysMap,
      kelasLoad,
      kelasMapelDays,
      guruSlotKelas,
      solverState,
      options,
      recordReason,
      namaGuru,
      namaKelas
    )
    if (success) {
      blocks.length = 0
      blocks.push(...shuffledBlocks)
      break
    }
  }

  // ── PHASE 2: Jika gagal, rileksasikan aturan jam berhalangan guru (Teacher Exclusions) ──
  if (!success && teacherExclusions.size > 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      assigned.clear()
      teacherBusy.clear()
      guruSlotKelas.clear()
      kelasDaysMap.clear()
      kelasLoad.clear()
      kelasMapelDays.clear()
      reasons.clear()

      const shuffledBlocks = [...blocks]
      if (attempt > 0) {
        for (let i = shuffledBlocks.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1))
          const temp = shuffledBlocks[i]!
          shuffledBlocks[i] = shuffledBlocks[j]!
          shuffledBlocks[j] = temp
        }
      }

      const options = {
        avoidSame: attempt < 20,
        avoidConsecutive: attempt < 10,
      }

      const solverState: { steps: number; maxSteps: number; aborted: boolean } = { steps: 0, maxSteps: 5000, aborted: false }
      success = runBacktrackingSolver(
        shuffledBlocks,
        0,
        assigned,
        teacherBusy,
        [...activeDays],
        academicSlotsPerDay,
        new Set(), // Rileksasikan pengecualian guru
        kelasDaysMap,
        kelasLoad,
        kelasMapelDays,
        guruSlotKelas,
        solverState,
        options,
        recordReason,
        namaGuru,
        namaKelas
      )
      if (success) {
        blocks.length = 0
        blocks.push(...shuffledBlocks)
        break
      }
    }
  }

  // ── PHASE 3: Jika masih gagal, jalankan Greedy Placement ──
  // Tetap menghormati aturan "pecahan mapel beda hari"; blok yang tidak
  // bisa ditempatkan dikumpulkan dan memicu error (bukan silent drop).
  const unplaced: { kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[] = []
  if (!success) {
    assigned.clear()
    teacherBusy.clear()
    guruSlotKelas.clear()
    kelasDaysMap.clear()
    kelasLoad.clear()
    kelasMapelDays.clear()
    reasons.clear()

    // Urutkan kembali berdasarkan JP terbesar
    blocks.sort((a, b) => b.jpCount - a.jpCount)

    const hasSameMapelOnDay = (kelasId: string, mataPelajaranId: string, day: string) =>
      kelasMapelDays.get(kelasId)?.get(mataPelajaranId)?.has(day) ?? false

    const dayLoad = (kelasId: string, day: string) => kelasLoad.get(kelasId)?.get(day) ?? 0

    const markPlaced = (kelasId: string, mataPelajaranId: string, day: string, jpCount: number) => {
      const loadMap = kelasLoad.get(kelasId) || new Map<string, number>()
      loadMap.set(day, (loadMap.get(day) ?? 0) + jpCount)
      kelasLoad.set(kelasId, loadMap)
      const mDays = kelasMapelDays.get(kelasId) || new Map<string, Set<string>>()
      const mDaySet = mDays.get(mataPelajaranId) || new Set<string>()
      mDaySet.add(day)
      mDays.set(mataPelajaranId, mDaySet)
      kelasMapelDays.set(kelasId, mDays)
    }

    for (const block of blocks) {
      const slotsPerDayList = [...activeDays]
        .map(day => ({
          day,
          slots: academicSlotsPerDay.get(day) || []
        }))
        .sort((a, b) => dayLoad(block.kelasId, a.day) - dayLoad(block.kelasId, b.day))

      let placed = false

      // Langkah A: Cari slot kosong kelas & guru tidak sedang mengajar
      for (const { day, slots } of slotsPerDayList) {
        if (hasSameMapelOnDay(block.kelasId, block.mataPelajaranId, day)) continue
        for (let startIdx = 0; startIdx <= slots.length - block.jpCount; startIdx++) {
          let classConflict = false
          let teacherConflict = false

          for (let offset = 0; offset < block.jpCount; offset++) {
            const slotJp = slots[startIdx + offset]
            if (slotJp === undefined) { classConflict = true; break; }

            const slotKey = `${block.kelasId}|${day}|${slotJp}`
            if (assigned.has(slotKey)) { classConflict = true; break; }

            const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
            if (teacherBusy.get(teacherDayKey)) {
              teacherConflict = true;
              recordReason(slotKey, `Guru ${namaGuru?.get(block.guruId) || "terkait"} sedang mengajar Kelas ${namaKelas?.get(guruSlotKelas.get(teacherDayKey) || "") || guruSlotKelas.get(teacherDayKey) || ""} di slot ini`)
            }
          }

          if (!classConflict && !teacherConflict) {
            for (let offset = 0; offset < block.jpCount; offset++) {
              const slotJp = slots[startIdx + offset]
              const slotKey = `${block.kelasId}|${day}|${slotJp}`
              assigned.set(slotKey, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId, jpCount: block.jpCount })

              const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
              teacherBusy.set(teacherDayKey, true)
              guruSlotKelas.set(teacherDayKey, block.kelasId)
            }
            const kDays = kelasDaysMap.get(block.kelasId) || new Set()
            kDays.add(day)
            kelasDaysMap.set(block.kelasId, kDays)
            markPlaced(block.kelasId, block.mataPelajaranId, day, block.jpCount)
            placed = true
            break
          }
        }
        if (placed) break
      }

      // Langkah B: Jika terpaksa bentrok guru, yang penting kelasnya kosong (bentrok guru minimal)
      if (!placed) {
        for (const { day, slots } of slotsPerDayList) {
          if (hasSameMapelOnDay(block.kelasId, block.mataPelajaranId, day)) continue
          for (let startIdx = 0; startIdx <= slots.length - block.jpCount; startIdx++) {
            let classConflict = false

            for (let offset = 0; offset < block.jpCount; offset++) {
              const slotJp = slots[startIdx + offset]
              if (slotJp === undefined) { classConflict = true; break; }

              const slotKey = `${block.kelasId}|${day}|${slotJp}`
              if (assigned.has(slotKey)) { classConflict = true; break; }
            }

            if (!classConflict) {
              for (let offset = 0; offset < block.jpCount; offset++) {
                const slotJp = slots[startIdx + offset]
                const slotKey = `${block.kelasId}|${day}|${slotJp}`
                assigned.set(slotKey, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId, jpCount: block.jpCount })

                // Tandai guru tetap mengajar (walau bentrok) agar sistem mencatat
                const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
                teacherBusy.set(teacherDayKey, true)
                guruSlotKelas.set(teacherDayKey, block.kelasId)
              }
              const kDays = kelasDaysMap.get(block.kelasId) || new Set()
              kDays.add(day)
              kelasDaysMap.set(block.kelasId, kDays)
              markPlaced(block.kelasId, block.mataPelajaranId, day, block.jpCount)
              placed = true
              break
            }
          }
          if (placed) break
        }
      }

      if (!placed) {
        unplaced.push({
          kelasId: block.kelasId,
          mataPelajaranId: block.mataPelajaranId,
          guruId: block.guruId,
          jpCount: block.jpCount,
        })
      }
    }
    success = true
  }

  // ── Jika ada kegiatan yang tidak bisa dijadwalkan: batalkan, jangan simpan partial ──
  if (unplaced.length > 0) {
    const ringkas = unplaced
      .slice(0, 5)
      .map((u) => `${u.mataPelajaranId.slice(0, 8)} (Kelas ${namaKelas?.get(u.kelasId) || u.kelasId.slice(0, 8)}, ${u.jpCount} JP)`)
      .join("; ")
    const sisa = unplaced.length > 5 ? `, dan ${unplaced.length - 5} lainnya` : ""
    return {
      ok: false,
      error:
        `Generate dibatalkan: ${unplaced.length} kegiatan tidak dapat dijadwalkan (${ringkas}${sisa}). ` +
        `Solusi: (1) kurangi jumlah JP di Plotting Pengajar, ` +
        `(2) tambah slot JP di Pengaturan Jadwal, atau (3) kurangi hari libur yang dipilih.`,
      assigned,
      reasons,
      blocks,
      academicSlotsPerDay,
      kapasitasPerKelas,
      kapasitasRealistisPerKelas,
      totalJp: 0,
    }
  }

  const totalJp = blocks.reduce((sum, b) => sum + b.jpCount, 0)
  return {
    ok: true,
    assigned,
    reasons,
    blocks,
    academicSlotsPerDay,
    kapasitasPerKelas,
    kapasitasRealistisPerKelas,
    totalJp,
  }
}

// Backtracking solver with smart spacing logic constraints
function runBacktrackingSolver(
  blocks: { id: string; kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[],
  index: number,
  assigned: Map<string, { mataPelajaranId: string; guruId: string; jpCount: number }>,
  teacherBusy: Map<string, boolean>,
  activeDays: string[],
  academicSlotsPerDay: Map<string, number[]>,
  teacherExclusions: Set<string>,
  kelasDaysMap: Map<string, Set<string>>,
  kelasLoad: Map<string, Map<string, number>>,
  kelasMapelDays: Map<string, Map<string, Set<string>>>,
  guruSlotKelas: Map<string, string>,
  state: { steps: number; maxSteps: number; aborted?: boolean } | undefined,
  options: { avoidSame: boolean; avoidConsecutive: boolean },
  recordReason?: (slotKey: string, msg: string) => void,
  namaGuru?: Map<string, string>,
  namaKelas?: Map<string, string>
): boolean {
  if (state) {
    if (state.aborted) return false
    state.steps++
    if (state.steps > state.maxSteps) {
      state.aborted = true
      return false
    }
  }

  if (index >= blocks.length) return true

  const block = blocks[index]
  const key = `${block.kelasId}-${block.mataPelajaranId}-${block.guruId}`
  const kelasDays = kelasDaysMap.get(block.kelasId) || new Set()

  // Least-loaded balancing: cari hari dengan beban JP terendah via map O(1)
  const loadPerDay = kelasLoad.get(block.kelasId)
  const dayLoad = (day: string) => loadPerDay?.get(day) ?? 0
  const orderedDays = [...activeDays].sort((a, b) => dayLoad(a) - dayLoad(b))

  // Mapel yang sudah dijadwalkan per hari (O(1) lookup)
  const mapelDaySet = kelasMapelDays.get(block.kelasId)?.get(block.mataPelajaranId)

  // Try each active day
  for (const day of orderedDays) {
    if (state?.aborted) break
    const slots: number[] = academicSlotsPerDay.get(day) || []
    if (slots.length === 0) continue

    // Spacing constraints check
    if (options.avoidSame) {
      if (mapelDaySet?.has(day)) continue
    }

    if (options.avoidConsecutive) {
      const weekdaysOrder = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]
      const idxCurrent = weekdaysOrder.indexOf(day)
      if (mapelDaySet) {
        let alreadyScheduledConsecutive = false
        for (const otherDay of mapelDaySet) {
          const idxOther = weekdaysOrder.indexOf(otherDay)
          if (idxCurrent !== -1 && idxOther !== -1 && Math.abs(idxCurrent - idxOther) === 1) {
            alreadyScheduledConsecutive = true
            break
          }
        }
        if (alreadyScheduledConsecutive) continue
      }
    }

    // Try each possible starting academic JP slot
    for (let startIdx = 0; startIdx <= slots.length - block.jpCount; startIdx++) {
      if (state?.aborted) break
      const startJp = slots[startIdx]
      let conflict = false

      // Check if all slots are within bounds and not occupied
      for (let offset = 0; offset < block.jpCount; offset++) {
        const slotJp = slots[startIdx + offset]
        if (slotJp === undefined) {
          conflict = true
          break
        }

        const slotKey = `${block.kelasId}|${day}|${slotJp}`
        if (assigned.has(slotKey)) {
          conflict = true
          break
        }

        // Check teacher exclusion
        const teacherKey = `${block.guruId}|${day}|${slotJp}`
        if (teacherExclusions.has(teacherKey)) {
          conflict = true
          if (recordReason) {
            recordReason(slotKey, `Guru ${namaGuru?.get(block.guruId) || "terkait"} tidak tersedia di slot ini (pengecualian)`)
          }
          break
        }
      }

      if (conflict) continue

      // Also ensure teacher is not already teaching at this time on this day
      for (let offset = 0; offset < block.jpCount; offset++) {
        const slotJp = slots[startIdx + offset]
        const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
        if (teacherBusy.get(teacherDayKey)) {
          conflict = true
          if (recordReason) {
            const slotKey = `${block.kelasId}|${day}|${slotJp}`
            const otherKelasId = guruSlotKelas.get(teacherDayKey) || ""
            recordReason(slotKey, `Guru ${namaGuru?.get(block.guruId) || "terkait"} sedang mengajar Kelas ${namaKelas?.get(otherKelasId) || otherKelasId} di slot ini`)
          }
          break
        }
      }

      if (conflict) continue

      // Assign slots
      for (let offset = 0; offset < block.jpCount; offset++) {
        const slotJp = slots[startIdx + offset]
        const slotKey = `${block.kelasId}|${day}|${slotJp}`
        assigned.set(slotKey, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId, jpCount: block.jpCount })

        const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
        teacherBusy.set(teacherDayKey, true)
        guruSlotKelas.set(teacherDayKey, block.kelasId)
      }
      kelasDays.add(day)
      kelasDaysMap.set(block.kelasId, kelasDays)

      // Update O(1) tracking maps
      const loadMap = kelasLoad.get(block.kelasId) || new Map<string, number>()
      loadMap.set(day, (loadMap.get(day) ?? 0) + block.jpCount)
      kelasLoad.set(block.kelasId, loadMap)
      const mDays = kelasMapelDays.get(block.kelasId) || new Map<string, Set<string>>()
      const mDaySet = mDays.get(block.mataPelajaranId) || new Set<string>()
      mDaySet.add(day)
      mDays.set(block.mataPelajaranId, mDaySet)
      kelasMapelDays.set(block.kelasId, mDays)

      if (runBacktrackingSolver(blocks, index + 1, assigned, teacherBusy, activeDays, academicSlotsPerDay, teacherExclusions, kelasDaysMap, kelasLoad, kelasMapelDays, guruSlotKelas, state, options, recordReason, namaGuru, namaKelas)) {
        return true
      }

      // Backtrack
      for (let offset = 0; offset < block.jpCount; offset++) {
        const slotJp = slots[startIdx + offset]
        const slotKey = `${block.kelasId}|${day}|${slotJp}`
        assigned.delete(slotKey)

        const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
        teacherBusy.delete(teacherDayKey)
        guruSlotKelas.delete(teacherDayKey)
      }
      kelasDays.delete(day)

      // Rollback O(1) tracking maps
      loadMap.set(day, (loadMap.get(day) ?? 0) - block.jpCount)
      mDaySet.delete(day)
    }
  }

  return false
}
