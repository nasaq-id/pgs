export const DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]

export const DAY_LABEL: Record<string, string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
  minggu: "Minggu",
}

export const DAY_OPTIONS = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
]

export function formatKelasLabel(k?: { namaKelas: string; tingkat?: string | null } | null): string {
  if (!k) return ""
  const namaKelasStr = (k.namaKelas || "").trim()
  const rawTingkat = (k.tingkat || "").trim()
  const cleanTingkat = rawTingkat.replace(/^(tingkat_|kelas_|kls_)/i, "").trim()

  if (namaKelasStr.toLowerCase().startsWith("kelas ")) {
    return namaKelasStr
  }

  if (cleanTingkat) {
    if (namaKelasStr.startsWith(cleanTingkat)) {
      return `Kelas ${namaKelasStr}`
    }
    return `Kelas ${cleanTingkat} - ${namaKelasStr}`
  }

  return `Kelas ${namaKelasStr}`
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  } catch {
    return dateStr.slice(0, 5)
  }
}

export function toTimeInputValue(dateStr: string | null): string {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  } catch {
    return dateStr.slice(0, 5)
  }
}

export function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number)
  return new Date(1970, 0, 1, h, m, 0)
}
