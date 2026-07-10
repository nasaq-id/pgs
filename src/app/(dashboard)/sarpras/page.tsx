"use client"

import { useState, useEffect } from "react"
import {
  Plus, Pencil, Trash2, Search, X, Building2, Box, CheckCircle, AlertTriangle,
  School, Monitor, BookOpen, Sofa, Trophy, Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import KelasTab from "@/components/sarpras/KelasTab"

interface Prasarana {
  id: string
  nama: string
  tipe: string
  kondisi: string
  luas: number
  keterangan: string
}

interface Sarana {
  id: string
  nama: string
  kategori: string
  jumlah: number
  kondisi: string
  lokasiPrasaranaId: string
  merkSpec: string
  tahunPengadaan: string
}

const INITIAL_PRASARANA: Prasarana[] = [
  { id: "pra-1", nama: "Ruang Kelas VII-A", tipe: "Ruang Kelas", kondisi: "Baik", luas: 56, keterangan: "Gedung A, Lantai 1" },
  { id: "pra-2", nama: "Ruang Kelas VIII-B", tipe: "Ruang Kelas", kondisi: "Baik", luas: 56, keterangan: "Gedung A, Lantai 2" },
  { id: "pra-3", nama: "Ruang Kelas IX-A", tipe: "Ruang Kelas", kondisi: "Baik", luas: 56, keterangan: "Gedung B, Lantai 1" },
  { id: "pra-4", nama: "Laboratorium Komputer", tipe: "Laboratorium", kondisi: "Baik", luas: 80, keterangan: "Gedung C, Lantai 1" },
  { id: "pra-5", nama: "Perpustakaan Al-Hikmah", tipe: "Perpustakaan", kondisi: "Baik", luas: 72, keterangan: "Gedung B, Lantai 2" },
  { id: "pra-6", nama: "Ruang Guru & TU", tipe: "Kantor Guru", kondisi: "Baik", luas: 64, keterangan: "Gedung A, Lantai 1" },
  { id: "pra-7", nama: "Lapangan Olahraga Utama", tipe: "Fasilitas Olahraga", kondisi: "Rusak Ringan", luas: 300, keterangan: "Halaman Utama Madrasah" },
]

const INITIAL_SARANA: Sarana[] = [
  { id: "sar-1", nama: "Meja Siswa Kayu", kategori: "Meubeler", jumlah: 32, kondisi: "Baik", lokasiPrasaranaId: "pra-1", merkSpec: "Kayu Jati Minimalis", tahunPengadaan: "2024" },
  { id: "sar-2", nama: "Kursi Siswa Besi", kategori: "Meubeler", jumlah: 32, kondisi: "Baik", lokasiPrasaranaId: "pra-1", merkSpec: "Rangka Besi Alas Kayu", tahunPengadaan: "2024" },
  { id: "sar-3", nama: "Meja Siswa Kayu", kategori: "Meubeler", jumlah: 32, kondisi: "Baik", lokasiPrasaranaId: "pra-2", merkSpec: "Kayu Jati Minimalis", tahunPengadaan: "2023" },
  { id: "sar-4", nama: "Kursi Siswa Besi", kategori: "Meubeler", jumlah: 32, kondisi: "Baik", lokasiPrasaranaId: "pra-2", merkSpec: "Rangka Besi Alas Kayu", tahunPengadaan: "2023" },
  { id: "sar-5", nama: "Meja Siswa Kayu", kategori: "Meubeler", jumlah: 32, kondisi: "Baik", lokasiPrasaranaId: "pra-3", merkSpec: "Kayu Jati Minimalis", tahunPengadaan: "2024" },
  { id: "sar-6", nama: "Kursi Siswa Besi", kategori: "Meubeler", jumlah: 32, kondisi: "Baik", lokasiPrasaranaId: "pra-3", merkSpec: "Rangka Besi Alas Kayu", tahunPengadaan: "2024" },
  { id: "sar-7", nama: "Proyektor Epson EB-X41", kategori: "Elektronik", jumlah: 1, kondisi: "Baik", lokasiPrasaranaId: "pra-1", merkSpec: "Epson LCD Projector HD", tahunPengadaan: "2025" },
  { id: "sar-8", nama: "Proyektor Epson EB-X41", kategori: "Elektronik", jumlah: 1, kondisi: "Baik", lokasiPrasaranaId: "pra-2", merkSpec: "Epson LCD Projector HD", tahunPengadaan: "2025" },
  { id: "sar-9", nama: "Proyektor Epson EB-X41", kategori: "Elektronik", jumlah: 1, kondisi: "Rusak Ringan", lokasiPrasaranaId: "pra-3", merkSpec: "Epson LCD Projector HD", tahunPengadaan: "2023" },
  { id: "sar-10", nama: "PC Client Lenovo ThinkCentre", kategori: "Elektronik", jumlah: 24, kondisi: "Baik", lokasiPrasaranaId: "pra-4", merkSpec: "Intel Core i5, RAM 8GB, SSD 256GB", tahunPengadaan: "2024" },
  { id: "sar-11", nama: "Buku Paket Bahasa Arab VII", kategori: "Buku/Pustaka", jumlah: 80, kondisi: "Baik", lokasiPrasaranaId: "pra-5", merkSpec: "Kemenag RI Cetakan 2023", tahunPengadaan: "2023" },
  { id: "sar-12", nama: "Meja Kerja Guru Jati", kategori: "Meubeler", jumlah: 10, kondisi: "Baik", lokasiPrasaranaId: "pra-6", merkSpec: "Kayu Jati 1 Biro", tahunPengadaan: "2022" },
  { id: "sar-13", nama: "Kursi Busa Putar Savello", kategori: "Meubeler", jumlah: 12, kondisi: "Baik", lokasiPrasaranaId: "pra-6", merkSpec: "Kursi Kerja Ergonomis", tahunPengadaan: "2023" },
  { id: "sar-14", nama: "AC Split Panasonic 1.5 PK", kategori: "Elektronik", jumlah: 2, kondisi: "Baik", lokasiPrasaranaId: "pra-6", merkSpec: "Panasonic R32 Eco", tahunPengadaan: "2024" },
  { id: "sar-15", nama: "Gawang Futsal Portable & Net", kategori: "Peralatan Olahraga", jumlah: 2, kondisi: "Rusak Ringan", lokasiPrasaranaId: "pra-7", merkSpec: "Besi Pipa 2 Inch Portable", tahunPengadaan: "2022" },
]

function getConditionColor(kondisi: string) {
  switch (kondisi) {
    case "Baik": return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "Rusak Ringan": return "bg-amber-50 text-amber-700 border-amber-200"
    case "Rusak Berat": return "bg-rose-50 text-rose-700 border-rose-200"
    default: return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

function getCategoryBadgeColor(kat: string) {
  switch (kat) {
    case "Elektronik": return "bg-purple-50 text-purple-700 border-purple-200"
    case "Meubeler": return "bg-amber-50 text-amber-700 border-amber-200"
    case "Alat Peraga": return "bg-teal-50 text-teal-700 border-teal-200"
    case "Buku/Pustaka": return "bg-sky-50 text-sky-700 border-sky-200"
    case "Peralatan Olahraga": return "bg-rose-50 text-rose-700 border-rose-200"
    default: return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

function getPrasaranaIcon(tipe: string) {
  switch (tipe) {
    case "Ruang Kelas": return <School className="w-5 h-5 text-teal-600" />
    case "Laboratorium": return <Monitor className="w-5 h-5 text-sky-600" />
    case "Perpustakaan": return <BookOpen className="w-5 h-5 text-emerald-600" />
    case "Kantor Guru": return <Sofa className="w-5 h-5 text-amber-600" />
    case "Fasilitas Olahraga": return <Trophy className="w-5 h-5 text-rose-600" />
    default: return <Building2 className="w-5 h-5 text-slate-600" />
  }
}

export default function SarprasPage() {
  const [activeTab, setActiveTab] = useState<"kelas" | "sarana" | "prasarana">("kelas")

  // Prasarana state
  const [prasaranaList, setPrasaranaList] = useState<Prasarana[]>(() => {
    if (typeof window === "undefined") return INITIAL_PRASARANA
    try {
      const saved = localStorage.getItem("pgs_prasarana")
      return saved ? JSON.parse(saved) : INITIAL_PRASARANA
    } catch { return INITIAL_PRASARANA }
  })

  // Sarana state
  const [saranaList, setSaranaList] = useState<Sarana[]>(() => {
    if (typeof window === "undefined") return INITIAL_SARANA
    try {
      const saved = localStorage.getItem("pgs_sarana")
      return saved ? JSON.parse(saved) : INITIAL_SARANA
    } catch { return INITIAL_SARANA }
  })

  useEffect(() => {
    localStorage.setItem("pgs_prasarana", JSON.stringify(prasaranaList))
  }, [prasaranaList])

  useEffect(() => {
    localStorage.setItem("pgs_sarana", JSON.stringify(saranaList))
  }, [saranaList])

  // Sarana filters
  const [saranaSearch, setSaranaSearch] = useState("")
  const [saranaKategoriFilter, setSaranaKategoriFilter] = useState("Semua Kategori")
  const [saranaKondisiFilter, setSaranaKondisiFilter] = useState("Semua Kondisi")
  const [saranaLokasiFilter, setSaranaLokasiFilter] = useState("Semua Lokasi")

  // Prasarana filters
  const [prasaranaSearch, setPrasaranaSearch] = useState("")
  const [prasaranaTipeFilter, setPrasaranaTipeFilter] = useState("Semua Tipe")
  const [prasaranaKondisiFilter, setPrasaranaKondisiFilter] = useState("Semua Kondisi")

  // Modal state - Prasarana
  const [prasaranaModalOpen, setPrasaranaModalOpen] = useState(false)
  const [editingPrasarana, setEditingPrasarana] = useState<Prasarana | null>(null)
  const [prasaranaForm, setPrasaranaForm] = useState<Omit<Prasarana, "id">>({
    nama: "", tipe: "Ruang Kelas", kondisi: "Baik", luas: 0, keterangan: "",
  })

  // Modal state - Sarana
  const [saranaModalOpen, setSaranaModalOpen] = useState(false)
  const [editingSarana, setEditingSarana] = useState<Sarana | null>(null)
  const [saranaForm, setSaranaForm] = useState<Omit<Sarana, "id">>({
    nama: "", kategori: "Elektronik", jumlah: 1, kondisi: "Baik",
    lokasiPrasaranaId: "unassigned", merkSpec: "", tahunPengadaan: new Date().getFullYear().toString(),
  })

  // Detail Prasarana modal
  const [detailPrasarana, setDetailPrasarana] = useState<Prasarana | null>(null)

  // Stats
  const totalSaranaUnits = saranaList.reduce((a, c) => a + c.jumlah, 0)
  const goodSaranaCount = saranaList.filter(s => s.kondisi === "Baik").reduce((a, c) => a + c.jumlah, 0)
  const damagedSaranaCount = saranaList.filter(s => s.kondisi !== "Baik").reduce((a, c) => a + c.jumlah, 0)
  const totalPrasaranaLuas = prasaranaList.reduce((a, c) => a + c.luas, 0)
  const goodPrasaranaCount = prasaranaList.filter(p => p.kondisi === "Baik").length

  // Filtered data
  const filteredSarana = saranaList.filter(s => {
    const q = saranaSearch.toLowerCase()
    const matchesSearch = s.nama.toLowerCase().includes(q) || s.merkSpec.toLowerCase().includes(q)
    const matchesKategori = saranaKategoriFilter === "Semua Kategori" || s.kategori === saranaKategoriFilter
    const matchesKondisi = saranaKondisiFilter === "Semua Kondisi" || s.kondisi === saranaKondisiFilter
    const matchesLokasi = saranaLokasiFilter === "Semua Lokasi"
      || (saranaLokasiFilter === "Belum Ditempatkan" && s.lokasiPrasaranaId === "unassigned")
      || s.lokasiPrasaranaId === saranaLokasiFilter
    return matchesSearch && matchesKategori && matchesKondisi && matchesLokasi
  })

  const filteredPrasarana = prasaranaList.filter(p => {
    const q = prasaranaSearch.toLowerCase()
    const matchesSearch = p.nama.toLowerCase().includes(q) || p.keterangan.toLowerCase().includes(q)
    const matchesTipe = prasaranaTipeFilter === "Semua Tipe" || p.tipe === prasaranaTipeFilter
    const matchesKondisi = prasaranaKondisiFilter === "Semua Kondisi" || p.kondisi === prasaranaKondisiFilter
    return matchesSearch && matchesTipe && matchesKondisi
  })

  // Prasarana CRUD
  const handleOpenAddPrasarana = () => {
    setEditingPrasarana(null)
    setPrasaranaForm({ nama: "", tipe: "Ruang Kelas", kondisi: "Baik", luas: 54, keterangan: "" })
    setPrasaranaModalOpen(true)
  }

  const handleOpenEditPrasarana = (p: Prasarana, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPrasarana(p)
    setPrasaranaForm({ nama: p.nama, tipe: p.tipe, kondisi: p.kondisi, luas: p.luas, keterangan: p.keterangan })
    setPrasaranaModalOpen(true)
  }

  const handleSavePrasarana = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prasaranaForm.nama.trim()) return
    if (editingPrasarana) {
      setPrasaranaList(prev => prev.map(p => p.id === editingPrasarana.id ? { ...p, ...prasaranaForm } : p))
    } else {
      setPrasaranaList(prev => [...prev, { id: `pra-${Date.now()}`, ...prasaranaForm }])
    }
    setPrasaranaModalOpen(false)
  }

  const handleDeletePrasarana = (p: Prasarana, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Apakah Anda yakin ingin menghapus prasarana "${p.nama}"?`)) {
      setPrasaranaList(prev => prev.filter(item => item.id !== p.id))
      setSaranaList(prev => prev.map(s => s.lokasiPrasaranaId === p.id ? { ...s, lokasiPrasaranaId: "unassigned" } : s))
    }
  }

  // Sarana CRUD
  const handleOpenAddSarana = () => {
    setEditingSarana(null)
    setSaranaForm({
      nama: "", kategori: "Meubeler", jumlah: 10, kondisi: "Baik",
      lokasiPrasaranaId: "unassigned", merkSpec: "", tahunPengadaan: new Date().getFullYear().toString(),
    })
    setSaranaModalOpen(true)
  }

  const handleOpenEditSarana = (s: Sarana) => {
    setEditingSarana(s)
    setSaranaForm({
      nama: s.nama, kategori: s.kategori, jumlah: s.jumlah, kondisi: s.kondisi,
      lokasiPrasaranaId: s.lokasiPrasaranaId, merkSpec: s.merkSpec, tahunPengadaan: s.tahunPengadaan,
    })
    setSaranaModalOpen(true)
  }

  const handleSaveSarana = (e: React.FormEvent) => {
    e.preventDefault()
    if (!saranaForm.nama.trim()) return
    if (editingSarana) {
      setSaranaList(prev => prev.map(s => s.id === editingSarana.id ? { ...s, ...saranaForm } : s))
    } else {
      setSaranaList(prev => [...prev, { id: `sar-${Date.now()}`, ...saranaForm }])
    }
    setSaranaModalOpen(false)
  }

  const handleDeleteSarana = (s: Sarana) => {
    if (confirm(`Apakah Anda yakin ingin menghapus sarana "${s.nama}"?`)) {
      setSaranaList(prev => prev.filter(item => item.id !== s.id))
    }
  }

  const getPrasaranaName = (id: string) => {
    if (id === "unassigned") return "Belum Ditempatkan"
    return prasaranaList.find(p => p.id === id)?.nama ?? "Tidak Diketahui"
  }

  // Filter options
  const kategoriOptions = ["Semua Kategori", "Elektronik", "Meubeler", "Alat Peraga", "Buku/Pustaka", "Peralatan Olahraga", "Lainnya"]
  const kondisiOptions = ["Semua Kondisi", "Baik", "Rusak Ringan", "Rusak Berat"]
  const tipeOptions = ["Semua Tipe", "Ruang Kelas", "Laboratorium", "Perpustakaan", "Kantor Guru", "Fasilitas Olahraga", "Lainnya"]

  const tabClass = (tab: string) =>
    `flex-1 shrink-0 px-4 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
      activeTab === tab
        ? "bg-white dark:bg-slate-950 text-teal-650 dark:text-teal-400 shadow-xs"
        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40"
    }`

  return (
    <div className="animate-fade-in space-y-6 text-left">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Sarana & Prasarana</h2>
        <p className="text-muted-foreground text-xs mt-1">Kelola data sarana dan prasarana sekolah</p>
      </div>

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl overflow-x-auto w-full max-w-md hide-scrollbar border border-slate-200/50 dark:border-slate-800/40">
        <button onClick={() => setActiveTab("kelas")} className={tabClass("kelas")}>Rombel Kelas</button>
        <button onClick={() => setActiveTab("sarana")} className={tabClass("sarana")}>Data Sarana</button>
        <button onClick={() => setActiveTab("prasarana")} className={tabClass("prasarana")}>Prasarana</button>
      </div>

      {/* Tab Content */}
      {activeTab === "kelas" && <KelasTab />}

      {/* ===== DATA SARANA TAB ===== */}
      {activeTab === "sarana" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Total Sarana / Inventaris</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalSaranaUnits} Unit</h3>
              </div>
            </div>
            <div className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Kondisi Baik</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {goodSaranaCount} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {totalSaranaUnits} Unit</span>
                </h3>
              </div>
            </div>
            <div className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Perlu Perbaikan / Rusak</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{damagedSaranaCount} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Unit</span></h3>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 md:p-6 mb-6 space-y-5">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={saranaSearch}
                    onChange={e => setSaranaSearch(e.target.value)}
                    placeholder="Cari nama/spesifikasi..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900/60 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition-all text-slate-700 dark:text-slate-300"
                  />
                </div>
                <SearchableSelect
                  value={saranaKategoriFilter}
                  onValueChange={setSaranaKategoriFilter}
                  options={kategoriOptions.map(v => ({ value: v, label: v }))}
                  placeholder="Semua Kategori"
                  className="w-full !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer"
                />
                <SearchableSelect
                  value={saranaKondisiFilter}
                  onValueChange={setSaranaKondisiFilter}
                  options={kondisiOptions.map(v => ({ value: v, label: v }))}
                  placeholder="Semua Kondisi"
                  className="w-full !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer"
                />
                <SearchableSelect
                  value={saranaLokasiFilter}
                  onValueChange={setSaranaLokasiFilter}
                  options={[
                    { value: "Semua Lokasi", label: "Semua Lokasi" },
                    { value: "Belum Ditempatkan", label: "Belum Ditempatkan" },
                    ...prasaranaList.map(p => ({ value: p.id, label: p.nama })),
                  ]}
                  placeholder="Semua Lokasi"
                  className="w-full !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer"
                />
              </div>
              <button
                onClick={handleOpenAddSarana}
                className="w-full lg:w-auto bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Tambah Sarana</span>
              </button>
            </div>
          </div>

          {/* Mobile View: Card List (Visible on mobile, hidden on desktop) */}
          <div className="md:hidden space-y-4">
            {filteredSarana.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-8 text-center text-slate-400 font-semibold shadow-sm">
                Tidak ada data sarana yang cocok dengan filter pencarian.
              </div>
            ) : (
              filteredSarana.map(s => (
                <div key={s.id} className="glass-card rounded-[22px] border border-slate-200/85 dark:border-slate-800/85 p-4 shadow-sm space-y-3 relative text-left bg-white dark:bg-slate-900/40">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">TAHUN: {s.tahunPengadaan}</span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-tight mt-0.5 truncate">{s.nama}</h4>
                    </div>
                    <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded-full border shrink-0 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30">
                      Jumlah: {s.jumlah} Unit
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getCategoryBadgeColor(s.kategori)}`}>
                      {s.kategori}
                    </span>
                    <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getConditionColor(s.kondisi)}`}>
                      {s.kondisi}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="min-w-0 pr-2">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Lokasi / Ruangan</span>
                      {s.lokasiPrasaranaId === "unassigned" ? (
                        <span className="text-[10px] text-slate-400 italic font-semibold mt-1 block">Belum Ditempatkan</span>
                      ) : (
                        <span className="font-bold text-teal-600 dark:text-teal-400 text-xs flex items-center gap-1 mt-1 truncate">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[150px]">{getPrasaranaName(s.lokasiPrasaranaId)}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex space-x-1.5 items-center shrink-0">
                      <button
                        onClick={() => handleOpenEditSarana(s)}
                        className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSarana(s)}
                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-450 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table (Visible on desktop, hidden on mobile) */}
          <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-150 dark:border-slate-800">
                <TableRow>
                  <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Nama Sarana</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Kategori</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jumlah</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Kondisi</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Lokasi / Ruangan</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Spesifikasi & Merk</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Pengadaan</TableHead>
                  <TableHead className="text-right w-24 text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSarana.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold">
                      Tidak ada data sarana yang cocok dengan filter pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSarana.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                      <TableCell className="font-extrabold text-slate-800 dark:text-slate-205 text-xs">{s.nama}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getCategoryBadgeColor(s.kategori)}`}>
                          {s.kategori}
                        </span>
                      </TableCell>
                      <TableCell className="font-extrabold text-slate-700 dark:text-slate-300 text-xs">{s.jumlah} Unit</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getConditionColor(s.kondisi)}`}>
                          {s.kondisi}
                        </span>
                      </TableCell>
                      <TableCell>
                        {s.lokasiPrasaranaId === "unassigned" ? (
                          <span className="text-slate-400 font-semibold text-xs italic">Belum Ditempatkan</span>
                        ) : (
                          <span className="font-bold text-teal-600 dark:text-teal-400 text-xs flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {getPrasaranaName(s.lokasiPrasaranaId)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs block max-w-[200px] truncate" title={s.merkSpec}>
                          {s.merkSpec || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs">{s.tahunPengadaan}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditSarana(s)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-900/30 transition-all shadow-xs cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSarana(s)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/30 transition-all shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ===== PRASARANA TAB ===== */}
      {activeTab === "prasarana" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest block">Total Ruangan / Prasarana</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{prasaranaList.length} Ruangan</h3>
              </div>
            </div>
            <div className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest block">Total Luas Bangunan</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalPrasaranaLuas} m&sup2;</h3>
              </div>
            </div>
            <div className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-[0_4px_20px_rgb(0,0,0,0.01)]">
              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-xl shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest block">Kondisi Baik</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {goodPrasaranaCount} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {prasaranaList.length} Ruang</span>
                </h3>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 md:p-6 mb-6 space-y-5">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={prasaranaSearch}
                    onChange={e => setPrasaranaSearch(e.target.value)}
                    placeholder="Cari prasarana/ruangan..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900/60 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition-all text-slate-700 dark:text-slate-300"
                  />
                </div>
                <SearchableSelect
                  value={prasaranaTipeFilter}
                  onValueChange={setPrasaranaTipeFilter}
                  options={tipeOptions.map(v => ({ value: v, label: v }))}
                  placeholder="Semua Tipe"
                  className="w-full !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer"
                />
                <SearchableSelect
                  value={prasaranaKondisiFilter}
                  onValueChange={setPrasaranaKondisiFilter}
                  options={kondisiOptions.map(v => ({ value: v, label: v }))}
                  placeholder="Semua Kondisi"
                  className="w-full !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer"
                />
              </div>
              <button
                onClick={handleOpenAddPrasarana}
                className="w-full lg:w-auto bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Tambah Prasarana</span>
              </button>
            </div>
          </div>

          {/* Card Grid */}
          {filteredPrasarana.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-350">Tidak ada Prasarana</h3>
              <p className="text-slate-400 text-sm mt-1">Data prasarana tidak ditemukan berdasarkan filter yang diterapkan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrasarana.map(p => {
                const itemsInRoom = saranaList.filter(s => s.lokasiPrasaranaId === p.id)
                const totalItemsQty = itemsInRoom.reduce((a, c) => a + c.jumlah, 0)
                return (
                  <div
                    key={p.id}
                    onClick={() => setDetailPrasarana(p)}
                    className="glass-card rounded-[22px] border border-slate-200/85 dark:border-slate-800/85 p-5 hover:shadow-xl hover:border-teal-300 dark:hover:border-teal-850 hover:bg-white dark:hover:bg-slate-900/50 transition-all cursor-pointer flex flex-col justify-between bg-white dark:bg-slate-900/40 text-left shadow-[0_4px_20px_rgb(0,0,0,0.01)]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl">{getPrasaranaIcon(p.tipe)}</div>
                      <span className={`px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getConditionColor(p.kondisi)}`}>
                        {p.kondisi}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{p.tipe}</span>
                      <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-1 block truncate">{p.nama}</h4>
                      <p className="text-slate-400 dark:text-slate-450 text-xs mt-1.5 font-medium line-clamp-2">
                        {p.keterangan || "Tidak ada keterangan tambahan."}
                      </p>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-5 flex justify-between items-center">
                      <div className="flex space-x-4">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Luas</span>
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{p.luas} m&sup2;</span>
                        </div>
                        <div className="border-l border-slate-150 dark:border-slate-800 pl-4">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Inventaris</span>
                          <span className="text-xs font-extrabold text-teal-650 dark:text-teal-400">{totalItemsQty} Unit</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => handleOpenEditPrasarana(p, e)}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-900/30 transition-all shadow-xs cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => handleDeletePrasarana(p, e)}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-450 hover:border-rose-200 dark:hover:border-rose-900/30 transition-all shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== PRASARANA MODAL ===== */}
      {prasaranaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay p-4">
          <div className="glass-dialog rounded-2xl w-full max-w-md mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h3 className="font-semibold text-foreground">{editingPrasarana ? "Edit Prasarana" : "Tambah Prasarana"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingPrasarana ? "Perbarui informasi prasarana." : "Daftarkan prasarana baru."}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPrasaranaModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSavePrasarana} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Prasarana / Ruang</label>
                <Input
                  required
                  value={prasaranaForm.nama}
                  onChange={e => setPrasaranaForm(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Ruang Kelas VII-C, Laboratorium Bahasa"
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tipe</label>
                  <SearchableSelect
                    value={prasaranaForm.tipe}
                    onValueChange={val => setPrasaranaForm(prev => ({ ...prev, tipe: val }))}
                    options={["Ruang Kelas", "Laboratorium", "Perpustakaan", "Kantor Guru", "Fasilitas Olahraga", "Lainnya"].map(v => ({ value: v, label: v }))}
                    placeholder="Pilih Tipe"
                    className="h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Kondisi</label>
                  <SearchableSelect
                    value={prasaranaForm.kondisi}
                    onValueChange={val => setPrasaranaForm(prev => ({ ...prev, kondisi: val }))}
                    options={["Baik", "Rusak Ringan", "Rusak Berat"].map(v => ({ value: v, label: v }))}
                    placeholder="Pilih Kondisi"
                    className="h-10 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Luas (m&sup2;)</label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={prasaranaForm.luas || ""}
                  onChange={e => setPrasaranaForm(prev => ({ ...prev, luas: parseInt(e.target.value) || 0 }))}
                  placeholder="Luas ruangan dalam meter persegi"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Keterangan</label>
                <textarea
                  value={prasaranaForm.keterangan}
                  onChange={e => setPrasaranaForm(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Detail lokasi (contoh: Gedung Utara Lantai 2)"
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:border-teal-500 focus:bg-white transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setPrasaranaModalOpen(false)}
                  className="flex-1 !h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                >
                  Batal
                </Button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== SARANA MODAL ===== */}
      {saranaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay p-4">
          <div className="glass-dialog rounded-2xl w-full max-w-md mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h3 className="font-semibold text-foreground">{editingSarana ? "Edit Sarana" : "Tambah Sarana / Inventaris"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingSarana ? "Perbarui informasi inventaris." : "Daftarkan inventaris baru."}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSaranaModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSaveSarana} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Barang / Inventaris</label>
                <Input
                  required
                  value={saranaForm.nama}
                  onChange={e => setSaranaForm(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Meja Siswa Kayu, Proyektor LCD"
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Kategori</label>
                  <SearchableSelect
                    value={saranaForm.kategori}
                    onValueChange={val => setSaranaForm(prev => ({ ...prev, kategori: val }))}
                    options={["Elektronik", "Meubeler", "Alat Peraga", "Buku/Pustaka", "Peralatan Olahraga", "Lainnya"].map(v => ({ value: v, label: v }))}
                    placeholder="Pilih Kategori"
                    className="h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Kondisi</label>
                  <SearchableSelect
                    value={saranaForm.kondisi}
                    onValueChange={val => setSaranaForm(prev => ({ ...prev, kondisi: val }))}
                    options={["Baik", "Rusak Ringan", "Rusak Berat"].map(v => ({ value: v, label: v }))}
                    placeholder="Pilih Kondisi"
                    className="h-10 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Jumlah (Unit)</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={saranaForm.jumlah || ""}
                    onChange={e => setSaranaForm(prev => ({ ...prev, jumlah: parseInt(e.target.value) || 0 }))}
                    placeholder="Contoh: 10"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tahun Pengadaan</label>
                  <Input
                    required
                    maxLength={4}
                    value={saranaForm.tahunPengadaan}
                    onChange={e => setSaranaForm(prev => ({ ...prev, tahunPengadaan: e.target.value }))}
                    placeholder="Contoh: 2024"
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Lokasi Penempatan</label>
                <SearchableSelect
                  value={saranaForm.lokasiPrasaranaId}
                  onValueChange={val => setSaranaForm(prev => ({ ...prev, lokasiPrasaranaId: val }))}
                  options={[
                    { value: "unassigned", label: "Belum Ditempatkan (Gudang/Cadangan)" },
                    ...prasaranaList.map(p => ({ value: p.id, label: p.nama })),
                  ]}
                  placeholder="Pilih Lokasi"
                  className="h-10 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Spesifikasi / Merk</label>
                <Input
                  value={saranaForm.merkSpec}
                  onChange={e => setSaranaForm(prev => ({ ...prev, merkSpec: e.target.value }))}
                  placeholder="Contoh: Asus Core i3, Kayu Jati Perhutani"
                  className="text-xs"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSaranaModalOpen(false)}
                  className="flex-1 !h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                >
                  Batal
                </Button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DETAIL PRASARANA MODAL ===== */}
      {detailPrasarana && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay p-4">
          <div className="glass-dialog rounded-2xl w-full max-w-2xl mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 rounded-xl">{getPrasaranaIcon(detailPrasarana.tipe)}</div>
                <div>
                  <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest block">{detailPrasarana.tipe}</span>
                  <h3 className="text-lg font-extrabold text-slate-800">{detailPrasarana.nama}</h3>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDetailPrasarana(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs text-slate-500 font-medium">
                Luas Ruang: {detailPrasarana.luas} m&sup2; &bull; Kondisi: {detailPrasarana.kondisi}
                {detailPrasarana.keterangan ? ` &bull; ${detailPrasarana.keterangan}` : ""}
              </p>
            </div>

            <div className="px-6 pb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                Daftar Inventaris di Ruangan Ini
              </h4>
              <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/30">
                {saranaList.filter(s => s.lokasiPrasaranaId === detailPrasarana.id).length === 0 ? (
                  <div className="text-center py-12">
                    <Box className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs font-semibold">Ruangan ini dalam keadaan kosong.</p>
                    <p className="text-slate-400 text-[10px] mt-1">Belum ada sarana yang ditempatkan di ruangan ini.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase">Nama Barang</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase">Kategori</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase">Jumlah</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase">Kondisi</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase">Spesifikasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saranaList
                        .filter(s => s.lokasiPrasaranaId === detailPrasarana.id)
                        .map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-extrabold text-slate-800 text-xs">{s.nama}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getCategoryBadgeColor(s.kategori)}`}>
                                {s.kategori}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold text-slate-700 text-xs">{s.jumlah} Unit</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getConditionColor(s.kondisi)}`}>
                                {s.kondisi}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-500 font-semibold text-xs">{s.merkSpec || "-"}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 glass-dialog-footer">
              <Button
                variant="outline"
                onClick={() => setDetailPrasarana(null)}
                className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Tutup Detail
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
