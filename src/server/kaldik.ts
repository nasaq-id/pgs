/**
 * Kalender Pendidikan (Kaldik) helpers.
 *
 * Default dates follow the national Indonesian education calendar pattern
 * (most provinces): ganjil starts mid-July and ends before the Christmas
 * holiday; genap starts early January and ends end of June. Each school can
 * override these defaults to match their province's official Kaldik.
 */

export type PengaturanKalenderDefault = {
  tanggalMulaiGanjil: string // "MM-DD"
  tanggalSelesaiGanjil: string // "MM-DD"
  tanggalMulaiGenap: string // "MM-DD"
  tanggalSelesaiGenap: string // "MM-DD"
  selaraskanSenin: boolean
}

export const DEFAULT_KALDIK: PengaturanKalenderDefault = {
  tanggalMulaiGanjil: "07-15",
  tanggalSelesaiGanjil: "12-22",
  tanggalMulaiGenap: "01-02",
  tanggalSelesaiGenap: "06-30",
  selaraskanSenin: true,
}

const MM_DD_RE = /^(\d{2})-(\d{2})$/

export function isValidMmDd(value: string): boolean {
  if (!MM_DD_RE.test(value)) return false
  const [, month, day] = value.match(MM_DD_RE)!
  const m = Number(month)
  const d = Number(day)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  if (m === 2 && d > 29) return false
  if ([4, 6, 9, 11].includes(m) && d > 30) return false
  return true
}

/** Align a date to the Monday of its school week (Indonesian school weeks start Monday).
 * If the date falls late in the week (Thu-Sun), snap forward to the next Monday
 * instead, so anchors like "2 Januari" resolve to the first Monday of January. */
export function alignToMonday(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = (result.getDay() + 6) % 7 // days since Monday
  result.setDate(result.getDate() - diff)
  if (diff > 3) {
    result.setDate(result.getDate() + 7)
  }
  return result
}

function makeDate(year: number, mmDd: string): Date {
  const [, month, day] = mmDd.match(MM_DD_RE)!
  return new Date(year, Number(month) - 1, Number(day))
}

function formatYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export type KaldikConfig = Partial<PengaturanKalenderDefault>

/** Compute suggested semester start/end dates for a given year. */
export function suggestSemesterDates(
  year: number,
  semester: "ganjil" | "genap",
  config: KaldikConfig = {}
): { tanggalMulai: string; tanggalSelesai: string } {
  const merged = { ...DEFAULT_KALDIK, ...config }
  const mulaiRaw =
    semester === "ganjil" ? merged.tanggalMulaiGanjil : merged.tanggalMulaiGenap
  const selesaiRaw =
    semester === "ganjil" ? merged.tanggalSelesaiGanjil : merged.tanggalSelesaiGenap

  let mulai = makeDate(year, mulaiRaw)
  if (merged.selaraskanSenin) mulai = alignToMonday(mulai)

  const selesai = makeDate(year, selesaiRaw)
  if (selesai <= mulai) {
    selesai.setFullYear(selesai.getFullYear() + 1)
  }

  return {
    tanggalMulai: formatYmd(mulai),
    tanggalSelesai: formatYmd(selesai),
  }
}

/** Parse the years from a tahun ajaran name like "2025/2026". */
export function parseTahunAjaranYears(nama: string): { tahunAwal: number; tahunAkhir: number } | null {
  const years = nama.match(/\d{4}/g)
  if (!years || years.length === 0) return null
  const tahunAwal = Number(years[0])
  const tahunAkhir = years.length > 1 ? Number(years[1]) : tahunAwal + 1
  return { tahunAwal, tahunAkhir }
}

/** Resolve the calendar year a semester belongs to from a tahun ajaran name. */
export function resolveSemesterYear(
  namaTahunAjaran: string,
  semester: "ganjil" | "genap"
): number {
  const parsed = parseTahunAjaranYears(namaTahunAjaran)
  const now = new Date()
  if (!parsed) {
    return semester === "genap" && now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  }
  return semester === "ganjil" ? parsed.tahunAwal : parsed.tahunAkhir
}
