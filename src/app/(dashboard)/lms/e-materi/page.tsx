"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Plus,
  Search,
  BookOpen,
  FileText,
  Video,
  Link2,
  Eye,
  Pencil,
  Trash2,
  Folder,
  ChevronRight,
  User,
  Sparkles,
  Layers,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from "@/lib/trpc/client"
import { useOptimisticRemove } from "@/hooks/useOptimisticRemove"
import { toast } from "sonner"
import EMateriFormDialog, { type EMateriFormData, formatTingkatLabel } from "@/components/lms/EMateriFormDialog"

export default function EMateriPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role ?? "siswa"

  const [activeTab, setActiveTab] = useState<"mapel_cards" | "semua_materi">("mapel_cards")

  // Filter States
  const [searchMapel, setSearchMapel] = useState("")
  const [tingkatFilter, setTingkatFilter] = useState("semua")
  const [searchMateri, setSearchMateri] = useState("")
  const [mapelFilter, setMapelFilter] = useState("semua")
  const [kelasFilter, setKelasFilter] = useState("semua")
  const [tipeFilter, setTipeFilter] = useState("semua")

  // Modal States
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EMateriFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<any | null>(null)

  // tRPC Queries
  const { data: mapelList, isLoading: isLoadingMapel } = api.mapel.getAll.useQuery({
    search: searchMapel || undefined,
    limit: 100,
  })

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 })

  const { data: materiList, isLoading: isLoadingMateri } = api.eMateri.getAll.useQuery({
    search: searchMateri || undefined,
    mataPelajaranId: mapelFilter !== "semua" ? mapelFilter : undefined,
    kelasId: kelasFilter !== "semua" ? kelasFilter : undefined,
    tipeMateri: tipeFilter !== "semua" ? tipeFilter : undefined,
  })

  const utils = api.useUtils()

  const uniqueTingkat = useMemo(() => {
    if (!kelasList) return []
    const setT = new Set<string>()
    kelasList.forEach((k) => {
      if (k.tingkat) setT.add(k.tingkat)
    })
    return Array.from(setT).sort()
  }, [kelasList])

  const uniqueTingkatOptions = useMemo(() => {
    return [
      { value: "semua", label: "Semua Tingkat" },
      ...uniqueTingkat.map((t) => ({
        value: t,
        label: formatTingkatLabel(t),
      })),
    ]
  }, [uniqueTingkat])

  const mapelFilterOptions = useMemo(() => {
    return [
      { value: "semua", label: "Semua Mapel" },
      ...(mapelList ?? []).map((m) => ({
        value: m.id,
        label: m.namaMapel,
      })),
    ]
  }, [mapelList])

  const kelasFilterOptions = useMemo(() => {
    return [
      { value: "semua", label: "Semua Kelas" },
      ...(kelasList ?? []).map((k) => ({
        value: k.id,
        label: `${k.namaKelas}${k.tingkat ? ` (${formatTingkatLabel(k.tingkat)})` : ""}`,
      })),
    ]
  }, [kelasList])

  const createMutation = api.eMateri.create.useMutation({
    onSuccess: () => {
      utils.eMateri.getAll.invalidate()
    },
  })

  const updateMutation = api.eMateri.update.useMutation({
    onSuccess: () => {
      utils.eMateri.getAll.invalidate()
    },
  })

  const removeMutation = api.eMateri.remove.useMutation({
    ...useOptimisticRemove({ queryKey: [["eMateri", "getAll"]] }),
  })

  const incrementViewsMutation = api.eMateri.incrementViews.useMutation()

  const handleSubmitForm = async (formData: EMateriFormData) => {
    if (formData.id) {
      await updateMutation.mutateAsync({
        id: formData.id,
        data: formData,
      })
    } else {
      await createMutation.mutateAsync(formData as any)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const handleOpenPreview = (item: any) => {
    setPreviewItem(item)
    incrementViewsMutation.mutate({ id: item.id })
  }

  const handleOpenAddForMapel = (mapelId: string) => {
    setEditingItem({
      mataPelajaranId: mapelId,
      judul: "",
      tipeMateri: "dokumen",
      status: "terbit",
    })
    setFormOpen(true)
  }

  // Calculate stats
  const totalMateri = materiList?.length ?? 0
  const countDokumen = (materiList ?? []).filter((m) => m.tipeMateri === "dokumen").length
  const countVideo = (materiList ?? []).filter((m) => m.tipeMateri === "video").length
  const countTerbit = (materiList ?? []).filter((m) => m.status === "terbit").length

  // Map materi count per mapelId
  const countPerMapel: Record<string, number> = {}
  ;(materiList ?? []).forEach((m) => {
    if (m.mataPelajaranId) {
      countPerMapel[m.mataPelajaranId] = (countPerMapel[m.mataPelajaranId] || 0) + 1
    }
  })

  const getTipeBadge = (tipe: string) => {
    switch (tipe) {
      case "video":
        return (
          <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 flex items-center gap-1">
            <Video className="w-3 h-3" /> Video
          </span>
        )
      case "link_eksternal":
        return (
          <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/60 flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Link Web
          </span>
        )
      case "teks_artikel":
        return (
          <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Catatan
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Dokumen
          </span>
        )
    }
  }

  const canManage = ["super_admin", "admin_sekolah", "tu", "guru"].includes(userRole)

  return (
    <div className="space-y-6">
      {/* Header Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">e-Materi Pembelajaran</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pilih mata pelajaran untuk menambahkan e-materi digital atau kelola bahan ajar
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Tab Switcher */}
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab("mapel_cards")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "mapel_cards"
                  ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Card Mapel</span>
            </button>
            <button
              onClick={() => setActiveTab("semua_materi")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "semua_materi"
                  ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Semua Materi ({totalMateri})</span>
            </button>
          </div>

          {canManage && (
            <Button
              onClick={() => {
                setEditingItem(null)
                setFormOpen(true)
              }}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-teal-500/10 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah e-Materi
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neumo-card bg-background rounded-[22px] p-4 bg-gradient-to-br from-blue-500/10 to-transparent flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total e-Materi</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalMateri}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="neumo-card bg-background rounded-[22px] p-4 bg-gradient-to-br from-indigo-500/10 to-transparent flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dokumen PDF/File</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{countDokumen}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="neumo-card bg-background rounded-[22px] p-4 bg-gradient-to-br from-rose-500/10 to-transparent flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Video Learning</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{countVideo}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
        </div>

        <div className="neumo-card bg-background rounded-[22px] p-4 bg-gradient-to-br from-emerald-500/10 to-transparent flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Materi Terbit</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{countTerbit}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── TAB 1: KARTU MATA PELAJARAN (DESAIN PER MAPEL SEPERTI SCREENSHOT) ── */}
      {activeTab === "mapel_cards" && (
        <div className="space-y-5">
          {/* Filter Bar for Mapel Cards */}
          <div className="neumo-card bg-background rounded-[26px] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Mapel */}
              <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau kode mata pelajaran..."
                    value={searchMapel}
                    onChange={(e) => setSearchMapel(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <Button type="button" variant="secondary" className="h-10 px-4">
                  Cari
                </Button>
              </div>

              {/* Tingkat Filter Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full sm:w-auto">
                <span className="shrink-0 font-medium">Tingkat:</span>
                <Select
                  value={tingkatFilter}
                  onValueChange={(v) => setTingkatFilter(v ?? "semua")}
                  options={uniqueTingkatOptions}
                >
                  <SelectTrigger className="w-full sm:w-48 !h-9 text-xs font-bold !rounded-2xl">
                    <SelectValue placeholder="Semua Tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua" label="Semua Tingkat">Semua Tingkat</SelectItem>
                    {uniqueTingkat.map((t) => (
                      <SelectItem key={t} value={t} label={formatTingkatLabel(t)}>
                        {formatTingkatLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Mapel Cards Grid */}
          {isLoadingMapel ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="neumo-card bg-background rounded-[26px] p-5 space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : !mapelList || mapelList.length === 0 ? (
            <div className="neumo-card bg-background rounded-[26px] p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <h4 className="text-base font-extrabold text-slate-700 dark:text-slate-300">Mata Pelajaran Tidak Ditemukan</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Silakan periksa kata kunci pencarian atau buat mata pelajaran baru di menu Akademik.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {mapelList.map((m) => {
                // Get teacher name from pengampu relations
                const pengampuList = m.pengampu ?? []
                const namaGuru = pengampuList.length > 0 && pengampuList[0]?.guru
                  ? `${pengampuList[0].guru.namaLengkap}`
                  : "Belum Ditunjuk"

                const materiCount = countPerMapel[m.id] || 0

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (materiCount > 0) {
                        setActiveTab("semua_materi")
                        setMapelFilter(m.id)
                      } else if (!canManage) {
                        toast.info("E-Materi untuk mata pelajaran ini belum tersedia")
                      } else {
                        handleOpenAddForMapel(m.id)
                      }
                    }}
                    className="neumo-card bg-background rounded-[28px] p-6 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 cursor-pointer group relative overflow-hidden"
                  >
                    {/* Top Soft Gradient Glow Header */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                    <div className="space-y-4 relative z-10">
                      {/* Row 1: Tingkat Badge (Left) & Kode Mapel (Right) */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/50">
                          {tingkatFilter !== "semua" ? tingkatFilter.toUpperCase() : "SEMUA TINGKAT"}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          {m.kodeMapel || "MAPEL"}
                        </span>
                      </div>

                      {/* Row 2: Nama Mapel Title */}
                      <div>
                        <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-lg leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {m.namaMapel}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{namaGuru}</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Bottom Status Bar matching screenshot */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-350">
                        <Folder className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        <span>
                          {materiCount === 0 ? "Belum Ada Materi" : `${materiCount} File Materi`}
                        </span>
                      </div>

                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-teal-500 group-hover:text-white text-slate-400 flex items-center justify-center transition-all shadow-sm">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DAFTAR SEMUA E-MATERI (LIST PENUH MATERI TER-UPLOAD) ── */}
      {activeTab === "semua_materi" && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="neumo-card bg-background rounded-[26px] p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Input */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari judul materi, bab..."
                    value={searchMateri}
                    onChange={(e) => setSearchMateri(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <Button type="button" variant="secondary" className="h-10 px-4">
                  Cari
                </Button>
              </div>

              {/* Mapel Filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="shrink-0 font-medium">Mapel:</span>
                <Select
                  value={mapelFilter}
                  onValueChange={(v) => setMapelFilter(v ?? "semua")}
                  options={mapelFilterOptions}
                >
                  <SelectTrigger className="w-full !h-9 text-xs font-bold !rounded-2xl">
                    <SelectValue placeholder="Semua Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua" label="Semua Mapel">Semua Mapel</SelectItem>
                    {(mapelList ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id} label={m.namaMapel}>
                        {m.namaMapel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kelas Filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="shrink-0 font-medium">Kelas:</span>
                <Select
                  value={kelasFilter}
                  onValueChange={(v) => setKelasFilter(v ?? "semua")}
                  options={kelasFilterOptions}
                >
                  <SelectTrigger className="w-full !h-9 text-xs font-bold !rounded-2xl">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua" label="Semua Kelas">Semua Kelas</SelectItem>
                    {(kelasList ?? []).map((k) => {
                      const labelStr = `${k.namaKelas}${k.tingkat ? ` (${formatTingkatLabel(k.tingkat)})` : ""}`
                      return (
                        <SelectItem key={k.id} value={k.id} label={labelStr}>
                          {labelStr}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Format / Tipe Filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="shrink-0 font-medium">Format:</span>
                <Select value={tipeFilter} onValueChange={(v) => setTipeFilter(v ?? "semua")}>
                  <SelectTrigger className="w-full !h-9 text-xs font-bold !rounded-2xl">
                    <SelectValue placeholder="Semua Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Format</SelectItem>
                    <SelectItem value="dokumen">Dokumen PDF/File</SelectItem>
                    <SelectItem value="video">Video Learning</SelectItem>
                    <SelectItem value="link_eksternal">Link Web</SelectItem>
                    <SelectItem value="teks_artikel">Catatan Teks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content Cards Grid */}
          {isLoadingMateri ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="neumo-card bg-background rounded-[24px] p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              ))}
            </div>
          ) : !materiList || materiList.length === 0 ? (
            <div className="neumo-card bg-background rounded-[26px] p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <h4 className="text-base font-extrabold text-slate-700 dark:text-slate-300">Belum Ada Materi Pembelajaran</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Silakan klik tombol &quot;Tambah e-Materi&quot; untuk menambahkan dokumen, video, atau catatan pembelajaran baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {materiList.map((m) => (
                <div
                  key={m.id}
                  className="neumo-card bg-background rounded-[26px] p-5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 relative group"
                >
                  <div className="space-y-3">
                    {/* Card Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getTipeBadge(m.tipeMateri)}
                        {m.kelas?.namaKelas && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50">
                            {m.kelas.namaKelas}
                          </span>
                        )}
                      </div>

                      <span
                        className={cn(
                          "px-2 py-0.5 text-[8px] font-black uppercase rounded-full border",
                          m.status === "terbit"
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        )}
                      >
                        {m.status === "terbit" ? "Terbit" : "Draf"}
                      </span>
                    </div>

                    {/* Title & Bab */}
                    <div>
                      {m.bab && (
                        <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest block mb-0.5">
                          {m.bab}
                        </span>
                      )}
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base leading-snug group-hover:text-teal-600 transition-colors">
                        {m.judul}
                      </h4>
                    </div>

                    {/* Deskripsi Singkat */}
                    {m.deskripsi && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {m.deskripsi}
                      </p>
                    )}

                    {/* Meta Info: Mapel & Pembuat */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {m.mataPelajaran?.namaMapel ?? "Mata Pelajaran"}
                      </span>
                      <span className="truncate max-w-[120px] text-[10px] font-medium text-slate-400">
                        Oleh: {m.pembuatNama || "Pengajar"}
                      </span>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{m.viewsCount}x Dilihat</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenPreview(m)}
                        className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-extrabold rounded-xl text-xs tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Akses</span>
                      </button>

                      {canManage && (
                        <>
                          <button
                            onClick={() => {
                              setEditingItem(m as any)
                              setFormOpen(true)
                            }}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 hover:text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Materi"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteId(m.id)}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Hapus Materi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Dialog Modal */}
      <EMateriFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitForm}
        initial={editingItem}
      />

      {/* Preview Dialog Modal */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={(val) => !val && setPreviewItem(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 space-y-4">
            <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                {getTipeBadge(previewItem.tipeMateri)}
                {previewItem.mataPelajaran?.namaMapel && (
                  <Badge variant="outline" className="text-xs">
                    {previewItem.mataPelajaran.namaMapel}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                {previewItem.judul}
              </DialogTitle>
              {previewItem.bab && (
                <p className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                  {previewItem.bab}
                </p>
              )}
            </DialogHeader>

            {previewItem.deskripsi && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {previewItem.deskripsi}
              </div>
            )}

            {/* Content Preview Player / View */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              {previewItem.tipeMateri === "video" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Video Pembelajaran</p>
                  {previewItem.videoUrl ? (
                    <div className="space-y-2">
                      <a
                        href={previewItem.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-teal-600 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" /> Buka Video di Tab Baru
                      </a>
                      <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs font-mono text-center truncate">
                        {previewItem.videoUrl}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Belum ada URL video yang dilampirkan.</p>
                  )}
                </div>
              )}

              {previewItem.tipeMateri === "dokumen" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dokumen Pembelajaran</p>
                  {previewItem.fileUrl ? (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            {previewItem.fileName || "Dokumen Materi PDF / Word"}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate max-w-sm">{previewItem.fileUrl}</p>
                        </div>
                      </div>
                      <a
                        href={previewItem.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Buka
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Belum ada URL file yang dilampirkan.</p>
                  )}
                </div>
              )}

              {previewItem.tipeMateri === "link_eksternal" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Link Web Eksternal</p>
                  {previewItem.linkUrl ? (
                    <a
                      href={previewItem.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs font-bold text-sky-600 hover:underline p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/50"
                    >
                      <Link2 className="w-4 h-4" /> {previewItem.linkUrl}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400">Belum ada tautan yang dilampirkan.</p>
                  )}
                </div>
              )}

              {previewItem.tipeMateri === "teks_artikel" && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Isi Catatan Pembelajaran</p>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                    {previewItem.kontenTeks || "Tidak ada catatan tambahan."}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Alert Dialog Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold">Hapus Materi Pembelajaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus materi pembelajaran ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold uppercase">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
