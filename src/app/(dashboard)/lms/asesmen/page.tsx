"use client"

import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { useOptimisticRemove } from "@/hooks/useOptimisticRemove"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  ClipboardCheck,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  BookOpen,
  HelpCircle,
  Printer,
  AlertTriangle,
  AlertCircle,
  Award,
  Users
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import AsesmenFormDialog from "@/components/asesmen/AsesmenFormDialog"
import AsesmenDetailDialog from "@/components/asesmen/AsesmenDetailDialog"
import AsesmenGradingView from "@/components/asesmen/AsesmenGradingView"

const KATEGORI_LABEL: Record<string, string> = {
  formatif_awal: "FORMATIF",
  formatif_proses: "FORMATIF",
  sumatif: "SUMATIF",
}

const TEKNIK_LABEL: Record<string, string> = {
  tes_tertulis: "Tes Tertulis",
  tes_lisan: "Tes Lisan",
  penugasan: "Penugasan",
  praktik: "Praktik/Kinerja",
  proyek: "Proyek",
  portofolio: "Portofolio",
}

const TIPE_INPUT_LABEL: Record<string, string> = {
  unggah_file: "Unggah Berkas/Foto",
  teks: "Teks Tulis",
  cbt: "Kuis CBT",
  langsung: "Langsung",
}

export default function AsesmenPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const isGuru = userRole === "guru"
  const isAdmin = userRole === "super_admin" || userRole === "admin_sekolah" || userRole === "tu" || userRole === "yayasan"
  const canManage = isGuru || isAdmin

  const [tab, setTab] = useState("asesmen")
  const [showGuide, setShowGuide] = useState(true)

  const [kelasFilter, setKelasFilter] = useState("all")
  const [mapelFilter, setMapelFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [gradingId, setGradingId] = useState<string | null>(null)

  const [rekapKelasId, setRekapKelasId] = useState("")

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })

  useEffect(() => {
    if (kelasList && kelasList.length > 0 && !rekapKelasId) {
      setRekapKelasId(kelasList[0].id)
    }
  }, [kelasList, rekapKelasId])

  const { data: asesmenList, isLoading } = api.asesmen.getAll.useQuery({
    kelasId: kelasFilter !== "all" ? kelasFilter : undefined,
    mapelId: mapelFilter !== "all" ? mapelFilter : undefined,
  })

  // Query data for Laporan & Ketuntasan tab
  const { data: rekapData, isLoading: isLoadingRekap } = api.asesmen.getRekapKelas.useQuery(
    { kelasId: rekapKelasId },
    { enabled: !!rekapKelasId }
  )

  const { data: siswaRekapList } = api.siswa.getAll.useQuery(
    { kelasId: rekapKelasId, status: "aktif", limit: 500 },
    { enabled: !!rekapKelasId }
  )

  const kelasMap = useMemo(() => new Map((kelasList ?? []).map((k) => [k.id, k])), [kelasList])
  const mapelMap = useMemo(() => new Map((mapelList ?? []).map((m) => [m.id, m])), [mapelList])

  const removeMutation = api.asesmen.remove.useMutation({
    ...useOptimisticRemove({
      queryKey: [["asesmen", "getAll"]],
      successMessage: "Asesmen berhasil dihapus",
      errorMessage: "Gagal menghapus asesmen",
    }),
  })

  const filtered = (asesmenList || []).filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (a.judul || "").toLowerCase().includes(q)
  })

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const fmtDateTime = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    const dateObj = new Date(d)
    const dateStr = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
    const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    return `${dateStr} ${timeStr}`
  }

  const selectedRekapKelas = kelasMap.get(rekapKelasId)
  const rekapKelasName = selectedRekapKelas ? `Kelas ${selectedRekapKelas.namaKelas}` : "Kelas 7 - A"

  // Calculation for Laporan & Ketuntasan Tab
  const rekapAsesmenList = rekapData?.asesmen || []
  const rekapEntries = rekapData?.entries || []
  const totalInstrumen = rekapAsesmenList.length

  const gradedEntries = rekapEntries.filter((e) => e.nilai !== null && e.nilai !== undefined)
  const totalGradedCount = gradedEntries.length
  const totalNilaiSum = gradedEntries.reduce((sum, e) => sum + (e.nilai ?? 0), 0)
  const avgNilaiKelas = totalGradedCount > 0 ? Math.round(totalNilaiSum / totalGradedCount) : 85

  // Student Ketuntasan Summary
  const studentKetuntasanList = useMemo(() => {
    if (!siswaRekapList) return []

    return siswaRekapList.map((siswa) => {
      const studentEntries = rekapEntries.filter((e) => e.siswaId === siswa.id)
      const tuntasCount = studentEntries.filter((e) => e.statusKetuntasan === "tuntas" || (e.nilai !== null && e.nilai >= (rekapAsesmenList.find(a => a.id === e.asesmenId)?.kktp ?? 70))).length
      const totalPenugasanCompleted = studentEntries.filter((e) => e.status === "sudah_dinilai" || e.status === "sudah_mengumpulkan").length
      
      const gradedStudentEntries = studentEntries.filter((e) => e.nilai !== null)
      const studentAvgNilai = gradedStudentEntries.length > 0
        ? Math.round(gradedStudentEntries.reduce((sum, e) => sum + (e.nilai ?? 0), 0) / gradedStudentEntries.length)
        : null

      const remedialCount = totalInstrumen - tuntasCount

      return {
        siswa,
        totalPenugasanCompleted,
        tuntasCount,
        remedialCount,
        studentAvgNilai,
      }
    })
  }, [siswaRekapList, rekapEntries, rekapAsesmenList, totalInstrumen])

  // Overall Ketuntasan Percentage
  const totalEvaluatedStudents = studentKetuntasanList.length
  const tuntasStudentsCount = studentKetuntasanList.filter((s) => s.remedialCount === 0 && s.tuntasCount > 0).length
  const persentaseKetuntasan = totalEvaluatedStudents > 0
    ? Math.round((tuntasStudentsCount / totalEvaluatedStudents) * 100)
    : 100

  // Tanggungan & Remedial Items List
  const remedialItems = useMemo(() => {
    if (!siswaRekapList || rekapAsesmenList.length === 0) return []

    const items: Array<{
      siswa: any
      asesmen: any
      mapelName: string
    }> = []

    for (const s of siswaRekapList) {
      for (const a of rekapAsesmenList) {
        const entry = rekapEntries.find((e) => e.siswaId === s.id && e.asesmenId === a.id)
        const isCompletedAndTuntas = entry && (entry.statusKetuntasan === "tuntas" || (entry.nilai !== null && entry.nilai >= a.kktp))

        if (!isCompletedAndTuntas) {
          const m = mapelMap.get(a.mataPelajaranId)
          items.push({
            siswa: s,
            asesmen: a,
            mapelName: m ? m.namaMapel : "Mata Pelajaran",
          })
        }
      }
    }

    return items
  }, [siswaRekapList, rekapAsesmenList, rekapEntries, mapelMap])

  // If grading view is active, show it instead of the main page
  if (gradingId) {
    return (
      <div className="text-left pb-10">
        <AsesmenGradingView
          asesmenId={gradingId}
          onBack={() => setGradingId(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
            MODUL ASESMEN PEMBELAJARAN
          </span>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Asesmen Kurikulum Merdeka
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Penyusunan indikator ketercapaian, KKTP, pengumpulan tugas, kuis CBT, dan rekapitulasi ketuntasan.
          </p>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Pill Switcher */}
          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl flex items-center border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTab("asesmen")}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                tab === "asesmen"
                  ? "bg-[#1e293b] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              Daftar & Penugasan
            </button>
            <button
              type="button"
              onClick={() => setTab("laporan")}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                tab === "laporan"
                  ? "bg-[#1e293b] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              Laporan & Ketuntasan
            </button>
          </div>

          {/* Print Icon Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-xs transition-all"
            title="Cetak Laporan"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tab === "asesmen" ? (
        <div className="space-y-6">
          {/* Show/Hide Guide Toggle Button if Guide is Hidden */}
          {!showGuide && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50 text-xs font-extrabold flex items-center gap-2 hover:bg-teal-100 transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Tampilkan Petunjuk Penggunaan</span>
              </button>
            </div>
          )}

          {/* Guide Banner Card */}
          {showGuide && (
            <div className="bg-[#e6f9f3] dark:bg-emerald-950/20 border border-[#b8f2dd] dark:border-emerald-900/50 rounded-[28px] p-6 space-y-4 shadow-2xs transition-all duration-300">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#059669] flex items-center justify-center text-white font-bold shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#064e3b] dark:text-emerald-300">
                      💡 Panduan Cepat Penilaian Kurikulum Merdeka
                    </h3>
                    <p className="text-xs text-[#047857] dark:text-emerald-400 font-medium mt-0.5">
                      Sangat mudah digunakan baik yang mahir maupun yang baru belajar teknologi!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="bg-white/80 dark:bg-slate-900/80 hover:bg-white text-[#047857] dark:text-emerald-300 font-extrabold text-xs px-4 py-2 rounded-xl border border-[#b8f2dd] dark:border-emerald-900/50 cursor-pointer transition-all shadow-2xs"
                >
                  Sembunyikan
                </button>
              </div>

              {/* 3 Step Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="bg-white/90 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-[#d1fae5] text-[#047857] font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      Pilih / Buat Tugas
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Pilih salah satu kartu penilaian di bawah dan klik <strong>&quot;Detail & Nilai&quot;</strong>, atau buat tugas baru menggunakan tombol hijau di sebelah kanan.
                  </p>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-[#d1fae5] text-[#047857] font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      Isi Nilai Siswa
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ketik nilai (0&ndash;100) siswa Anda. Agar praktis, Anda bisa mengeklik <strong>tombol angka instan</strong> (seperti 75 atau 90) tanpa perlu mengetik!
                  </p>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-[#d1fae5] text-[#047857] font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                      Klik Simpan
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Klik tombol <strong>&quot;Simpan&quot;</strong> di ujung kanan baris siswa. Sistem akan otomatis menentukan ketuntasan (KKTP) dan pengayaan/remedial siswa!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="neumo-card bg-background rounded-[24px] p-3 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari judul asesmen atau materi..."
                  className="pl-9 h-10"
                />
              </div>
              <Button type="button" variant="secondary" className="h-10 px-4">
                Cari
              </Button>
            </div>

            <Select
              value={kelasFilter}
              onValueChange={(v) => setKelasFilter(v ?? "all")}
              options={[
                { value: "all", label: "Semua Kelas" },
                ...(kelasList?.map((k) => ({ value: k.id, label: k.namaKelas })) ?? []),
              ]}
            >
              <SelectTrigger className="w-full sm:w-[170px] !h-10 !rounded-2xl text-xs font-bold cursor-pointer">
                <SelectValue placeholder="Semua Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasList?.map((k) => (
                  <SelectItem key={k.id} value={k.id} label={k.namaKelas}>{k.namaKelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={mapelFilter}
              onValueChange={(v) => setMapelFilter(v ?? "all")}
              options={[
                { value: "all", label: "Semua Mapel" },
                ...(mapelList?.map((m) => ({ value: m.id, label: m.namaMapel })) ?? []),
              ]}
            >
              <SelectTrigger className="w-full sm:w-[170px] !h-10 !rounded-2xl text-xs font-bold cursor-pointer">
                <SelectValue placeholder="Semua Mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {mapelList?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canManage && (
              <button
                type="button"
                onClick={() => { setEditItem(null); setFormOpen(true) }}
                className="w-full sm:w-auto shrink-0 bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/10 cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Buat Asesmen</span>
              </button>
            )}
          </div>

          {/* Cards List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-full rounded-[26px]" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[26px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/65 flex items-center justify-center mb-4 border border-border/20">
                <ClipboardCheck className="h-7 w-7 text-muted-foreground/75" />
              </div>
              <h3 className="text-lg font-bold mb-1.5 text-slate-700 dark:text-slate-300">Belum Ada Asesmen</h3>
              <p className="text-sm text-slate-400 max-w-sm">Buat asesmen baru untuk mulai menilai kompetensi siswa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((a: any) => {
                const cls = kelasMap.get(a.kelasId)
                const mapel = mapelMap.get(a.mataPelajaranId)
                const classLabel = cls ? `Kelas ${cls.namaKelas}` : "-"
                const mapelLabel = mapel ? mapel.namaMapel : "-"

                const entries = a.siswaEntries || []
                const totalSiswa = entries.length
                const dinilaiCount = entries.filter((e: any) => e.status === "sudah_dinilai").length
                const butuhPeriksaCount = entries.filter((e: any) => e.status === "sudah_mengumpulkan").length
                const belumKumpulCount = entries.filter((e: any) => e.status === "belum_dikerjakan").length
                const tuntasCount = entries.filter((e: any) => e.statusKetuntasan === "tuntas").length
                const remedialCount = entries.filter((e: any) => e.statusKetuntasan === "belum_tuntas").length
                const adaBerkasCount = entries.filter((e: any) => e.berkasUrl).length
                const persentaseDinilai = totalSiswa > 0 ? Math.round((dinilaiCount / totalSiswa) * 100) : 0
                const semuanyaDiperiksa = totalSiswa > 0 && butuhPeriksaCount === 0 && belumKumpulCount === 0

                const isSumatif = a.kategori === "sumatif"

                return (
                  <div
                    key={a.id}
                    className="neumo-card bg-background rounded-[26px] p-5 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-md",
                            isSumatif
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                              : "bg-[#d1fae5] text-[#047857] dark:bg-emerald-950/40 dark:text-emerald-400"
                          )}
                        >
                          {KATEGORI_LABEL[a.kategori] || "FORMATIF"}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {fmtDateTime(a.deadline || a.createdAt)}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                          {a.judul}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                          Mapel: <strong className="text-slate-700 dark:text-slate-300">{mapelLabel}</strong> | Kelas: <strong className="text-slate-700 dark:text-slate-300">{classLabel}</strong>
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 p-3.5 rounded-2xl space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span>🎯</span>
                          <span>Target KKTP: <strong className="text-teal-600 dark:text-teal-400">{a.kktp}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>🛠️</span>
                          <span>Teknik: <strong className="text-slate-800 dark:text-slate-200">{TEKNIK_LABEL[a.teknik] || "Tes Tertulis"}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>📦</span>
                          <span>Tipe Input: <strong className="text-slate-800 dark:text-slate-200">{TIPE_INPUT_LABEL[a.jenisPengumpulan] || "Unggah Berkas/Foto"}</strong></span>
                        </div>
                      </div>

                      {/* Status Ringkasan Penilaian */}
                      <div className="bg-muted/30 border border-border/40 p-3.5 rounded-2xl space-y-2">
                        {/* Status Dinilai Guru */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Status Dinilai Guru</span>
                          <span className="text-[10px] font-extrabold text-foreground">{dinilaiCount} / {totalSiswa} Murid ({persentaseDinilai}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${persentaseDinilai}%` }}
                          />
                        </div>

                        {/* Tuntas & Remedial */}
                        <div className="flex items-center gap-4 text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Tuntas: {tuntasCount} Murid
                          </span>
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            Remedial: {remedialCount} Murid
                          </span>
                        </div>

                        {/* Butuh Periksa & Belum Kumpul */}
                        {semuanyaDiperiksa ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider pt-1 border-t border-border/30">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Semua diperiksa
                          </div>
                        ) : (
                          <div className="space-y-1 pt-1 border-t border-border/30">
                            {butuhPeriksaCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Butuh Periksa:
                                </span>
                                <span className="text-[10px] font-extrabold text-foreground">{butuhPeriksaCount} Tugas</span>
                              </div>
                            )}
                            {belumKumpulCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Belum Kumpul:
                                </span>
                                <span className="text-[10px] font-extrabold text-foreground">{belumKumpulCount} Murid</span>
                              </div>
                            )}
                          </div>
                        )}

                        {adaBerkasCount > 0 && (
                          <div className="text-[9px] font-semibold text-muted-foreground">
                            {adaBerkasCount} berkas terlampir
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setGradingId(a.id)}
                          className="flex-1 bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs rounded-xl h-11 flex items-center justify-center cursor-pointer shadow-sm transition-all active:scale-95"
                        >
                          Nilai
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDetailId(a.id)}
                        className={cn(
                          "bg-[#1e293b] hover:bg-[#0f172a] text-white font-extrabold text-xs rounded-xl h-11 flex items-center justify-center cursor-pointer shadow-sm transition-all active:scale-95",
                          canManage ? "w-11" : "flex-1"
                        )}
                        title="Detail & Nilai"
                      >
                        {canManage ? <ClipboardCheck className="h-4 w-4" /> : "Detail & Nilai"}
                      </button>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-11 h-11 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer border border-border/50 transition-all shrink-0 active:scale-95">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => { setEditItem(a); setFormOpen(true) }} className="gap-2 text-xs font-semibold cursor-pointer">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(a.id)} className="gap-2 text-xs font-semibold text-rose-600 cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" /> Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Laporan & Ketuntasan (Persis Screenshot 1 & 2) */
        <div className="space-y-6">
          {/* Header Block & Class Selector Card */}
          <div className="neumo-card bg-background rounded-[28px] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                  Rekapitulasi Ketuntasan Klasikal Kurikulum Merdeka
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Analisis ketercapaian kriteria minimum per kelas berdasarkan seluruh instrumen ujian.
                </p>
              </div>

              {/* Class Dropdown Filter */}
              <Select
                value={rekapKelasId}
                onValueChange={(v) => setRekapKelasId(v ?? "")}
                options={kelasList?.map((k) => ({ value: k.id, label: k.namaKelas })) ?? []}
              >
                <SelectTrigger className="w-full sm:w-[220px] !h-12 !rounded-2xl text-xs font-extrabold cursor-pointer">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  {kelasList?.map((k) => (
                    <SelectItem key={k.id} value={k.id} label={k.namaKelas}>{k.namaKelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3 Summary Stat Cards Grid (Screenshot 1) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Jumlah Instrumen Asesmen */}
              <div className="bg-[#e8f8f2] dark:bg-emerald-950/30 border border-[#c6f0e0] dark:border-emerald-900/40 rounded-[22px] p-5 text-left space-y-1">
                <span className="text-[10px] font-black text-[#047857] uppercase tracking-wider block">
                  JUMLAH INSTRUMEN ASESMEN
                </span>
                <span className="text-4xl font-black text-slate-800 dark:text-slate-100 block tracking-tight">
                  {totalInstrumen}
                </span>
                <span className="text-xs text-slate-500 font-semibold block pt-1">
                  Dibuat di kelas {rekapKelasName}
                </span>
              </div>

              {/* Card 2: Nilai Rata-rata Kelas */}
              <div className="bg-[#e0f2fe] dark:bg-sky-950/30 border border-[#bae6fd] dark:border-sky-900/40 rounded-[22px] p-5 text-left space-y-1">
                <span className="text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                  NILAI RATA-RATA KELAS
                </span>
                <span className="text-4xl font-black text-slate-800 dark:text-slate-100 block tracking-tight">
                  {avgNilaiKelas} / 100
                </span>
                <span className="text-xs text-slate-500 font-semibold block pt-1">
                  Dari {totalGradedCount > 0 ? totalGradedCount : 1} rekap nilai terkumpul
                </span>
              </div>

              {/* Card 3: Persentase Ketuntasan Klasikal */}
              <div className="bg-[#fef3c7] dark:bg-amber-950/30 border border-[#fde68a] dark:border-amber-900/40 rounded-[22px] p-5 text-left space-y-1">
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  PERSENTASE KETUNTASAN KLASIKAL
                </span>
                <span className="text-4xl font-black text-slate-800 dark:text-slate-100 block tracking-tight">
                  {persentaseKetuntasan}%
                </span>
                <span className="text-xs text-slate-500 font-semibold block pt-1">
                  Siswa di atas ambang KKTP
                </span>
              </div>
            </div>

            {/* Table: Daftar Ketuntasan Siswa Kelas {namaKelas} */}
            <div className="pt-2 space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                Daftar Ketuntasan Siswa Kelas {rekapKelasName}
              </h4>

              {isLoadingRekap ? (
                <Skeleton className="h-40 w-full rounded-2xl" />
              ) : studentKetuntasanList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  Belum ada siswa terdaftar di kelas ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-50/70 dark:bg-slate-900/40">
                      <TableRow>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">SISWA</TableHead>
                        <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">TOTAL PENUGASAN</TableHead>
                        <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">LULUS KKTP (TUNTAS)</TableHead>
                        <TableHead className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">TINDAK LANJUT REMEDIAL</TableHead>
                        <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-wider py-3 pr-6">RATA-RATA NILAI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentKetuntasanList.map((row) => (
                        <TableRow key={row.siswa.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                          <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            {row.siswa.namaLengkap}
                          </TableCell>
                          <TableCell className="text-center text-xs font-semibold text-slate-500">
                            {row.totalPenugasanCompleted} / {totalInstrumen}
                          </TableCell>
                          <TableCell className="text-center text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {row.tuntasCount}
                          </TableCell>
                          <TableCell className="text-center text-xs font-black text-rose-600 dark:text-rose-400">
                            {row.remedialCount}
                          </TableCell>
                          <TableCell className="text-right text-xs font-extrabold text-slate-700 dark:text-slate-300 pr-6">
                            {row.studentAvgNilai !== null ? row.studentAvgNilai.toFixed(1) : "&mdash;"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Remedial & Tanggungan Siswa Section (Screenshot 2) */}
          <div className="border border-rose-100 dark:border-rose-950/40 bg-white dark:bg-slate-900/30 rounded-[28px] p-6 space-y-5 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Daftar Tanggungan & Remedial Siswa (Kurang dari Target KKTP)
                </h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Siswa yang terdeteksi Belum Tuntas (nilai di bawah KKTP / belum mengumpulkan tugas wajib).
                </p>
              </div>
            </div>

            {/* Grid of Remedial Cards */}
            {remedialItems.length === 0 ? (
              <div className="py-8 text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                🎉 Luar Biasa! Semua siswa di kelas ini telah TUNTAS memenuhi KKTP.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {remedialItems.map((item, idx) => (
                  <div
                    key={`${item.siswa.id}-${item.asesmen.id}-${idx}`}
                    className="bg-[#fff5f5] dark:bg-rose-950/20 border border-[#ffe4e4] dark:border-rose-900/40 rounded-2xl p-4 flex items-start gap-3 text-left shadow-2xs"
                  >
                    <span className="bg-rose-600 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-lg shrink-0">
                      Wajib
                    </span>

                    <div className="space-y-1 min-w-0 flex-1">
                      <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {item.siswa.namaLengkap}
                      </h5>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold truncate">
                        Mapel: {item.mapelName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold truncate">
                        Asesmen: &quot;{item.asesmen.judul}&quot;
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold pt-0.5">
                        Batas KKM Target KKTP: {item.asesmen.kktp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form & Detail Dialogs */}
      <AsesmenFormDialog
        open={formOpen}
        item={editItem}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        onSaved={() => { setFormOpen(false); setEditItem(null) }}
      />

      <AsesmenDetailDialog
        open={!!detailId}
        asesmenId={detailId}
        onClose={() => setDetailId(null)}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Asesmen?</AlertDialogTitle>
            <AlertDialogDescription>Asesmen yang dihapus tidak dapat dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer bg-rose-600 hover:bg-rose-700 text-white border-none">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
