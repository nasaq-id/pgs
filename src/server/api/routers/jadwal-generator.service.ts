import { eq, and, or, isNull, inArray, asc, desc } from "drizzle-orm"
import { db } from "@/server/db"
import {
  jadwalPelajaran,
  kelas,
  pengampu,
  timelineItem,
  mataPelajaran,
  guru,
} from "@/server/db/schema"
import crypto from "crypto"

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export type HariType = "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"

export interface SlotWaktuDTO {
  id: string
  hari: HariType
  jamKe: number // urutan
  jamMulai: string
  jamSelesai: string
}

export interface KelasMataPelajaranDTO {
  id: string
  kelasId: string
  mataPelajaranId: string
  mataPelajaranNama: string
  guruId: string
  guruNama: string
  totalJPPerMinggu: number
  maxJPPerPertemuan: number
}

interface BlockPlacement {
  hari: HariType
  slots: SlotWaktuDTO[]
}

type FullPlacement = BlockPlacement[]

interface Assignment {
  kelasMataPelajaranId: string
  kelasId: string
  guruId: string
  mataPelajaranId: string
  hari: HariType
  jpMulai: number
  jpCount: number
  jamMulai: string
  jamSelesai: string
}

interface QueueItem {
  kmp: KelasMataPelajaranDTO
  blocks: number[]
}

export class JadwalGenerationError extends Error {
  constructor(message: string, public readonly detail?: unknown) {
    super(message)
    this.name = "JadwalGenerationError"
  }
}

const MAX_CANDIDATES_PER_KMP = 60

// ---------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------

export function splitIntoBlocks(totalJP: number, maxPerPertemuan: number): number[] {
  if (totalJP <= 0) return []
  if (maxPerPertemuan <= 0) {
    throw new JadwalGenerationError("maxJPPerPertemuan harus > 0")
  }
  const jumlahPertemuan = Math.ceil(totalJP / maxPerPertemuan)
  const base = Math.floor(totalJP / jumlahPertemuan)
  let sisa = totalJP % jumlahPertemuan
  const blocks: number[] = []
  for (let i = 0; i < jumlahPertemuan; i++) {
    blocks.push(base + (sisa > 0 ? 1 : 0))
    if (sisa > 0) sisa--
  }
  return blocks.sort((a, b) => b - a)
}

function findConsecutiveWindows(
  slotsForHari: SlotWaktuDTO[],
  blockSize: number
): SlotWaktuDTO[][] {
  const sorted = [...slotsForHari].sort((a, b) => a.jamKe - b.jamKe)
  const runs: SlotWaktuDTO[][] = []
  let current: SlotWaktuDTO[] = []

  for (let i = 0; i < sorted.length; i++) {
    const slot = sorted[i]
    const prev = sorted[i - 1]
    if (prev && slot.jamKe === prev.jamKe + 1) {
      current.push(slot)
    } else {
      if (current.length) runs.push(current)
      current = [slot]
    }
  }
  if (current.length) runs.push(current)

  const windows: SlotWaktuDTO[][] = []
  for (const run of runs) {
    for (let start = 0; start + blockSize <= run.length; start++) {
      windows.push(run.slice(start, start + blockSize))
    }
  }
  return windows
}

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number)
  return new Date(Date.UTC(1970, 0, 1, h, m, 0))
}

// ---------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------

export class JadwalGeneratorService {
  private cachedAllSlots: SlotWaktuDTO[] = []

  constructor(private readonly sekolahId: string) {}

  async generateForKelas(params: {
    kelasId: string
    tahunAjaranId: string
    batchId?: string
    guruOccupancy?: Map<string, Set<string>> // guruId -> Set<"${hari}-${jamKe}">
    hariLibur?: string[]
  }): Promise<{ batchId: string; assignments: Assignment[] }> {
    const batchId = params.batchId ?? crypto.randomUUID()
    const guruOccupancy = params.guruOccupancy ?? (await this.loadGuruOccupancy(params.tahunAjaranId))

    // 1. Load active slots (timelineItem where tipe = "jp")
    let allSlotsRaw = await db
      .select({
        id: timelineItem.id,
        hari: timelineItem.hari,
        jamKe: timelineItem.urutan,
        jamMulai: timelineItem.jamMulai,
        jamSelesai: timelineItem.jamSelesai,
      })
      .from(timelineItem)
      .where(
        and(
          eq(timelineItem.sekolahId, this.sekolahId),
          eq(timelineItem.tipe, "jp")
        )
      )
      .orderBy(asc(timelineItem.hari), asc(timelineItem.urutan))

    // Filter out holiday days
    if (params.hariLibur && params.hariLibur.length > 0) {
      const lowerHolidays = params.hariLibur.map(h => h.toLowerCase())
      allSlotsRaw = allSlotsRaw.filter(
        (s) => !lowerHolidays.includes(String(s.hari).toLowerCase())
      )
    }

    const allSlots: SlotWaktuDTO[] = allSlotsRaw.map((s) => ({
      id: s.id,
      hari: s.hari as HariType,
      jamKe: s.jamKe,
      jamMulai: s.jamMulai,
      jamSelesai: s.jamSelesai,
    }))

    if (allSlots.length === 0) {
      throw new JadwalGenerationError(
        "Tidak ada slot pelajaran (Timeline Item tipe JP) yang dikonfigurasi. Harap atur timeline pelajaran terlebih dahulu."
      )
    }

    // 2. Load requirements from pengampu table
    const kmpRaw = await db
      .select({
        id: pengampu.id,
        kelasId: pengampu.kelasId,
        mataPelajaranId: pengampu.mataPelajaranId,
        mataPelajaranNama: mataPelajaran.namaMapel,
        guruId: pengampu.guruId,
        guruNama: guru.namaLengkap,
        totalJPPerMinggu: pengampu.jumlahJam,
        maxJPPerPertemuan: pengampu.maxJpPerPertemuan,
      })
      .from(pengampu)
      .innerJoin(mataPelajaran, eq(pengampu.mataPelajaranId, mataPelajaran.id))
      .innerJoin(guru, eq(pengampu.guruId, guru.id))
      .where(
        and(
          eq(pengampu.sekolahId, this.sekolahId),
          eq(pengampu.kelasId, params.kelasId),
          or(
            eq(pengampu.tahunAjaranId, params.tahunAjaranId),
            isNull(pengampu.tahunAjaranId)
          )
        )
      )

    if (kmpRaw.length === 0) {
      throw new JadwalGenerationError(
        "Kelas ini tidak memiliki data Plotting Pengajar (pengampu). Harap isi alokasi pengajar terlebih dahulu."
      )
    }

    const kmpList: KelasMataPelajaranDTO[] = kmpRaw.map((k) => ({
      id: k.id,
      kelasId: k.kelasId,
      mataPelajaranId: k.mataPelajaranId,
      mataPelajaranNama: k.mataPelajaranNama,
      guruId: k.guruId,
      guruNama: k.guruNama,
      totalJPPerMinggu: k.totalJPPerMinggu,
      maxJPPerPertemuan: k.maxJPPerPertemuan,
    }))

    // 3. Validate overall capacity
    const totalJPDibutuhkan = kmpList.reduce((sum, k) => sum + k.totalJPPerMinggu, 0)
    const totalSlotsAvailable = allSlots.length
    if (totalJPDibutuhkan > totalSlotsAvailable) {
      throw new JadwalGenerationError(
        `Kelas ini membutuhkan ${totalJPDibutuhkan} JP/minggu, tetapi slot pelajaran yang tersedia hanya ${totalSlotsAvailable} JP. ` +
          "Kurangi alokasi JP atau tambah slot timeline."
      )
    }

    // 4. Setup queue with MRV heuristic
    const queue: QueueItem[] = kmpList
      .map((kmp) => ({
        kmp,
        blocks: splitIntoBlocks(kmp.totalJPPerMinggu, kmp.maxJPPerPertemuan),
      }))
      .sort((a, b) => {
        const sisaA = this.hitungSlotTersisaUntukGuru(a.kmp.guruId, guruOccupancy, allSlots)
        const sisaB = this.hitungSlotTersisaUntukGuru(b.kmp.guruId, guruOccupancy, allSlots)
        return sisaA - sisaB
      })

    // 5. Backtracking solver
    this.cachedAllSlots = allSlots
    const kelasGrid = new Set<string>() // format: "${hari}-${jamKe}"
    const assignments: Assignment[] = []
    const failureLog: string[] = []

    let berhasil = this.backtrack(queue, 0, kelasGrid, guruOccupancy, assignments, failureLog, true)
    if (!berhasil) {
      berhasil = this.backtrack(queue, 0, kelasGrid, guruOccupancy, assignments, failureLog, false)
    }

    if (!berhasil) {
      throw new JadwalGenerationError(
        "Gagal menyusun jadwal secara penuh untuk kelas ini.",
        { failureLog }
      )
    }

    // 6. Persist draft into database
    try {
      await this.persistDraft(assignments, batchId)
    } catch (err) {
      // Rollback memory changes on DB persist failure
      for (const a of assignments) {
        const occupiedKeys = Array.from({ length: a.jpCount }, (_, i) => `${a.hari}-${a.jpMulai + i}`)
        for (const key of occupiedKeys) {
          guruOccupancy.get(a.guruId)?.delete(key)
        }
      }
      throw new JadwalGenerationError(
        "Gagal menyimpan draf jadwal ke database.",
        { originalError: err }
      )
    }

    return { batchId, assignments }
  }

  async generateForSekolah(params: {
    tahunAjaranId: string
    hariLibur?: string[]
  }): Promise<{
    batchId: string
    hasil: { kelasId: string; jumlahJPTerjadwal: number }[]
    gagal: { kelasId: string; error: string }[]
    tanpaPlotting: { kelasId: string; namaKelas: string }[]
  }> {
    const batchId = crypto.randomUUID()
    const guruOccupancy = await this.loadGuruOccupancy(params.tahunAjaranId)

    // Load all classes in the school
    const rombela = await db
      .select({ id: kelas.id, namaKelas: kelas.namaKelas })
      .from(kelas)
      .where(eq(kelas.sekolahId, this.sekolahId))

    // Sum JP per class to sort by total required JP (largest load first)
    const classJPList = await Promise.all(
      rombela.map(async (k) => {
        const rows = await db
          .select({ jumlahJam: pengampu.jumlahJam })
          .from(pengampu)
          .where(
            and(
              eq(pengampu.sekolahId, this.sekolahId),
              eq(pengampu.kelasId, k.id),
              or(
                eq(pengampu.tahunAjaranId, params.tahunAjaranId),
                isNull(pengampu.tahunAjaranId)
              )
            )
          )
        const sum = rows.reduce((acc, r) => acc + r.jumlahJam, 0)
        return { kelasId: k.id, namaKelas: k.namaKelas, totalJP: sum }
      })
    )

    const activeClasses = classJPList.filter((c) => c.totalJP > 0)
    const tanpaPlotting = classJPList
      .filter((c) => c.totalJP === 0)
      .map((c) => ({ kelasId: c.kelasId, namaKelas: c.namaKelas }))

    const urutanKelas = activeClasses
      .sort((a, b) => b.totalJP - a.totalJP)
      .map((k) => k.kelasId)

    const hasil: { kelasId: string; jumlahJPTerjadwal: number }[] = []
    const gagal: { kelasId: string; error: string }[] = []

    for (const kelasId of urutanKelas) {
      try {
        const { assignments } = await this.generateForKelas({
          kelasId,
          tahunAjaranId: params.tahunAjaranId,
          batchId,
          guruOccupancy,
          hariLibur: params.hariLibur,
        })
        const totalJp = assignments.reduce((sum, a) => sum + a.jpCount, 0)
        hasil.push({ kelasId, jumlahJPTerjadwal: totalJp })
      } catch (err) {
        const message = err instanceof JadwalGenerationError ? err.message : String(err)
        gagal.push({ kelasId, error: message })
      }
    }

    return { batchId, hasil, gagal, tanpaPlotting }
  }

  // ---------------------------------------------------------------------
  // Internal Solver Core
  // ---------------------------------------------------------------------

  private async loadGuruOccupancy(tahunAjaranId: string): Promise<Map<string, Set<string>>> {
    const existing = await db
      .select({
        guruId: jadwalPelajaran.guruId,
        hari: jadwalPelajaran.hari,
        jpMulai: jadwalPelajaran.jpMulai,
        jpCount: jadwalPelajaran.jpCount,
      })
      .from(jadwalPelajaran)
      .innerJoin(kelas, eq(jadwalPelajaran.kelasId, kelas.id))
      .where(
        and(
          eq(jadwalPelajaran.sekolahId, this.sekolahId),
          eq(kelas.tahunAjaranId, tahunAjaranId),
          eq(jadwalPelajaran.status, "PUBLISHED")
        )
      )

    const map = new Map<string, Set<string>>()
    for (const row of existing) {
      if (!row.guruId || !row.jpMulai || !row.jpCount) continue
      if (!map.has(row.guruId)) map.set(row.guruId, new Set())
      const set = map.get(row.guruId)!
      for (let i = 0; i < row.jpCount; i++) {
        set.add(`${row.hari}-${row.jpMulai + i}`)
      }
    }
    return map
  }

  private hitungSlotTersisaUntukGuru(
    guruId: string,
    guruOccupancy: Map<string, Set<string>>,
    allSlots: SlotWaktuDTO[]
  ): number {
    const terpakai = guruOccupancy.get(guruId)?.size ?? 0
    return allSlots.length - terpakai
  }

  private hasStudentGaps(assignments: Assignment[]): boolean {
    const dayOccupiedIndices = new Map<string, number[]>()

    for (const a of assignments) {
      const hari = a.hari
      if (!dayOccupiedIndices.has(hari)) {
        dayOccupiedIndices.set(hari, [])
      }

      const dayJpSlots = this.cachedAllSlots
        .filter((s) => s.hari === hari)
        .sort((a, b) => a.jamKe - b.jamKe)

      const startIndex = dayJpSlots.findIndex((s) => s.jamKe === a.jpMulai)
      if (startIndex === -1) continue

      const list = dayOccupiedIndices.get(hari)!
      for (let i = 0; i < a.jpCount; i++) {
        list.push(startIndex + i)
      }
    }

    for (const [hari, indices] of dayOccupiedIndices) {
      if (indices.length === 0) continue
      indices.sort((a, b) => a - b)
      
      const minIndex = indices[0]
      const maxIndex = indices[indices.length - 1]

      // Rule 1: Must start at Academic JP 1 (index 0)
      if (minIndex !== 0) return true

      // Rule 2: Must be contiguous
      const uniqueIndices = new Set(indices)
      if (uniqueIndices.size !== maxIndex + 1) return true
    }

    return false
  }

  private backtrack(
    queue: QueueItem[],
    index: number,
    kelasGrid: Set<string>,
    guruOccupancy: Map<string, Set<string>>,
    assignments: Assignment[],
    failureLog: string[],
    strictCompact = false,
    steps = { count: 0 }
  ): boolean {
    steps.count++
    if (strictCompact && steps.count > 5000) {
      return false // Early abort in strict mode to keep scheduler lightning fast!
    }

    if (index === queue.length) {
      if (strictCompact && this.hasStudentGaps(assignments)) {
        return false
      }
      return true
    }

    const { kmp, blocks } = queue[index]
    const kandidat = this.cariKandidatPlacement(blocks, kmp.guruId, kelasGrid, guruOccupancy)

    if (kandidat.length === 0) {
      failureLog.push(
        `${kmp.mataPelajaranNama} (guru: ${kmp.guruNama}) - tidak ada kombinasi slot yang muat ` +
          `(butuh ${blocks.length} pertemuan, detail blok: [${blocks.join(", ")}]).`
      )
    }

    for (const placement of kandidat) {
      const applied = this.terapkanPlacement(placement, kmp, kelasGrid, guruOccupancy, assignments)

      if (this.backtrack(queue, index + 1, kelasGrid, guruOccupancy, assignments, failureLog, strictCompact, steps)) {
        return true
      }

      this.batalkanPlacement(applied, kelasGrid, guruOccupancy, assignments)
    }

    return false
  }

  private cariKandidatPlacement(
    blocks: number[],
    guruId: string,
    kelasGrid: Set<string>,
    guruOccupancy: Map<string, Set<string>>
  ): FullPlacement[] {
    const results: FullPlacement[] = []

    // Group available slots by day
    const slotsByHari = new Map<HariType, SlotWaktuDTO[]>()
    for (const slot of this.cachedAllSlots) {
      const key = `${slot.hari}-${slot.jamKe}`
      if (kelasGrid.has(key)) continue
      if (guruOccupancy.get(guruId)?.has(key)) continue
      if (!slotsByHari.has(slot.hari)) slotsByHari.set(slot.hari, [])
      slotsByHari.get(slot.hari)!.push(slot)
    }

    const usedHari = new Set<HariType>()
    const current: BlockPlacement[] = []

    const recurse = (blockIndex: number) => {
      if (results.length >= MAX_CANDIDATES_PER_KMP) return
      if (blockIndex === blocks.length) {
        results.push([...current])
        return
      }

      const blockSize = blocks[blockIndex]

      for (const [hari, slotsForHari] of slotsByHari) {
        if (usedHari.has(hari)) continue
        if (results.length >= MAX_CANDIDATES_PER_KMP) return

        const windows = findConsecutiveWindows(slotsForHari, blockSize)
        for (const window of windows) {
          usedHari.add(hari)
          current.push({ hari, slots: window })

          recurse(blockIndex + 1)

          current.pop()
          usedHari.delete(hari)

          if (results.length >= MAX_CANDIDATES_PER_KMP) return
        }
      }
    }

    recurse(0)
    return results
  }

  private terapkanPlacement(
    placement: FullPlacement,
    kmp: KelasMataPelajaranDTO,
    kelasGrid: Set<string>,
    guruOccupancy: Map<string, Set<string>>,
    assignments: Assignment[]
  ): Assignment[] {
    const applied: Assignment[] = []
    for (const block of placement) {
      if (block.slots.length === 0) continue
      const firstSlot = block.slots[0]
      const lastSlot = block.slots[block.slots.length - 1]

      // Fill occupation sets
      for (const slot of block.slots) {
        const key = `${slot.hari}-${slot.jamKe}`
        kelasGrid.add(key)
        if (!guruOccupancy.has(kmp.guruId)) guruOccupancy.set(kmp.guruId, new Set())
        guruOccupancy.get(kmp.guruId)!.add(key)
      }

      const assignment: Assignment = {
        kelasMataPelajaranId: kmp.id,
        kelasId: kmp.kelasId,
        guruId: kmp.guruId,
        mataPelajaranId: kmp.mataPelajaranId,
        hari: block.hari,
        jpMulai: firstSlot.jamKe,
        jpCount: block.slots.length,
        jamMulai: firstSlot.jamMulai,
        jamSelesai: lastSlot.jamSelesai,
      }
      assignments.push(assignment)
      applied.push(assignment)
    }
    return applied
  }

  private batalkanPlacement(
    applied: Assignment[],
    kelasGrid: Set<string>,
    guruOccupancy: Map<string, Set<string>>,
    assignments: Assignment[]
  ): void {
    for (const a of applied) {
      for (let i = 0; i < a.jpCount; i++) {
        const key = `${a.hari}-${a.jpMulai + i}`
        kelasGrid.delete(key)
        guruOccupancy.get(a.guruId)?.delete(key)
      }
      const idx = assignments.indexOf(a)
      if (idx >= 0) assignments.splice(idx, 1)
    }
  }

  private async persistDraft(assignments: Assignment[], batchId: string): Promise<void> {
    if (assignments.length === 0) return

    const insertData = assignments.map((a) => ({
      id: crypto.randomUUID(),
      sekolahId: this.sekolahId,
      kelasId: a.kelasId,
      mataPelajaranId: a.mataPelajaranId,
      guruId: a.guruId,
      hari: a.hari,
      jamMulai: timeStringToDate(a.jamMulai),
      jamSelesai: timeStringToDate(a.jamSelesai),
      jpMulai: a.jpMulai,
      jpCount: a.jpCount,
      status: "DRAFT" as const,
      batchId,
    }))

    await db.insert(jadwalPelajaran).values(insertData)
  }
}
