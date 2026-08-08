/**
 * Standar kurikulum KMA 1503 Tahun 2025 (Madrasah) &
 * Permendikdasmen Nomor 13 Tahun 2025 (Sekolah umum).
 *
 * Digunakan oleh fitur "Generate Mapel Otomatis" di modul Akademik.
 * Dataset mengikuti master regulasi terbaru (termasuk RA/PAUD, Sekolah
 * Luar Biasa, MAK/SMK kejuruan, dan Koding & Kecerdasan Artifisial).
 */

export type Jenjang = "tk" | "sd" | "mi" | "smp" | "mts" | "sma" | "ma" | "smk"

export type KategoriMapel = "Mapel Wajib" | "Mapel Pilihan" | "Muatan Lokal"

export interface KurikulumMasterItem {
  kode: string
  nama: string
  jenjang: Jenjang
  /** Nomor kelas yang diajar, mis. [1,2,3,4,5,6] atau [7,8,9] atau [10,11,12] */
  kelas: number[]
  kategori: KategoriMapel
  jpPerMinggu: number
  catatan?: string
  /** Jika true, default tidak terpilih di modal preview (peminatan) */
  isPeminatan?: boolean
}

export const JENJANG_KE_KELAS: Record<Jenjang, number[]> = {
  tk: [0],
  mi: [1, 2, 3, 4, 5, 6],
  mts: [7, 8, 9],
  ma: [10, 11, 12],
  smk: [10, 11, 12],
  sd: [1, 2, 3, 4, 5, 6],
  smp: [7, 8, 9],
  sma: [10, 11, 12],
}

/**
 * Normalisasi level lembaga → jenjang internal.
 * Sekolah umum (SD/SMP/SMA/SMK) dikelompokkan ke jenjang madrasah yang
 * setara (MI/MTs/MA/MAK) karena struktur kurikulumnya identik; pembeda
 * madrasah vs umum ditentukan lewat nama lembaga (isMadrasahInstitution).
 */
export function normalizeJenjang(levelStr: string): Jenjang {
  const l = (levelStr || "").toLowerCase().trim()
  if (l.includes("ra") || l.includes("raudhatul") || l.includes("paud") || l.includes("tk")) return "tk"
  if (l.includes("mak") || (l.includes("ma") && l.includes("kejuruan")) || l.includes("smk")) return "smk"
  if (l.includes("ma") || l.includes("aliyah") || l.includes("sma")) return "ma"
  if (l.includes("mts") || l.includes("tsanawiyah") || l.includes("smp")) return "mts"
  if (l.includes("mi") || l.includes("ibtidaiyah") || l.includes("sd")) return "mi"
  if (l.includes("milb") || l.includes("sdlb")) return "sd"
  if (l.includes("mtslb") || l.includes("smplb")) return "smp"
  if (l.includes("malb") || l.includes("smalb")) return "sma"
  return "mts"
}

export function getJenjangDisplayName(jenjang: Jenjang, rawLevel?: string): string {
  const l = (rawLevel || "").toLowerCase()
  const isSekolah = ["smp", "sd", "sma", "smk", "paud", "tk"].some((x) => l.includes(x))
  switch (jenjang) {
    case "tk":
      return isSekolah ? "PAUD / TK / RA" : "RA (Raudhatul Athfal) / PAUD"
    case "mi":
      return isSekolah ? "SD / MI (Sekolah Dasar / Madrasah Ibtidaiyah)" : "MI (Madrasah Ibtidaiyah) / SD"
    case "mts":
      return isSekolah ? "SMP / MTs (Sekolah Menengah Pertama / Madrasah Tsanawiyah)" : "MTs (Madrasah Tsanawiyah) / SMP"
    case "ma":
      return isSekolah ? "SMA / MA (Sekolah Menengah Atas / Madrasah Aliyah)" : "MA (Madrasah Aliyah) / SMA"
    case "smk":
      return isSekolah ? "SMK / MAK (Sekolah Menengah Kejuruan / Madrasah Aliyah Kejuruan)" : "MAK (Madrasah Aliyah Kejuruan) / SMK"
    case "sd":
      return "SDLB / MI Luar Biasa (MILB)"
    case "smp":
      return "SMPLB / MTs Luar Biasa (MTsLB)"
    case "sma":
      return "SMALB / MA Luar Biasa (MALB)"
    default:
      return jenjang
  }
}

export function isMadrasahInstitution(institutionName?: string, levelStr?: string): boolean {
  const combined = ((institutionName || "") + " " + (levelStr || "")).toLowerCase()
  // "ma" sebagai kata utuh (bukan bagian dari "sma") — hindari SMA/SMAN dianggap madrasah
  const hasAliyahMarker = /(?:^|[^a-z])ma/.test(combined)
  if (
    (combined.includes("smp") || combined.includes("sd") || combined.includes("sma") || combined.includes("smk")) &&
    !combined.includes("mts") &&
    !combined.includes("mi") &&
    !hasAliyahMarker &&
    !combined.includes("madrasah") &&
    !combined.includes("kemenag")
  ) {
    return false
  }
  return (
    combined.includes("mts") ||
    combined.includes("mi") ||
    hasAliyahMarker ||
    combined.includes("mak") ||
    combined.includes("madrasah") ||
    combined.includes("raudhatul") ||
    combined.includes("kemenag") ||
    combined.includes("pesantren")
  )
}

export function getKelasListByJenjang(jenjang: Jenjang): number[] {
  return JENJANG_KE_KELAS[jenjang] || []
}

const ROMAN_MAP: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
  7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
}

const ROMAN_NUMERALS: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
}

export function formatKelasLabel(kelasArr: number[], jenjang: Jenjang): string {
  if (jenjang === "tk") return "RA / PAUD / Fondasi"
  if (!kelasArr || kelasArr.length === 0) return "Semua Kelas"

  const isRoman = jenjang === "mts" || jenjang === "ma" || jenjang === "smk" || jenjang === "smp" || jenjang === "sma"

  if (kelasArr.length === 1) {
    return isRoman ? `Kelas ${ROMAN_MAP[kelasArr[0]] || kelasArr[0]}` : `Kelas ${kelasArr[0]}`
  }

  if (isRoman) {
    return kelasArr.map((k) => ROMAN_MAP[k] || String(k)).join(", ")
  }
  return kelasArr.join(", ")
}

/** Konversi nilai tingkat (angka/romawi) → nomor kelas. */
function kelasNumberFromTingkat(t: string): number {
  const trimmed = (t || "").trim().toUpperCase()
  if (ROMAN_NUMERALS[trimmed]) return ROMAN_NUMERALS[trimmed]
  const m = trimmed.match(/\d+/)
  return m ? parseInt(m[0], 10) : NaN
}

/**
 * Cocokkan daftar kelas terdaftar dengan nomor kelas regulasi.
 * - kelas tanpa tingkat dianggap mencakup semua tingkat (return "all").
 * - return array id kelas yang cocok; ["all"] jika berlaku ke semua kelas.
 */
export function matchClassesForGrades(
  grades: number[],
  classes: { id: string; tingkat?: string | null }[]
): string[] {
  if (!grades || grades.length === 0) return classes.length > 0 ? classes.map((c) => c.id) : ["all"]
  const matched: string[] = []
  for (const c of classes) {
    const t = (c.tingkat || "").trim()
    if (!t) {
      matched.push("all")
      continue
    }
    const num = kelasNumberFromTingkat(t)
    if (grades.includes(num)) matched.push(c.id)
  }
  return matched
}

export const KURIKULUM_KMA_1503_DATASET: KurikulumMasterItem[] = [
  // ==========================================
  // 1. SD / MI (Sekolah Dasar / Madrasah Ibtidaiyah)
  // ==========================================
  { kode: "PAI", nama: "Pendidikan Agama Islam dan Budi Pekerti", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Permendikdasmen 13/2025 (PAI Terpadu)" },
  { kode: "QRD", nama: "Al-Qur'an Hadis", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "AKH", nama: "Akidah Akhlak", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "FKH", nama: "Fikih", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "SKI", nama: "Sejarah Kebudayaan Islam", jenjang: "mi", kelas: [3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (Mulai Kelas III)" },
  { kode: "ARB", nama: "Bahasa Arab", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (Bahasa Asing)" },
  { kode: "PPN", nama: "Pendidikan Pancasila", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 4, catatan: "Pendidikan Kewarganegaraan" },
  { kode: "IND", nama: "Bahasa Indonesia", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 7, catatan: "Alokasi 6-8 JP/minggu sesuai Fase" },
  { kode: "MTK", nama: "Matematika", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 5, catatan: "Alokasi 4-5 JP/minggu" },
  { kode: "IPA", nama: "Ilmu Pengetahuan Alam dan Sosial (IPAS)", jenjang: "mi", kelas: [3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 5, catatan: "IPAS Terpadu (Mulai Kelas III)" },
  { kode: "PJK", nama: "Pendidikan Jasmani, Olahraga, dan Kesehatan", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "PJOK" },
  { kode: "SNB", nama: "Seni dan Budaya", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Pilihan: Musik / Rupa / Teater / Tari" },
  { kode: "ING", nama: "Bahasa Inggris", jenjang: "mi", kelas: [3, 4, 5, 6], kategori: "Mapel Pilihan", jpPerMinggu: 2, catatan: "Mata Pelajaran Pilihan" },
  { kode: "AIK", nama: "Koding & Kecerdasan Artifisial", jenjang: "mi", kelas: [5, 6], kategori: "Mapel Pilihan", jpPerMinggu: 2, catatan: "Permendikdasmen 13/2025 & KMA 1503/2025 (Pilihan Kelas V-VI)" },
  { kode: "MLK", nama: "Muatan Lokal", jenjang: "mi", kelas: [1, 2, 3, 4, 5, 6], kategori: "Muatan Lokal", jpPerMinggu: 2, catatan: "Bahasa Daerah / Khas Sekolah" },

  // ==========================================
  // 2. SMP / MTs (Sekolah Menengah Pertama / Madrasah Tsanawiyah)
  // ==========================================
  { kode: "PAI", nama: "Pendidikan Agama Islam dan Budi Pekerti", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Permendikdasmen 13/2025 (PAI Terpadu)" },
  { kode: "QRD", nama: "Al-Qur'an Hadis", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "AKH", nama: "Akidah Akhlak", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "FKH", nama: "Fikih", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "SKI", nama: "Sejarah Kebudayaan Islam", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "ARB", nama: "Bahasa Arab", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "KMA 1503/2025 (Bahasa Asing)" },
  { kode: "PPN", nama: "Pendidikan Pancasila", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Pendidikan Kewarganegaraan" },
  { kode: "IND", nama: "Bahasa Indonesia", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 5, catatan: "Bahasa Indonesia" },
  { kode: "MTK", nama: "Matematika", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 4, catatan: "Matematika Umum" },
  { kode: "IPA", nama: "Ilmu Pengetahuan Alam (IPA)", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 4, catatan: "IPA" },
  { kode: "IPS", nama: "Ilmu Pengetahuan Sosial (IPS)", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "IPS" },
  { kode: "ING", nama: "Bahasa Inggris", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Bahasa Inggris Umum" },
  { kode: "PJK", nama: "Pendidikan Jasmani, Olahraga, dan Kesehatan", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "PJOK" },
  { kode: "INF", nama: "Informatika", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Informatika & Komputer" },
  { kode: "SNB", nama: "Seni, Budaya, dan Prakarya", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Seni Musik/Rupa/Teater/Tari/Prakarya" },
  { kode: "AIK", nama: "Koding & Kecerdasan Artifisial", jenjang: "mts", kelas: [7, 8, 9], kategori: "Mapel Pilihan", jpPerMinggu: 2, catatan: "Permendikdasmen 13/2025 & KMA 1503/2025 (Pilihan AI)" },
  { kode: "MLK", nama: "Muatan Lokal", jenjang: "mts", kelas: [7, 8, 9], kategori: "Muatan Lokal", jpPerMinggu: 2, catatan: "Bahasa Daerah / Tahfidz / Khas Sekolah" },

  // ==========================================
  // 3. SMA / MA (Sekolah Menengah Atas / Madrasah Aliyah)
  // ==========================================
  { kode: "PAI", nama: "Pendidikan Agama Islam dan Budi Pekerti", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Permendikdasmen 13/2025 (PAI Terpadu)" },
  { kode: "QRD", nama: "Al-Qur'an Hadis", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "AKH", nama: "Akidah Akhlak", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "FKH", nama: "Fikih", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "SKI", nama: "Sejarah Kebudayaan Islam", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "ARB-X", nama: "Bahasa Arab (Kelas X)", jenjang: "ma", kelas: [10], kategori: "Mapel Wajib", jpPerMinggu: 4, catatan: "KMA 1503/2025 (4 JP Kelas X)" },
  { kode: "ARB-XI", nama: "Bahasa Arab (Kelas XI-XII)", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (2 JP Kelas XI-XII)" },
  { kode: "PPN", nama: "Pendidikan Pancasila", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Pendidikan Kewarganegaraan" },
  { kode: "IND", nama: "Bahasa Indonesia", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Bahasa Indonesia Umum" },
  { kode: "MTK", nama: "Matematika", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Matematika Umum" },
  { kode: "IPA", nama: "Ilmu Pengetahuan Alam (IPA)", jenjang: "ma", kelas: [10], kategori: "Mapel Wajib", jpPerMinggu: 6, catatan: "Fisika, Kimia, Biologi (Kelas X)" },
  { kode: "IPS", nama: "Ilmu Pengetahuan Sosial (IPS)", jenjang: "ma", kelas: [10], kategori: "Mapel Wajib", jpPerMinggu: 8, catatan: "Sosiologi, Ekonomi, Sejarah, Geografi (Kelas X)" },
  { kode: "ING", nama: "Bahasa Inggris", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Bahasa Inggris Umum" },
  { kode: "PJK", nama: "Pendidikan Jasmani, Olahraga, dan Kesehatan", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "PJOK" },
  { kode: "SEJ", nama: "Sejarah", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Sejarah Indonesia (Kelas XI-XII)" },
  { kode: "INF", nama: "Informatika", jenjang: "ma", kelas: [10], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Informatika (Kelas X)" },
  { kode: "SNB", nama: "Seni dan Budaya / Prakarya", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Seni / Prakarya" },
  { kode: "MLK", nama: "Muatan Lokal", jenjang: "ma", kelas: [10, 11, 12], kategori: "Muatan Lokal", jpPerMinggu: 2, catatan: "Muatan Lokal Khas Daerah/Sekolah" },

  // --- Kelompok Pilihan SMA/MA Kelas XI-XII ---
  { kode: "ITF", nama: "Ilmu Tafsir", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pilihan Keagamaan" },
  { kode: "IHD", nama: "Ilmu Hadis", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pilihan Keagamaan" },
  { kode: "USH", nama: "Ushul Fikih", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pilihan Keagamaan" },
  { kode: "MTL", nama: "Matematika Tingkat Lanjut", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan MIPA" },
  { kode: "FIS", nama: "Fisika", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan MIPA" },
  { kode: "KIM", nama: "Kimia", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan MIPA" },
  { kode: "BIO", nama: "Biologi", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan MIPA" },
  { kode: "GEO", nama: "Geografi", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan IPS" },
  { kode: "SJL", nama: "Sejarah Tingkat Lanjut", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan IPS" },
  { kode: "SOS", nama: "Sosiologi", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan IPS" },
  { kode: "EKO", nama: "Ekonomi", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan IPS" },
  { kode: "INL", nama: "Bahasa Indonesia Tingkat Lanjut", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa" },
  { kode: "IGL", nama: "Bahasa Inggris Tingkat Lanjut", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa" },
  { kode: "ARL", nama: "Bahasa Arab Tingkat Lanjut", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa" },
  { kode: "AIK", nama: "Koding & Kecerdasan Artifisial", jenjang: "ma", kelas: [10, 11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 2, isPeminatan: true, catatan: "Permendikdasmen 13/2025 & KMA 1503/2025 (Pilihan AI)" },
  { kode: "KWU", nama: "Prakarya dan Kewirausahaan", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 2, isPeminatan: true, catatan: "Pilihan Keterampilan" },
  { kode: "INF-P", nama: "Informatika (Tingkat Lanjut)", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Informatika (Kelas XI-XII)" },
  { kode: "ANT", nama: "Antropologi", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Ilmu Sosial" },
  { kode: "BJPN", nama: "Bahasa Jepang", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa Asing" },
  { kode: "BJRM", nama: "Bahasa Jerman", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa Asing" },
  { kode: "BKRN", nama: "Bahasa Korea", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa Asing" },
  { kode: "BMND", nama: "Bahasa Mandarin", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa Asing" },
  { kode: "BPRC", nama: "Bahasa Prancis", jenjang: "ma", kelas: [11, 12], kategori: "Mapel Pilihan", jpPerMinggu: 5, isPeminatan: true, catatan: "Pilihan Bahasa Asing" },

  // ==========================================
  // 4. SMK / MAK (Sekolah Menengah Kejuruan / Madrasah Aliyah Kejuruan)
  // ==========================================
  { kode: "PAI", nama: "Pendidikan Agama Islam dan Budi Pekerti", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Permendikdasmen 13/2025 (PAI Terpadu)" },
  { kode: "QRD", nama: "Al-Qur'an Hadis", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "AKH", nama: "Akidah Akhlak", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "FKH", nama: "Fikih", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "SKI", nama: "Sejarah Kebudayaan Islam", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "KMA 1503/2025 (PAI Madrasah)" },
  { kode: "ARB", nama: "Bahasa Arab", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 4, catatan: "KMA 1503/2025 (Bahasa Arab Terapan)" },
  { kode: "PPN", nama: "Pendidikan Pancasila", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Pendidikan Kewarganegaraan" },
  { kode: "IND", nama: "Bahasa Indonesia", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Bahasa Indonesia Kejuruan" },
  { kode: "MTK", nama: "Matematika Kejuruan", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Matematika Terapan" },
  { kode: "ING", nama: "Bahasa Inggris Kejuruan", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Bahasa Inggris Terapan" },
  { kode: "PJK", nama: "Pendidikan Jasmani, Olahraga, dan Kesehatan", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "PJOK" },
  { kode: "SEJ", nama: "Sejarah", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Sejarah Indonesia" },
  { kode: "SNB", nama: "Seni Budaya", jenjang: "smk", kelas: [10, 11, 12], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Seni Budaya" },
  { kode: "INF", nama: "Informatika", jenjang: "smk", kelas: [10], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Informatika Kejuruan (Kelas X)" },
  { kode: "PPS", nama: "Projek Ilmu Pengetahuan Alam dan Sosial (PIPAS)", jenjang: "smk", kelas: [10], kategori: "Mapel Wajib", jpPerMinggu: 5, catatan: "PIPAS Terpadu" },
  { kode: "DDK", nama: "Dasar-dasar Program Keahlian", jenjang: "smk", kelas: [10], kategori: "Mapel Wajib", jpPerMinggu: 12, catatan: "Dasar Kejuruan Spesifik (Kelas X)" },
  { kode: "KKH", nama: "Konsentrasi Keahlian", jenjang: "smk", kelas: [11, 12], kategori: "Mapel Wajib", jpPerMinggu: 18, catatan: "Konsentrasi Keahlian Kejuruan (Kelas XI-XII)" },
  { kode: "KIK", nama: "Kreativitas, Inovasi, & Kewirausahaan", jenjang: "smk", kelas: [11, 12], kategori: "Mapel Wajib", jpPerMinggu: 5, catatan: "Project Kewirausahaan Kejuruan" },
  { kode: "PKL", nama: "Praktik Kerja Lapangan (PKL)", jenjang: "smk", kelas: [12], kategori: "Mapel Wajib", jpPerMinggu: 16, catatan: "Magang Industri (Min. 1 Semester)" },
  { kode: "AIK", nama: "Koding & Kecerdasan Artifisial", jenjang: "smk", kelas: [10], kategori: "Mapel Pilihan", jpPerMinggu: 2, isPeminatan: true, catatan: "Permendikdasmen 13/2025 & KMA 1503/2025 (Pilihan AI)" },
  { kode: "MLK", nama: "Muatan Lokal", jenjang: "smk", kelas: [10, 11, 12], kategori: "Muatan Lokal", jpPerMinggu: 2, catatan: "Muatan Lokal Kejuruan" },

  // ==========================================
  // 5. PAUD / RA / TK (Raudhatul Athfal / Taman Kanak-kanak)
  // ==========================================
  { kode: "RA-INTRA", nama: "Pembelajaran Intrakurikuler PAUD/RA (Fondasi 900 Menit/Minggu)", jenjang: "tk", kelas: [0], kategori: "Mapel Wajib", jpPerMinggu: 22, catatan: "Terpadu: Nilai Agama & Budi Pekerti, Jati Diri, Literasi & STEAM" },
  { kode: "MLK", nama: "Muatan Lokal PAUD/RA", jenjang: "tk", kelas: [0], kategori: "Muatan Lokal", jpPerMinggu: 2, catatan: "Khas Keagamaan / Daerah" },

  // ==========================================
  // 6. MILB / MTsLB / MALB (Sekolah / Madrasah Luar Biasa)
  // ==========================================
  { kode: "PAI", nama: "Pendidikan Agama Islam dan Budi Pekerti (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Permendikdasmen 13/2025 Adaptif" },
  { kode: "QRD", nama: "Al-Qur'an Hadis (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "AKH", nama: "Akidah Akhlak (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "FKH", nama: "Fikih (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "SKI", nama: "Sejarah Kebudayaan Islam (Luar Biasa)", jenjang: "sd", kelas: [3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "ARB", nama: "Bahasa Arab (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "PPN", nama: "Pendidikan Pancasila (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "IND", nama: "Bahasa Indonesia (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "MTK", nama: "Matematika (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 3, catatan: "Disesuaikan Jenis Hambatan" },
  { kode: "PJK", nama: "PJOK (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Adaptif" },
  { kode: "SNB", nama: "Seni Budaya (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Wajib", jpPerMinggu: 2, catatan: "Apresiasi & Terapi" },
  { kode: "PKK-NETRA", nama: "Program Kebutuhan Khusus (Disabilitas Netra)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pengembangan Orientasi, Mobilitas, Sosial & Komunikasi" },
  { kode: "PKK-RUNGU", nama: "Program Kebutuhan Khusus (Disabilitas Rungu)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pengembangan Komunikasi, Persepsi Bunyi & Irama" },
  { kode: "PKK-INTELEKTUAL", nama: "Program Kebutuhan Khusus (Disabilitas Intelektual)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pengembangan Diri & Bina Diri" },
  { kode: "PKK-FISIK", nama: "Program Kebutuhan Khusus (Disabilitas Fisik)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pengembangan Diri & Gerak" },
  { kode: "PKK-MENTAL", nama: "Program Kebutuhan Khusus (Disabilitas Mental)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Mapel Pilihan", jpPerMinggu: 4, isPeminatan: true, catatan: "Pengembangan Komunikasi, Interaksi Sosial & Perilaku" },
  { kode: "MLK", nama: "Muatan Lokal (Luar Biasa)", jenjang: "sd", kelas: [1, 2, 3, 4, 5, 6], kategori: "Muatan Lokal", jpPerMinggu: 2, catatan: "Muatan Lokal Adaptif" },
]

export interface GeneratePreviewItem {
  tempId: string
  kode: string
  nama: string
  jenjang: Jenjang
  kelas: number[]
  kategori: KategoriMapel
  jpPerMinggu: number
  catatan?: string
  isPeminatan: boolean
  status: "baru" | "sudah_ada"
  selected: boolean
}

export interface ExistingMapelLike {
  kodeMapel?: string | null
  namaMapel?: string | null
  kode?: string | null
  nama?: string | null
}

/**
 * Buat daftar pratinjau kurikulum berdasarkan jenjang lembaga.
 * Item yang kode/nama-nya sudah ada ditandai "sudah_ada"; item peminatan
 * tidak terpilih secara default. Jika lembaga adalah madrasah, mapel PAI
 * madrasah (Qur'an Hadis, Akidah Akhlak, dll.) terpilih dan PAI terpadu
 * tidak, dan sebaliknya untuk sekolah umum.
 */
export function generatePreviewKurikulum(
  jenjangInput: string,
  selectedKelasFilter?: number[],
  existingSubjects: ExistingMapelLike[] = [],
  institutionName?: string
): GeneratePreviewItem[] {
  const normJenjang = normalizeJenjang(jenjangInput)
  const isMadrasah = isMadrasahInstitution(institutionName, jenjangInput)

  const filtered = KURIKULUM_KMA_1503_DATASET.filter((item) => {
    if (item.jenjang !== normJenjang) return false
    if (!selectedKelasFilter || selectedKelasFilter.length === 0) return true
    return item.kelas.some((k) => selectedKelasFilter.includes(k))
  })

  const existingCodesUpper = new Set(existingSubjects.map((s) => (s.kodeMapel ?? s.kode ?? "").trim().toUpperCase()))
  const existingNamesLower = new Set(existingSubjects.map((s) => (s.namaMapel ?? s.nama ?? "").trim().toLowerCase()))

  return filtered.map((item) => {
    const isCodeMatch = existingCodesUpper.has(item.kode.trim().toUpperCase())
    const isNameMatch = existingNamesLower.has(item.nama.trim().toLowerCase())
    const isExisting = isCodeMatch || isNameMatch

    const isMadrasahPAI = ["QRD", "AKH", "FKH", "SKI", "ARB", "ARB-X", "ARB-XI"].includes(item.kode)
    const isGeneralPAI = item.kode === "PAI"

    let defaultSelected = !item.isPeminatan

    if (isMadrasah) {
      if (isGeneralPAI) defaultSelected = false
      if (isMadrasahPAI) defaultSelected = true
    } else {
      if (isGeneralPAI) defaultSelected = true
      if (isMadrasahPAI) defaultSelected = false
    }

    return {
      tempId: `gen_${item.kode}_${Math.random().toString(36).substring(2, 7)}`,
      kode: item.kode,
      nama: item.nama,
      jenjang: item.jenjang,
      kelas: item.kelas,
      kategori: item.kategori,
      jpPerMinggu: item.jpPerMinggu,
      catatan: item.catatan,
      isPeminatan: !!item.isPeminatan,
      status: isExisting ? ("sudah_ada" as const) : ("baru" as const),
      selected: defaultSelected,
    }
  })
}

/** Urutan tampil sesuai standar kurikulum (kelompok A, B, C, muatan lokal). */
export function getCurriculumStandardRank(sub: { kode?: string; nama?: string; kategori?: string; kelompok?: string | null; urutan?: number }): number {
  if (sub.urutan !== undefined && sub.urutan !== null && Number(sub.urutan) > 0) {
    return Number(sub.urutan)
  }

  const kode = (sub.kode || "").trim().toUpperCase()
  const nama = (sub.nama || "").trim().toLowerCase()
  const kat = (sub.kategori || sub.kelompok || "Mapel Wajib") as string
  const katLower = kat.toLowerCase()

  let baseScore = 100
  if (katLower.includes("pilihan") || katLower.includes("b") || katLower.includes("c")) baseScore = 500
  else if (katLower.includes("muatan") || katLower.includes("lokal")) baseScore = 900

  let offset = 200
  if (kode === "QRD" || nama.includes("qur'an") || nama.includes("quran")) offset = 10
  else if (kode === "AKH" || nama.includes("akidah")) offset = 20
  else if (kode === "FKH" || kode === "FIQ" || nama.includes("fikih") || nama.includes("fiqih")) offset = 30
  else if (kode === "SKI" || nama.includes("sejarah kebudayaan islam")) offset = 40
  else if (kode.startsWith("ARB") || nama.includes("bahasa arab")) offset = 50
  else if (kode === "PAI" || nama.includes("pendidikan agama islam")) offset = 60
  else if (kode === "PPN" || kode === "PKN" || nama.includes("pancasila")) offset = 70
  else if (kode === "IND" || nama.includes("bahasa indonesia")) offset = 80
  else if (kode === "MTK" || nama.includes("matematika")) offset = 90
  else if (kode === "IPA" || nama.includes("ilmu pengetahuan alam") || nama.includes("ipas")) offset = 100
  else if (kode === "IPS" || nama.includes("ilmu pengetahuan sosial")) offset = 110
  else if (kode === "ING" || kode === "BING" || nama.includes("bahasa inggris")) offset = 120
  else if (kode === "PJK" || kode === "PJOK" || nama.includes("jasmani")) offset = 130
  else if (kode === "SEJ" || nama.includes("sejarah")) offset = 140
  else if (kode === "INF" || kode === "TIK" || nama.includes("informatika")) offset = 150
  else if (kode === "SNB" || nama.includes("seni")) offset = 160
  else if (kode === "AIK" || nama.includes("koding") || nama.includes("ai")) offset = 170
  else if (kode === "KWU" || kode === "PKWU" || nama.includes("prakarya")) offset = 180
  else if (kode === "MLK" || nama.includes("muatan lokal") || nama.includes("sunda") || nama.includes("jawa")) offset = 190

  return baseScore + offset
}

/** Mapping kategori kurikulum lama → kelompok mapel PGS. */
export function kategoriKeKelompok(kategori: KategoriMapel | string): "A" | "B" | "C" | "muatan_lokal" {
  const k = (kategori || "").toLowerCase()
  if (k.includes("muatan")) return "muatan_lokal"
  if (k.includes("pilihan")) return "C"
  if (k.includes("peminatan")) return "C"
  return "A"
}
