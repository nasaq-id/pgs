import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { jadwalPelajaran, kelas, pengaturanJadwal, timelineItem, pengampu } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

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

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number)
  return new Date(1970, 0, 1, h, m, 0)
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
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
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
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)

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
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
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
    .input(jadwalCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }

      const sekolahId = sekolahIdFilter ?? ctx.session.user.sekolahId ?? ""
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
    .input(z.object({ id: z.string(), data: jadwalUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      if (input.data.kelasId && sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.data.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }

      const sekolahId = sekolahIdFilter ?? ctx.session.user.sekolahId ?? ""
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
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      await db.delete(jadwalPelajaran).where(eq(jadwalPelajaran.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "jadwal_pelajaran", entityId: input.id })
      return { success: true }
    }),

  autoGenerate: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(autoGenerateInputSchema)
    .mutation(async ({ ctx, input }) => {
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
      const activeDays = hariRows
        .map(r => r.hari)
        .filter(h => !hariLiburSet.has(h as any))

      if (activeDays.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tidak ada hari aktif yang tersisa. Silakan sesuaikan pilihan hari libur sekolah." })
      }

      // 1. Get allocations from input or automatically from DB plotting pengajar (pengampu)
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

      // Get all timeline items for slot mapping
      const timelineList = await db.query.timelineItem.findMany({
        where: and(
          eq(timelineItem.pengaturanJadwalId, pengaturanJadwalId),
        ),
        orderBy: [asc(timelineItem.urutan)],
      })

      const durasiJP = pengaturan.durasiJP ?? 40
      const startMinutes = pengaturan.jamMulai ? timeToMinutes(pengaturan.jamMulai) : 420

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

      // Convert constraints to a fast-lookup Set "guruId-day-academicJp"
      const teacherExclusions = new Set<string>()
      for (const c of (input.constraints || [])) {
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

      // Split large blocks to max 2 or 3 JP per day
      const blocks: { id: string; kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[] = []
      for (const alloc of allocations) {
        let remaining = alloc.jpCount
        let part = 1
        while (remaining > 0) {
          const chunk = remaining >= 4 ? 2 : (remaining === 3 ? 2 : remaining)
          blocks.push({
            id: `${alloc.kelasId}-${alloc.mataPelajaranId}-${alloc.guruId}-${part++}`,
            kelasId: alloc.kelasId,
            mataPelajaranId: alloc.mataPelajaranId,
            guruId: alloc.guruId,
            jpCount: chunk,
          })
          remaining -= chunk
        }
      }

      // Sort by size descending as base ordering
      blocks.sort((a, b) => b.jpCount - a.jpCount)

      const assigned = new Map<string, { mataPelajaranId: string; guruId: string }>()
      const teacherBusy = new Map<string, boolean>()
      const kelasDaysMap = new Map<string, Set<string>>()

      let success = false

      // ── PHASE 1: Backtracking dengan Pengecualian Guru & Shuffling (Mencari Solusi Sempurna) ──
      for (let attempt = 0; attempt < 30; attempt++) {
        assigned.clear()
        teacherBusy.clear()
        kelasDaysMap.clear()

        const shuffledBlocks = [...blocks]
        if (attempt > 0) {
          // Acak urutan block secara acak untuk meloloskan diri dari search bottleneck
          for (let i = shuffledBlocks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const temp = shuffledBlocks[i]!
            shuffledBlocks[i] = shuffledBlocks[j]!
            shuffledBlocks[j] = temp
          }
        }

        const options = {
          avoidSame: attempt < 20,
          avoidConsecutive: attempt < 10,
        }

        const solverState = { steps: 0, maxSteps: 2000 }
        success = runBacktrackingSolver(
          shuffledBlocks,
          0,
          assigned,
          teacherBusy,
          [...activeDays],
          academicSlotsPerDay,
          teacherExclusions,
          kelasDaysMap,
          solverState,
          options
        )
        if (success) {
          blocks.length = 0
          blocks.push(...shuffledBlocks)
          break
        }
      }

      // ── PHASE 2: Jika gagal, rileksasikan aturan jam berhalangan guru (Teacher Exclusions) ──
      if (!success && teacherExclusions.size > 0) {
        for (let attempt = 0; attempt < 30; attempt++) {
          assigned.clear()
          teacherBusy.clear()
          kelasDaysMap.clear()

          const shuffledBlocks = [...blocks]
          if (attempt > 0) {
            for (let i = shuffledBlocks.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              const temp = shuffledBlocks[i]!
              shuffledBlocks[i] = shuffledBlocks[j]!
              shuffledBlocks[j] = temp
            }
          }

          const options = {
            avoidSame: attempt < 20,
            avoidConsecutive: attempt < 10,
          }

          const solverState = { steps: 0, maxSteps: 2000 }
          success = runBacktrackingSolver(
            shuffledBlocks,
            0,
            assigned,
            teacherBusy,
            [...activeDays],
            academicSlotsPerDay,
            new Set(), // Rileksasikan pengecualian guru
            kelasDaysMap,
            solverState,
            options
          )
          if (success) {
            blocks.length = 0
            blocks.push(...shuffledBlocks)
            break
          }
        }
      }

      // ── PHASE 3: Jika masih gagal (mathematically overloaded), jalankan Greedy Placement ──
      // Ini menjamin jadwal SELALU berhasil di-generate dengan meminimalkan bentrok guru.
      if (!success) {
        assigned.clear()
        teacherBusy.clear()
        kelasDaysMap.clear()

        // Urutkan kembali berdasarkan JP terbesar
        blocks.sort((a, b) => b.jpCount - a.jpCount)

        for (const block of blocks) {
          const slotsPerDayList = [...activeDays].map(day => ({
            day,
            slots: academicSlotsPerDay.get(day) || []
          }))

          let placed = false

          // Langkah A: Cari slot kosong kelas & guru tidak sedang mengajar
          for (const { day, slots } of slotsPerDayList) {
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
                }
              }

              if (!classConflict && !teacherConflict) {
                for (let offset = 0; offset < block.jpCount; offset++) {
                  const slotJp = slots[startIdx + offset]
                  const slotKey = `${block.kelasId}|${day}|${slotJp}`
                  assigned.set(slotKey, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId })

                  const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
                  teacherBusy.set(teacherDayKey, true)
                }
                const kDays = kelasDaysMap.get(block.kelasId) || new Set()
                kDays.add(day)
                kelasDaysMap.set(block.kelasId, kDays)
                placed = true
                break
              }
            }
            if (placed) break
          }

          // Langkah B: Jika terpaksa bentrok guru, yang penting kelasnya kosong (bentrok guru minimal)
          if (!placed) {
            for (const { day, slots } of slotsPerDayList) {
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
                    assigned.set(slotKey, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId })

                    // Tandai guru tetap mengajar (walau bentrok) agar sistem mencatat
                    const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
                    teacherBusy.set(teacherDayKey, true)
                  }
                  const kDays = kelasDaysMap.get(block.kelasId) || new Set()
                  kDays.add(day)
                  kelasDaysMap.set(block.kelasId, kDays)
                  placed = true
                  break
                }
              }
              if (placed) break
            }
          }
        }
        success = true
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

      const assignmentsList = Array.from(assigned.entries()).map(([key, val]) => {
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

      await logAudit(ctx, { action: "create", entity: "jadwal_pelajaran", entityId: "auto-generate", metadata: { kelasIds: targetKelasIds } })
      return { success: true }
    }),
})

// Backtracking solver with smart spacing logic constraints
function runBacktrackingSolver(
  blocks: { id: string; kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[],
  index: number,
  assigned: Map<string, { mataPelajaranId: string; guruId: string }>,
  teacherBusy: Map<string, boolean>,
  activeDays: string[],
  academicSlotsPerDay: Map<string, number[]>,
  teacherExclusions: Set<string>,
  kelasDaysMap: Map<string, Set<string>>,
  state: { steps: number; maxSteps: number } | undefined,
  options: { avoidSame: boolean; avoidConsecutive: boolean }
): boolean {
  if (state) {
    state.steps++
    if (state.steps > state.maxSteps) return false
  }

  if (index >= blocks.length) return true

  const block = blocks[index]
  const key = `${block.kelasId}-${block.mataPelajaranId}-${block.guruId}`
  const kelasDays = kelasDaysMap.get(block.kelasId) || new Set()

  // Try each active day
  for (const day of activeDays) {
    const slots: number[] = academicSlotsPerDay.get(day) || []
    if (slots.length === 0) continue

    // Spacing constraints check
    if (options.avoidSame) {
      let alreadyScheduledOnDay = false
      for (const [sKey, sVal] of assigned.entries()) {
        const [kId, d, ] = sKey.split("|")
        if (kId === block.kelasId && d === day && sVal.mataPelajaranId === block.mataPelajaranId) {
          alreadyScheduledOnDay = true
          break
        }
      }
      if (alreadyScheduledOnDay) continue
    }

    if (options.avoidConsecutive) {
      const weekdaysOrder = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]
      const idxCurrent = weekdaysOrder.indexOf(day)
      let alreadyScheduledConsecutive = false
      for (const [sKey, sVal] of assigned.entries()) {
        const [kId, d, ] = sKey.split("|")
        if (kId === block.kelasId && sVal.mataPelajaranId === block.mataPelajaranId) {
          const idxOther = weekdaysOrder.indexOf(d)
          if (idxCurrent !== -1 && idxOther !== -1 && Math.abs(idxCurrent - idxOther) === 1) {
            alreadyScheduledConsecutive = true
            break
          }
        }
      }
      if (alreadyScheduledConsecutive) continue
    }

    // Try each possible starting academic JP slot
    for (let startIdx = 0; startIdx <= slots.length - block.jpCount; startIdx++) {
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
          break
        }
      }

      if (conflict) continue

      // Assign slots
      for (let offset = 0; offset < block.jpCount; offset++) {
        const slotJp = slots[startIdx + offset]
        const slotKey = `${block.kelasId}|${day}|${slotJp}`
        assigned.set(slotKey, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId })

        const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
        teacherBusy.set(teacherDayKey, true)
      }
      kelasDays.add(day)
      kelasDaysMap.set(block.kelasId, kelasDays)

      if (runBacktrackingSolver(blocks, index + 1, assigned, teacherBusy, activeDays, academicSlotsPerDay, teacherExclusions, kelasDaysMap, state, options)) {
        return true
      }

      // Backtrack
      for (let offset = 0; offset < block.jpCount; offset++) {
        const slotJp = slots[startIdx + offset]
        const slotKey = `${block.kelasId}|${day}|${slotJp}`
        assigned.delete(slotKey)

        const teacherDayKey = `${block.guruId}|${day}|${slotJp}`
        teacherBusy.delete(teacherDayKey)
      }
      kelasDays.delete(day)
    }
  }

  return false
}
