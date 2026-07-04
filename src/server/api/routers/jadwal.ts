import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { jadwalPelajaran, kelas, agendaKhusus, pengaturanJadwal } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

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
  allocations: z.array(
    z.object({
      kelasId: z.string(),
      mataPelajaranId: z.string(),
      guruId: z.string(),
      jpCount: z.number().min(1).max(10),
    })
  ),
  constraints: z.array(
    z.object({
      guruId: z.string(),
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      jpMulai: z.number().min(1),
      jpSelesai: z.number().min(1),
    })
  ),
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
  sekolahId: string,
  hari: string,
  jpMulai: number,
  jpCount: number
): Promise<{ jamMulai: Date; jamSelesai: Date }> {
  const pengaturan = await db.query.pengaturanJadwal.findFirst({
    where: eq(pengaturanJadwal.sekolahId, sekolahId),
  })
  const agendaList = await db.query.agendaKhusus.findMany({
    where: eq(agendaKhusus.sekolahId, sekolahId),
    orderBy: asc(agendaKhusus.urutan),
  })

  const durasiJP = pengaturan?.durasiJP ?? 40
  const startMinutes = pengaturan?.jamMulai ? timeToMinutes(pengaturan.jamMulai) : 420
  const endMinutes = pengaturan?.jamPulang ? timeToMinutes(pengaturan.jamPulang) : 900
  const totalJpSlots = Math.floor((endMinutes - startMinutes) / durasiJP)

  // Map absolute slots
  const map: { absoluteJp: number; isAcademic: boolean; academicJp: number | null }[] = []
  let academicCounter = 1

  for (let jp = 1; jp <= totalJpSlots; jp++) {
    const slotStart = startMinutes + (jp - 1) * durasiJP
    const slotEnd = startMinutes + jp * durasiJP

    const isAgenda = agendaList.some((a) => {
      if (a.hari !== hari) return false
      const agendaStart = timeToMinutes(a.jamMulai)
      const agendaEnd = timeToMinutes(a.jamSelesai)
      return slotStart < agendaEnd && slotEnd > agendaStart
    })

    if (isAgenda) {
      map.push({ absoluteJp: jp, isAcademic: false, academicJp: null })
    } else {
      map.push({ absoluteJp: jp, isAcademic: true, academicJp: academicCounter++ })
    }
  }

  const academicSlots = map.filter((s) => s.academicJp !== null)
  const startSlot = academicSlots.find((s) => s.academicJp === jpMulai)
  const endSlot = academicSlots.find((s) => s.academicJp === jpMulai + jpCount - 1)

  const startAbsJp = startSlot ? startSlot.absoluteJp : jpMulai
  const endAbsJp = endSlot ? endSlot.absoluteJp : jpMulai + jpCount - 1

  const slotStartMin = startMinutes + (startAbsJp - 1) * durasiJP
  const slotEndMin = startMinutes + endAbsJp * durasiJP

  const jamMulaiTime = minutesToTime(slotStartMin)
  const jamSelesaiTime = minutesToTime(slotEndMin)

  return {
    jamMulai: timeStringToDate(jamMulaiTime),
    jamSelesai: timeStringToDate(jamSelesaiTime),
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

  // Sort: jpMulai ascending. If tie, anchor goes first.
  allItems.sort((a, b) => {
    if (a.jpMulai !== b.jpMulai) return a.jpMulai - b.jpMulai
    if (a.isAnchor) return -1
    if (b.isAnchor) return 1
    return 0
  })

  let nextAvailableJp = 1
  const shiftedItems: { id: string; jpMulai: number }[] = []

  for (const item of allItems) {
    if (item.jpMulai < nextAvailableJp) {
      if (!item.isAnchor) {
        shiftedItems.push({ id: item.id, jpMulai: nextAvailableJp })
      }
      nextAvailableJp = nextAvailableJp + item.jpCount
    } else {
      nextAvailableJp = item.jpMulai + item.jpCount
    }
  }

  // Apply shifts to database
  for (const shift of shiftedItems) {
    const orig = existing.find((s) => s.id === shift.id)!
    const { jamMulai, jamSelesai } = await computeTimesForJadwal(
      sekolahId,
      hari,
      shift.jpMulai,
      orig.jpCount!
    )
    await db
      .update(jadwalPelajaran)
      .set({
        jpMulai: shift.jpMulai,
        jamMulai,
        jamSelesai,
      })
      .where(eq(jadwalPelajaran.id, shift.id))
  }
}

function runBacktrackingSolver(
  blocks: { id: string; kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[],
  blockIndex: number,
  assigned: Map<string, { mataPelajaranId: string; guruId: string }>,
  teacherBusy: Map<string, boolean>,
  daysList: string[],
  academicSlotsPerDay: Map<string, number[]>,
  teacherExclusions: Set<string>,
  kelasDaysMap: Map<string, Set<string>>
): boolean {
  if (blockIndex === blocks.length) {
    return true
  }

  const block = blocks[blockIndex]

  // Heuristic: try to distribute subjects across days
  const mapelKey = `${block.kelasId}|${block.mataPelajaranId}`
  const mapelDays = kelasDaysMap.get(mapelKey) || new Set<string>()

  for (const day of daysList) {
    // Avoid double mapping same mapel on same day unless necessary
    if (mapelDays.has(day) && mapelDays.size < daysList.length) {
      continue
    }

    const slots = academicSlotsPerDay.get(day) || []
    for (let i = 0; i <= slots.length - block.jpCount; i++) {
      const startJp = slots[i]
      let canPlace = true

      for (let offset = 0; offset < block.jpCount; offset++) {
        const jp = startJp + offset
        const slotKey = `${block.kelasId}|${day}|${jp}`
        const teacherKey = `${block.guruId}|${day}|${jp}`

        if (assigned.has(slotKey) || teacherBusy.has(teacherKey) || teacherExclusions.has(teacherKey)) {
          canPlace = false
          break
        }
      }

      if (canPlace) {
        // Place
        for (let offset = 0; offset < block.jpCount; offset++) {
          const jp = startJp + offset
          assigned.set(`${block.kelasId}|${day}|${jp}`, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId })
          teacherBusy.set(`${block.guruId}|${day}|${jp}`, true)
        }
        mapelDays.add(day)
        kelasDaysMap.set(mapelKey, mapelDays)

        if (runBacktrackingSolver(blocks, blockIndex + 1, assigned, teacherBusy, daysList, academicSlotsPerDay, teacherExclusions, kelasDaysMap)) {
          return true
        }

        // Backtrack
        for (let offset = 0; offset < block.jpCount; offset++) {
          const jp = startJp + offset
          assigned.delete(`${block.kelasId}|${day}|${jp}`)
          teacherBusy.delete(`${block.guruId}|${day}|${jp}`)
        }
        mapelDays.delete(day)
      }
    }
  }

  // Fallback: try all days without the daily subject distribution heuristic
  for (const day of daysList) {
    const slots = academicSlotsPerDay.get(day) || []
    for (let i = 0; i <= slots.length - block.jpCount; i++) {
      const startJp = slots[i]
      let canPlace = true

      for (let offset = 0; offset < block.jpCount; offset++) {
        const jp = startJp + offset
        const slotKey = `${block.kelasId}|${day}|${jp}`
        const teacherKey = `${block.guruId}|${day}|${jp}`

        if (assigned.has(slotKey) || teacherBusy.has(teacherKey) || teacherExclusions.has(teacherKey)) {
          canPlace = false
          break
        }
      }

      if (canPlace) {
        for (let offset = 0; offset < block.jpCount; offset++) {
          const jp = startJp + offset
          assigned.set(`${block.kelasId}|${day}|${jp}`, { mataPelajaranId: block.mataPelajaranId, guruId: block.guruId })
          teacherBusy.set(`${block.guruId}|${day}|${jp}`, true)
        }

        if (runBacktrackingSolver(blocks, blockIndex + 1, assigned, teacherBusy, daysList, academicSlotsPerDay, teacherExclusions, kelasDaysMap)) {
          return true
        }

        for (let offset = 0; offset < block.jpCount; offset++) {
          const jp = startJp + offset
          assigned.delete(`${block.kelasId}|${day}|${jp}`)
          teacherBusy.delete(`${block.guruId}|${day}|${jp}`)
        }
      }
    }
  }

  return false
}

export const jadwalRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        kelasId: z.string().optional(),
        hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]).optional(),
        sortBy: z.enum(["hari", "jamMulai"]).optional().default("jamMulai"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = []
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        conditions.push(inArray(jadwalPelajaran.kelasId, kelasIds))
      }
      if (input.kelasId) conditions.push(eq(jadwalPelajaran.kelasId, input.kelasId))
      if (input.hari) conditions.push(eq(jadwalPelajaran.hari, input.hari))
      const orderBy = input.sortOrder === "asc" ? asc(jadwalPelajaran[input.sortBy]) : desc(jadwalPelajaran[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select()
        .from(jadwalPelajaran)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const result = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true, mataPelajaran: true, guru: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (sekolahIdFilter && result.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      return result
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
      
      // Auto sequential shifting logic
      if (input.jpMulai !== null && input.jpMulai !== undefined && input.jpCount !== null && input.jpCount !== undefined) {
        await shiftSchedulesIfNeeded(sekolahId, input.kelasId, input.hari, input.jpMulai, input.jpCount)
      }

      // Auto time calculation
      let { jamMulai, jamSelesai } = input
      if (input.jpMulai !== null && input.jpMulai !== undefined && input.jpCount !== null && input.jpCount !== undefined) {
        const computed = await computeTimesForJadwal(sekolahId, input.hari, input.jpMulai, input.jpCount)
        jamMulai = computed.jamMulai
        jamSelesai = computed.jamSelesai
      }

      const id = input.id || crypto.randomUUID()
      const result = await db.insert(jadwalPelajaran).values({
        ...input,
        id,
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

      // Auto sequential shifting logic
      if (newJpMulai !== null && newJpMulai !== undefined && newJpCount !== null && newJpCount !== undefined) {
        await shiftSchedulesIfNeeded(sekolahId, newKelasId, newHari, newJpMulai, newJpCount, input.id)
      }

      // Auto time calculation
      let { jamMulai, jamSelesai } = input.data
      if (newJpMulai !== null && newJpMulai !== undefined && newJpCount !== null && newJpCount !== undefined) {
        const computed = await computeTimesForJadwal(sekolahId, newHari, newJpMulai, newJpCount)
        jamMulai = computed.jamMulai
        jamSelesai = computed.jamSelesai
      }

      const result = await db
        .update(jadwalPelajaran)
        .set({
          ...input.data,
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

      // Fetch active days from pengaturanJadwal
      const pengaturan = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      const activeDays: string[] = pengaturan?.hariAktif ? JSON.parse(pengaturan.hariAktif) : ["senin", "selasa", "rabu", "kamis", "jumat"]
      
      const agendaList = await db.query.agendaKhusus.findMany({
        where: eq(agendaKhusus.sekolahId, sekolahId),
      })

      const durasiJP = pengaturan?.durasiJP ?? 40
      const startMinutes = pengaturan?.jamMulai ? timeToMinutes(pengaturan.jamMulai) : 420
      const endMinutes = pengaturan?.jamPulang ? timeToMinutes(pengaturan.jamPulang) : 900
      const totalJpSlots = Math.floor((endMinutes - startMinutes) / durasiJP)

      // Pre-map academic slots per day
      const academicSlotsPerDay = new Map<string, number[]>()
      for (const day of activeDays) {
        const slots: number[] = []
        let academicCounter = 1
        for (let jp = 1; jp <= totalJpSlots; jp++) {
          const slotStart = startMinutes + (jp - 1) * durasiJP
          const slotEnd = startMinutes + jp * durasiJP
          const isAgenda = agendaList.some((a) => {
            if (a.hari !== day) return false
            const agendaStart = timeToMinutes(a.jamMulai)
            const agendaEnd = timeToMinutes(a.jamSelesai)
            return slotStart < agendaEnd && slotEnd > agendaStart
          })
          if (!isAgenda) {
            slots.push(academicCounter++)
          }
        }
        academicSlotsPerDay.set(day, slots)
      }

      // Convert constraints to a fast-lookup Set "guruId-day-academicJp"
      const teacherExclusions = new Set<string>()
      for (const c of input.constraints) {
        const slotsForDay = academicSlotsPerDay.get(c.hari) || []
        for (let jp = c.jpMulai; jp <= c.jpSelesai; jp++) {
          const slotStart = startMinutes + (jp - 1) * durasiJP
          const slotEnd = startMinutes + jp * durasiJP
          const isAgenda = agendaList.some((a) => {
            if (a.hari !== c.hari) return false
            const agendaStart = timeToMinutes(a.jamMulai)
            const agendaEnd = timeToMinutes(a.jamSelesai)
            return slotStart < agendaEnd && slotEnd > agendaStart
          })
          if (!isAgenda) {
            let academicIndex = 1
            for (let x = 1; x < jp; x++) {
              const xStart = startMinutes + (x - 1) * durasiJP
              const xEnd = startMinutes + x * durasiJP
              const xAgenda = agendaList.some((a) => {
                if (a.hari !== c.hari) return false
                const agendaStart = timeToMinutes(a.jamMulai)
                const agendaEnd = timeToMinutes(a.jamSelesai)
                return xStart < agendaEnd && xEnd > agendaStart
              })
              if (!xAgenda) academicIndex++
            }
             teacherExclusions.add(`${c.guruId}|${c.hari}|${academicIndex}`)
          }
        }
      }

      // Split large blocks to max 2 or 3 JP per day
      const blocks: { id: string; kelasId: string; mataPelajaranId: string; guruId: string; jpCount: number }[] = []
      for (const alloc of input.allocations) {
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

      // Sort by size descending (LPT Heuristic) to run solver much faster
      blocks.sort((a, b) => b.jpCount - a.jpCount)

      const assigned = new Map<string, { mataPelajaranId: string; guruId: string }>()
      const teacherBusy = new Map<string, boolean>()
      const kelasDaysMap = new Map<string, Set<string>>()

      // Run solver
      const success = runBacktrackingSolver(
        blocks,
        0,
        assigned,
        teacherBusy,
        activeDays,
        academicSlotsPerDay,
        teacherExclusions,
        kelasDaysMap
      )

      if (!success) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Gagal men-generate jadwal otomatis. Terjadi bentrok yang tidak dapat dihindari. Silakan ubah alokasi mengajar atau sesuaikan pengecualian guru.",
        })
      }

      // Delete existing schedules for the classes we generated
      const targetKelasIds = Array.from(new Set(input.allocations.map((a) => a.kelasId)))
      if (targetKelasIds.length > 0) {
        await db.delete(jadwalPelajaran).where(inArray(jadwalPelajaran.kelasId, targetKelasIds))
      }

      // Group contiguous assignments into single records to match schema expectation
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
        const { jamMulai, jamSelesai } = await computeTimesForJadwal(sekolahId, g.hari, g.jpMulai, g.jpCount)
        insertData.push({
          id: crypto.randomUUID(),
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

