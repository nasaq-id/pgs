/**
 * Standar kurikulum KMA 1503 Tahun 2025 (Madrasah) &
 * Permendikdasmen Nomor 13 Tahun 2025 (Sekolah umum).
 *
 * Digunakan oleh fitur "Generate Mapel Otomatis" di modul Akademik.
 * Struktur mengikuti pola komponen AkademikView pada platform lama (ZITE).
 */

export type Jenjang = "tk" | "sd" | "mi" | "smp" | "mts" | "sma" | "ma" | "smk"

export type KategoriMapel = "Mapel Wajib" | "Mapel Pilihan" | "Muatan Lokal"

export interface KurikulumMapel {
  kode: string
  nama: string
  kategori: KategoriMapel
  jpPerMinggu: number
  /** Nomor kelas yang diajar, mis. [1,2] = kelas 1-2 */
  kelas: number[]
  /** Mata pelajaran peminatan (MA/SMA MIPA-IPS) */
  isPeminatan?: boolean
}

export const JENJANG_KE_KELAS: Record<Jenjang, number[]> = {
  tk: [1, 2],
  sd: [1, 2, 3, 4, 5, 6],
  mi: [1, 2, 3, 4, 5, 6],
  smp: [7, 8, 9],
  mts: [7, 8, 9],
  sma: [10, 11, 12],
  ma: [10, 11, 12],
  smk: [10, 11, 12],
}

const K = (kode: string, nama: string, kategori: KategoriMapel, jpPerMinggu: number, kelas: number[], isPeminatan?: boolean): KurikulumMapel => ({
  kode,
  nama,
  kategori,
  jpPerMinggu,
  kelas,
  isPeminatan,
})

export const KURIKULUM_KMA_1503: Record<Jenjang, KurikulumMapel[]> = {
  // ── MI — Madrasah Ibtidaiyah (KMA 1503/2025) ──────────────
  mi: [
    K("QRD", "Al-Qur'an Hadis", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("AKH", "Akidah Akhlak", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("FIQ", "Fikih", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("SKI", "Sejarah Kebudayaan Islam", "Mapel Wajib", 2, [3, 4, 5, 6]),
    K("ARB", "Bahasa Arab", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("PNK", "Pendidikan Pancasila", "Mapel Wajib", 4, [1, 2, 3, 4, 5, 6]),
    K("IND", "Bahasa Indonesia", "Mapel Wajib", 6, [1, 2, 3, 4, 5, 6]),
    K("MTK", "Matematika", "Mapel Wajib", 6, [1, 2, 3, 4, 5, 6]),
    K("IPAS", "IPAS (IPA & IPS)", "Mapel Wajib", 4, [1, 2, 3, 4, 5, 6]),
    K("ING", "Bahasa Inggris", "Mapel Wajib", 2, [4, 5, 6]),
    K("INF", "Informatika", "Mapel Pilihan", 2, [4, 5, 6]),
    K("PJK", "PJOK", "Mapel Wajib", 3, [1, 2, 3, 4, 5, 6]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("MUL", "Muatan Lokal", "Muatan Lokal", 2, [1, 2, 3, 4, 5, 6]),
  ],
  // ── MTs — Madrasah Tsanawiyah (KMA 1503/2025) ─────────────
  mts: [
    K("QRD", "Al-Qur'an Hadis", "Mapel Wajib", 2, [7, 8, 9]),
    K("AKH", "Akidah Akhlak", "Mapel Wajib", 2, [7, 8, 9]),
    K("FIQ", "Fikih", "Mapel Wajib", 2, [7, 8, 9]),
    K("SKI", "Sejarah Kebudayaan Islam", "Mapel Wajib", 2, [7, 8, 9]),
    K("ARB", "Bahasa Arab", "Mapel Wajib", 3, [7, 8, 9]),
    K("PNK", "Pendidikan Pancasila", "Mapel Wajib", 2, [7, 8, 9]),
    K("IND", "Bahasa Indonesia", "Mapel Wajib", 4, [7, 8, 9]),
    K("MTK", "Matematika", "Mapel Wajib", 4, [7, 8, 9]),
    K("IPA", "Ilmu Pengetahuan Alam", "Mapel Wajib", 4, [7, 8, 9]),
    K("IPS", "Ilmu Pengetahuan Sosial", "Mapel Wajib", 4, [7, 8, 9]),
    K("ING", "Bahasa Inggris", "Mapel Wajib", 4, [7, 8, 9]),
    K("INF", "Informatika", "Mapel Pilihan", 2, [7, 8, 9]),
    K("PJK", "PJOK", "Mapel Wajib", 3, [7, 8, 9]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [7, 8, 9]),
    K("MUL", "Muatan Lokal", "Muatan Lokal", 2, [7, 8, 9]),
  ],
  // ── MA — Madrasah Aliyah (KMA 1503/2025) ──────────────────
  ma: [
    K("QRD", "Al-Qur'an Hadis", "Mapel Wajib", 2, [10, 11, 12]),
    K("AKH", "Akidah Akhlak", "Mapel Wajib", 2, [10, 11, 12]),
    K("FIQ", "Fikih", "Mapel Wajib", 2, [10, 11, 12]),
    K("SKI", "Sejarah Kebudayaan Islam", "Mapel Wajib", 2, [10, 11, 12]),
    K("ARB", "Bahasa Arab", "Mapel Wajib", 3, [10, 11, 12]),
    K("PNK", "Pendidikan Pancasila", "Mapel Wajib", 2, [10, 11, 12]),
    K("IND", "Bahasa Indonesia", "Mapel Wajib", 4, [10, 11, 12]),
    K("MTK", "Matematika", "Mapel Wajib", 4, [10, 11, 12]),
    K("ING", "Bahasa Inggris", "Mapel Wajib", 4, [10, 11, 12]),
    K("INF", "Informatika", "Mapel Pilihan", 2, [10, 11, 12]),
    K("PJK", "PJOK", "Mapel Wajib", 2, [10, 11, 12]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [10, 11, 12]),
    // Peminatan MIPA
    K("FIS", "Fisika", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("KIM", "Kimia", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("BIO", "Biologi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("MTK", "Matematika Lanjutan", "Mapel Pilihan", 3, [10, 11, 12], true),
    // Peminatan IPS
    K("GEO", "Geografi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("SKJ", "Sejarah", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("EKO", "Ekonomi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("SOS", "Sosiologi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("MUL", "Muatan Lokal", "Muatan Lokal", 2, [10, 11, 12]),
  ],
  // ── SD — Sekolah Dasar (Permendikdasmen 13/2025) ──────────
  sd: [
    K("PAG", "Pendidikan Agama", "Mapel Wajib", 3, [1, 2, 3, 4, 5, 6]),
    K("PNK", "Pendidikan Pancasila", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("IND", "Bahasa Indonesia", "Mapel Wajib", 6, [1, 2, 3, 4, 5, 6]),
    K("MTK", "Matematika", "Mapel Wajib", 6, [1, 2, 3, 4, 5, 6]),
    K("IPAS", "IPAS (IPA & IPS)", "Mapel Wajib", 4, [1, 2, 3, 4, 5, 6]),
    K("ING", "Bahasa Inggris", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("INF", "Informatika", "Mapel Pilihan", 2, [4, 5, 6]),
    K("PJK", "PJOK", "Mapel Wajib", 3, [1, 2, 3, 4, 5, 6]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [1, 2, 3, 4, 5, 6]),
    K("MUL", "Muatan Lokal", "Muatan Lokal", 2, [1, 2, 3, 4, 5, 6]),
  ],
  // ── SMP — Sekolah Menengah Pertama (Permendikdasmen 13/2025) ──
  smp: [
    K("PAG", "Pendidikan Agama", "Mapel Wajib", 2, [7, 8, 9]),
    K("PNK", "Pendidikan Pancasila", "Mapel Wajib", 2, [7, 8, 9]),
    K("IND", "Bahasa Indonesia", "Mapel Wajib", 5, [7, 8, 9]),
    K("MTK", "Matematika", "Mapel Wajib", 5, [7, 8, 9]),
    K("IPA", "Ilmu Pengetahuan Alam", "Mapel Wajib", 4, [7, 8, 9]),
    K("IPS", "Ilmu Pengetahuan Sosial", "Mapel Wajib", 4, [7, 8, 9]),
    K("ING", "Bahasa Inggris", "Mapel Wajib", 4, [7, 8, 9]),
    K("INF", "Informatika", "Mapel Pilihan", 2, [7, 8, 9]),
    K("PJK", "PJOK", "Mapel Wajib", 3, [7, 8, 9]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [7, 8, 9]),
    K("PRA", "Prakarya", "Mapel Wajib", 2, [7, 8, 9]),
    K("MUL", "Muatan Lokal", "Muatan Lokal", 2, [7, 8, 9]),
  ],
  // ── SMA — Sekolah Menengah Atas (Permendikdasmen 13/2025) ──
  sma: [
    K("PAG", "Pendidikan Agama", "Mapel Wajib", 2, [10, 11, 12]),
    K("PNK", "Pendidikan Pancasila", "Mapel Wajib", 2, [10, 11, 12]),
    K("IND", "Bahasa Indonesia", "Mapel Wajib", 4, [10, 11, 12]),
    K("MTK", "Matematika", "Mapel Wajib", 4, [10, 11, 12]),
    K("ING", "Bahasa Inggris", "Mapel Wajib", 4, [10, 11, 12]),
    K("INF", "Informatika", "Mapel Pilihan", 2, [10, 11, 12]),
    K("PJK", "PJOK", "Mapel Wajib", 2, [10, 11, 12]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [10, 11, 12]),
    // Peminatan MIPA
    K("FIS", "Fisika", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("KIM", "Kimia", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("BIO", "Biologi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("MTK", "Matematika Lanjutan", "Mapel Pilihan", 3, [10, 11, 12], true),
    // Peminatan IPS
    K("GEO", "Geografi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("SKJ", "Sejarah", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("EKO", "Ekonomi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("SOS", "Sosiologi", "Mapel Pilihan", 3, [10, 11, 12], true),
    K("MUL", "Muatan Lokal", "Muatan Lokal", 2, [10, 11, 12]),
  ],
  // ── SMK — Sekolah Menengah Kejuruan ───────────────────────
  smk: [
    K("PAG", "Pendidikan Agama", "Mapel Wajib", 2, [10, 11, 12]),
    K("PNK", "Pendidikan Pancasila", "Mapel Wajib", 2, [10, 11, 12]),
    K("IND", "Bahasa Indonesia", "Mapel Wajib", 4, [10, 11, 12]),
    K("MTK", "Matematika", "Mapel Wajib", 4, [10, 11, 12]),
    K("ING", "Bahasa Inggris", "Mapel Wajib", 4, [10, 11, 12]),
    K("INF", "Informatika", "Mapel Pilihan", 2, [10, 11, 12]),
    K("PJK", "PJOK", "Mapel Wajib", 2, [10, 11, 12]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [10, 11, 12]),
    K("MUL", "Muatan Lokal", "Muatan Lokal", 2, [10, 11, 12]),
  ],
  // ── TK — Taman Kanak-Kanak ────────────────────────────────
  tk: [
    K("NAG", "Nilai Agama dan Budi Pekerti", "Mapel Wajib", 3, [1, 2]),
    K("PKJ", "Pancasila dan Kewarganegaraan", "Mapel Wajib", 3, [1, 2]),
    K("BIN", "Bahasa Indonesia", "Mapel Wajib", 4, [1, 2]),
    K("MTK", "Matematika", "Mapel Wajib", 4, [1, 2]),
    K("IPAS", "IPAS (IPA & IPS)", "Mapel Wajib", 3, [1, 2]),
    K("SEN", "Seni dan Budaya", "Mapel Wajib", 2, [1, 2]),
    K("PJK", "PJOK", "Mapel Wajib", 2, [1, 2]),
  ],
}

/** Urutan penting: cek yang lebih spesifik dulu (mtsn sebelum mts, man sebelum ma, dll). */
const JENJANG_PREFIX: Array<[string, Jenjang]> = [
  ["madrasahaliyah", "ma"],
  ["madrasahtsanawiyah", "mts"],
  ["madrasahibtidaiyah", "mi"],
  ["sekolahmenengahkejuruan", "smk"],
  ["sekolahmenengahatas", "sma"],
  ["sekolahmenengahpertama", "smp"],
  ["sekolahdasar", "sd"],
  ["smkn", "smk"],
  ["sman", "sma"],
  ["smpn", "smp"],
  ["sdn", "sd"],
  ["mtsn", "mts"],
  ["mts", "mts"],
  ["min", "mi"],
  ["man", "ma"],
  ["smk", "smk"],
  ["sma", "sma"],
  ["slta", "sma"],
  ["smp", "smp"],
  ["sd", "sd"],
  ["mi", "mi"],
  ["ma", "ma"],
  ["tk", "tk"],
  ["taman", "tk"],
  ["paud", "tk"],
]

export function normalizeJenjang(level: string): Jenjang {
  const raw = (level || "").trim().toLowerCase().replace(/[^a-z]/g, "")
  if (!raw) return "sd"
  for (const [prefix, jenjang] of JENJANG_PREFIX) {
    if (raw.startsWith(prefix)) return jenjang
  }
  return "sd"
}

export function getJenjangDisplayName(jenjang: Jenjang, rawLevel?: string): string {
  if (rawLevel) return rawLevel.trim()
  const names: Record<Jenjang, string> = {
    tk: "TK",
    sd: "SD",
    mi: "MI",
    smp: "SMP",
    mts: "MTs",
    sma: "SMA",
    ma: "MA",
    smk: "SMK",
  }
  return names[jenjang]
}

export function getKelasListByJenjang(jenjang: Jenjang): number[] {
  return JENJANG_KE_KELAS[jenjang] || []
}

const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

export function formatKelasLabel(kelas: number[], jenjang: Jenjang): string {
  if (!kelas || kelas.length === 0) return "Semua Kelas"
  const isMadrasahMenengah = jenjang === "mts" || jenjang === "ma" || jenjang === "sma" || jenjang === "smk"
  const parts = kelas
    .slice()
    .sort((a, b) => a - b)
    .map((n) => (isMadrasahMenengah ? `Kelas ${ROMAWI[n] || n}` : `Kelas ${n}`))
  return parts.length === 1 ? parts[0] : `${parts[0]} - ${parts[parts.length - 1]}`
}

export interface GeneratePreviewItem {
  tempId: string
  kode: string
  nama: string
  kategori: KategoriMapel
  jpPerMinggu: number
  kelas: number[]
  isPeminatan?: boolean
  status: "baru" | "sudah_ada"
  selected: boolean
}

export interface ExistingMapelLike {
  kodeMapel?: string | null
  namaMapel: string
}

/** Buat daftar pratinjau kurikulum; item yang kode/nama-nya sudah ada ditandai "sudah_ada". */
export function generatePreviewKurikulum(
  level: string,
  kelasFilter: number[],
  existingSubjects: ExistingMapelLike[]
): GeneratePreviewItem[] {
  const jenjang = normalizeJenjang(level)
  const items = KURIKULUM_KMA_1503[jenjang] || []
  const seen = new Set<string>()

  return items
    .filter((it) => kelasFilter.length === 0 || it.kelas.some((k) => kelasFilter.includes(k)))
    .map((it, idx) => {
      const key = `${it.kode}:${it.nama}`
      if (seen.has(key)) return null
      seen.add(key)
      const sudahAda = existingSubjects.some(
        (s) =>
          (s.kodeMapel && s.kodeMapel.trim().toUpperCase() === it.kode.toUpperCase()) ||
          s.namaMapel.trim().toLowerCase() === it.nama.trim().toLowerCase()
      )
      return {
        tempId: `kma-${idx}`,
        kode: it.kode,
        nama: it.nama,
        kategori: it.kategori,
        jpPerMinggu: it.jpPerMinggu,
        kelas: it.kelas,
        isPeminatan: it.isPeminatan,
        status: sudahAda ? "sudah_ada" : "baru",
        selected: true,
      } as GeneratePreviewItem
    })
    .filter((x): x is GeneratePreviewItem => x !== null)
}

/** Urutan tampil sesuai standar kurikulum (kelompok A, B, C, muatan lokal). */
export function getCurriculumStandardRank(item: { kelompok?: string | null; kategori?: string | null }): number {
  const k = (item.kelompok || item.kategori || "").toLowerCase()
  if (k.includes("a") || k === "mapel wajib") return 1
  if (k.includes("b")) return 2
  if (k.includes("c") || k === "mapel pilihan") return 3
  if (k.includes("muatan") || k === "muatan lokal") return 4
  return 5
}

/** Mapping kategori kurikulum lama → kelompok mapel PGS. */
export function kategoriKeKelompok(kategori: KategoriMapel | string): "A" | "B" | "C" | "muatan_lokal" {
  const k = (kategori || "").toLowerCase()
  if (k.includes("muatan")) return "muatan_lokal"
  if (k.includes("pilihan")) return "C"
  if (k.includes("peminatan")) return "C"
  return "A"
}
