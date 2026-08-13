"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { Plus, Pencil, Trash2, Loader2, Search, MoreHorizontal, GripVertical, BookOpen, Layers, Clock, Wand2, Printer, FileSpreadsheet, Users, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/client"
import { useOptimisticRemove } from "@/hooks/useOptimisticRemove"
import MapelFormDialog, { type MapelFormData } from "@/components/mapel/MapelFormDialog"
import PengampuDialog from "@/components/mapel/PengampuDialog"
const GenerateKurikulumDialog = dynamic(() => import("@/components/mapel/GenerateKurikulumDialog"), { ssr: false })
const SubjectExportModal = dynamic(() => import("@/components/mapel/SubjectExportModal").then((mod) => mod.SubjectExportModal), { ssr: false })

interface PengampuItem {
  id: string
  guruId: string
  kelasId: string
  jumlahJam: number
  guru: { id: string; namaLengkap: string } | null
  kelas: { id: string; namaKelas: string; tingkat: string | null } | null
}

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
  kelompok: string | null
  jumlahJam: number
  aktif: boolean
  urutan: number | null
  pengampu?: PengampuItem[]
}

const KELOMPOK_LABEL: Record<string, string> = {
  A: "Mata Pelajaran Wajib",
  B: "Mata Pelajaran Pilihan",
  C: "Mata Pelajaran Peminatan",
  muatan_lokal: "Muatan Lokal",
}

export default function MapelPage() {
  const [search, setSearch] = useState("")
  const [tingkatFilter, setTingkatFilter] = useState<string>("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<MapelFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [pengampuOpen, setPengampuOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [pengampuMapel, setPengampuMapel] = useState<{ id: string; namaMapel: string; jumlahJam: number } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [localRecords, setLocalRecords] = useState<MapelRecord[]>([])
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [detailSubject, setDetailSubject] = useState<any>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 })
  const { data: sekolah } = api.lembaga.getSekolah.useQuery()

  // Dynamic tingkat options from active classes
  const rawTingkatList = Array.from(
    new Set(
      (kelasList ?? [])
        .map((k) => k.tingkat)
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const selectOptions = [
    { value: "semua", label: "Semua Tingkat" },
    ...rawTingkatList.map((t) => ({ value: t, label: t.toLowerCase().startsWith("kelas") ? t : `Tingkat ${t}` })),
  ]

  // Close active actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const { data: mapelList, isLoading } = api.mapel.getAll.useQuery({
    tingkat: tingkatFilter || undefined,
  })
  const utils = api.useUtils()

  useEffect(() => {
    setLocalRecords((mapelList ?? []) as MapelRecord[])
  }, [mapelList])

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords
    const query = search.toLowerCase()
    return localRecords.filter(r => 
      r.namaMapel.toLowerCase().includes(query) || 
      (r.kodeMapel && r.kodeMapel.toLowerCase().includes(query)) ||
      (r.kelompok && r.kelompok.toLowerCase().includes(query))
    )
  }, [localRecords, search])

  const subjectToDelete = useMemo(() => {
    if (!deleteId) return null
    return localRecords.find(r => r.id === deleteId)
  }, [deleteId, localRecords])

  const createMutation = api.mapel.create.useMutation({
    onSuccess: () => {
      utils.mapel.getAll.invalidate()
    },
  })

  const updateMutation = api.mapel.update.useMutation({
    onSuccess: () => {
      utils.mapel.getAll.invalidate()
    },
  })

  const removeMutation = api.mapel.remove.useMutation({
    ...useOptimisticRemove({ queryKey: [["mapel", "getAll"]] }),
  })

  const reorderMutation = api.mapel.reorder.useMutation({
    onSuccess: () => {
      utils.mapel.getAll.invalidate()
    },
  })

  const savePengampuMutation = api.pengampu.save.useMutation({
    onSuccess: () => {
      utils.pengampu.invalidate()
    },
  })
  const { data: guruList } = api.guru.getLookup.useQuery({ limit: 1 })

  const handleSubmit = async (data: MapelFormData) => {
    let mapelId = data.id
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          namaMapel: data.namaMapel,
          kodeMapel: data.kodeMapel || null,
          kelompok: (data.kelompok as "A" | "B" | "C" | "muatan_lokal") || null,
          jumlahJam: data.jumlahJam,
          aktif: data.aktif,
        },
      })
    } else {
      const res = await createMutation.mutateAsync({
        namaMapel: data.namaMapel,
        kodeMapel: data.kodeMapel || null,
        kelompok: (data.kelompok as "A" | "B" | "C" | "muatan_lokal") || null,
        jumlahJam: data.jumlahJam,
        aktif: data.aktif,
        sekolahId,
      })
      mapelId = res?.id
    }

    if (mapelId && data.selectedKelasIds) {
      try {
        const existingData = await utils.pengampu.getByMapel.fetch({ mataPelajaranId: mapelId })
        const existingAssignments = existingData?.assignments || []
        const fallbackGuruId = existingAssignments[0]?.guruId || (guruList && guruList[0]?.id) || ""

        if (fallbackGuruId && data.selectedKelasIds.length > 0) {
          const classToGuruMap = new Map<string, string>()
          for (const a of existingAssignments) {
            classToGuruMap.set(a.kelasId, a.guruId)
          }

          const guruToClassesMap = new Map<string, string[]>()
          for (const kId of data.selectedKelasIds) {
            const gId = classToGuruMap.get(kId) || fallbackGuruId
            if (!guruToClassesMap.has(gId)) guruToClassesMap.set(gId, [])
            guruToClassesMap.get(gId)!.push(kId)
          }

          const assignments = Array.from(guruToClassesMap.entries()).map(([gId, kIds]) => ({
            guruId: gId,
            kelasIds: kIds,
            jumlahJam: data.jumlahJam ?? 4,
          }))

          await savePengampuMutation.mutateAsync({
            mataPelajaranId: mapelId,
            assignments,
          })
        }
      } catch (err) {
        console.error("Error saving class assignments for mapel:", err)
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
    setDeleteConfirmText("")
  }

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const updated = [...localRecords]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(index, 0, moved)
    setDragIndex(index)
    setLocalRecords(updated)
  }, [dragIndex, localRecords])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    const items = localRecords.map((r, i) => ({ id: r.id, urutan: i + 1 }))
    reorderMutation.mutate({ items })
  }, [localRecords, reorderMutation])

  const { data: session } = useSession()
  const sekolahId = session?.user?.sekolahId ?? ""

  // Calculate Mapel Stats — memoized
  const totalMapel = useMemo(() => mapelList?.length ?? 0, [mapelList])
  const countWajib = useMemo(() => (mapelList ?? []).filter((m) => m.kelompok === "A").length, [mapelList])
  const countPilihan = useMemo(() => (mapelList ?? []).filter((m) => m.kelompok === "B" || m.kelompok === "C").length, [mapelList])
  const countMulok = useMemo(() => (mapelList ?? []).filter((m) => m.kelompok === "muatan_lokal").length, [mapelList])

  const totalBebanJam = useMemo(() => (mapelList ?? []).reduce((acc, m: any) => {
    if (!m.pengampu) return acc
    return acc + m.pengampu.reduce((sum: number, p: any) => sum + (p.jumlahJam || 0), 0)
  }, 0), [mapelList])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mata Pelajaran</h2>
        <p className="text-muted-foreground">Kelola mata pelajaran dan kurikulum</p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Total Mata Pelajaran */}
        <div className="neumo-card bg-background rounded-[22px] p-5 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Mata Pelajaran</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalMapel} <span className="text-xs font-semibold text-slate-500">Mapel</span></h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 2: Kategori Kurikulum */}
        <div className="neumo-card bg-background rounded-[22px] p-5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Kategori Kurikulum</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs font-bold flex-wrap">
            <span className="px-2.5 py-0.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50">
              Wajib: <strong className="font-extrabold">{countWajib}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-xl bg-purple-100/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/50">
              Pilihan: <strong className="font-extrabold">{countPilihan}</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50">
              Mulok: <strong className="font-extrabold">{countMulok}</strong>
            </span>
          </div>
        </div>

        {/* Stat 3: Total Beban Mengajar */}
        <div className="neumo-card bg-background rounded-[22px] p-5 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Beban Mengajar</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalBebanJam} <span className="text-xs font-semibold text-slate-500">JP /Minggu</span></h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="neumo-card bg-background rounded-[26px] p-5 md:p-6 mb-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
            <div className="flex items-center gap-2 w-full sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Cari mata pelajaran..."
                  className="pl-9 h-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" className="h-10 px-4 shrink-0">
                Cari
              </Button>
            </div>

            <Select
              options={selectOptions}
              value={tingkatFilter || "semua"}
              onValueChange={(v) => setTingkatFilter(!v || v === "semua" ? "" : v)}
            >
              <SelectTrigger className="w-full sm:w-44 !h-10 text-xs font-bold !rounded-2xl">
                <SelectValue placeholder="Semua Tingkat" />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-2 lg:w-auto lg:shrink-0">
            <button
              type="button"
              onClick={() => setGenerateOpen(true)}
              title="Generate struktur mata pelajaran otomatis sesuai standar Permendikdasmen 13/2025 / KMA 1503"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/5 transition-all cursor-pointer transform active:scale-95 w-full"
            >
              <Wand2 className="h-4 w-4" />
              <span>Generate Kurikulum</span>
            </button>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer transform active:scale-95 w-full h-10"
              title="Cetak & Export data mata pelajaran"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak dan Export</span>
            </button>
            <button
              className="col-span-2 lg:col-span-1 w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-teal-500/5 transition-all flex items-center justify-center cursor-pointer transform active:scale-95 shrink-0"
              title="Tambahkan mata pelajaran baru secara manual"
              onClick={() => {
                setEditData(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Tambah Mapel</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Card List (Visible on mobile, hidden on desktop) */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="neumo-card bg-background rounded-[22px] p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))
          ) : filteredRecords.length === 0 ? (
            <div className="neumo-card bg-background rounded-[22px] p-8 text-center text-slate-400 font-semibold">
              {search ? "Tidak ditemukan" : "Belum ada mata pelajaran"}
            </div>
          ) : (
            filteredRecords.map((r, index) => {
              const isMenuOpen = activeMenuId === r.id
              return (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "neumo-card bg-background rounded-[22px] p-4 space-y-3 relative text-left transition-all",
                    dragIndex === index ? "opacity-50 border-dashed border-teal-500" : "cursor-grab active:cursor-grabbing"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Tombol Drag & Drop di Pojok Kiri Atas Card */}
                      <button
                        type="button"
                        className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-grab active:cursor-grabbing shrink-0 border border-slate-200/60 dark:border-slate-700/60"
                        title="Tarik/drag untuk mengubah urutan"
                      >
                        <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                      </button>
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">KODE: {r.kodeMapel ?? "—"}</span>
                        <h4 className="font-bold text-slate-800 dark:text-slate-250 text-xs sm:text-sm leading-tight mt-0.5 truncate">{r.namaMapel}</h4>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 text-[8px] font-black uppercase rounded-full border shrink-0",
                        r.aktif
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30"
                          : "bg-slate-50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-450 border-slate-200/50 dark:border-slate-800/30"
                      )}
                    >
                      {r.aktif ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </div>

                  {/* Guru Pengampu Section */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Guru Pengampu</span>
                    {(!r.pengampu || r.pengampu.length === 0) ? (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 italic">Belum Ditunjuk</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {(() => {
                          const guruMap = new Map<string, { guruNama: string; kelasNama: string[]; jumlahJam: number }>()
                          for (const p of r.pengampu!) {
                            const gName = p.guru?.namaLengkap ?? "—"
                            if (!guruMap.has(p.guruId)) {
                              guruMap.set(p.guruId, { guruNama: gName, kelasNama: [], jumlahJam: p.jumlahJam })
                            }
                            guruMap.get(p.guruId)!.kelasNama.push(p.kelas?.namaKelas ?? "—")
                          }
                          return Array.from(guruMap.entries()).map(([gId, info]) => (
                            <div key={gId} className="flex items-start space-x-2 bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl p-2">
                              <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[9px] flex-shrink-0 mt-0.5">
                                {info.guruNama.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block leading-tight truncate">{info.guruNama}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {info.kelasNama.map((kn, i) => (
                                    <span key={i} className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-800/30">
                                      {kn}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Kelompok</span>
                      <span className="inline-block px-2 py-0.5 border border-slate-100 dark:border-slate-800 rounded-md text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 mt-1 tracking-wide">
                        {KELOMPOK_LABEL[r.kelompok ?? ""] ?? r.kelompok ?? "—"}
                      </span>
                    </div>

                    <div className="flex space-x-1.5 items-center justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDetailSubject(r)}
                        className="p-1.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-650 dark:hover:bg-teal-600 hover:text-white text-teal-650 dark:text-teal-400 rounded-lg transition-all cursor-pointer border border-transparent"
                        title="Lihat Detail Mapel"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setPengampuMapel({ id: r.id, namaMapel: r.namaMapel, jumlahJam: r.jumlahJam ?? 0 })
                          setPengampuOpen(true)
                        }}
                        className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-650 dark:hover:bg-indigo-600 hover:text-white text-indigo-650 dark:text-indigo-400 rounded-lg transition-all cursor-pointer border border-transparent"
                        title="Plotting Pengajar"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditData({
                            id: r.id,
                            namaMapel: r.namaMapel,
                            kodeMapel: r.kodeMapel ?? "",
                            kelompok: r.kelompok ?? "",
                            aktif: r.aktif,
                          })
                          setFormOpen(true)
                        }}
                        className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-600 dark:hover:text-teal-400 text-slate-500 rounded-lg transition-all cursor-pointer border border-transparent hover:border-teal-100"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-455 text-slate-450 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop View: Table (Visible on desktop, hidden on mobile) */}
        <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-150 dark:border-slate-800">
              <TableRow>
                <TableHead className="w-10 py-3" />
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Kode Mapel</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Nama Mata Pelajaran</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Kelompok</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3 text-center">JP / Minggu</TableHead>
                <TableHead className="text-center text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Guru Pengampu</TableHead>
                <TableHead className="text-center w-24 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold">
                    Tidak ada data mata pelajaran ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r, index) => {
                  return (
                    <TableRow
                      key={r.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60",
                        dragIndex === index ? "opacity-50" : "cursor-grab active:cursor-grabbing"
                      )}
                    >
                      <TableCell className="w-10 text-slate-400 dark:text-slate-500 text-center">
                        <button
                          type="button"
                          className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-grab active:cursor-grabbing mx-auto border border-slate-200/60 dark:border-slate-700/60 transition-all"
                          title="Tarik/drag untuk mengubah urutan"
                        >
                          <GripVertical className="h-4 w-4 shrink-0 text-slate-500" />
                        </button>
                      </TableCell>
                      <TableCell className="font-bold text-xs tracking-wider text-slate-700 dark:text-slate-350 font-mono">
                        {r.kodeMapel ?? "—"}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                        {r.namaMapel}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 border border-slate-150 dark:border-slate-800 rounded-lg text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 tracking-wide">
                          {KELOMPOK_LABEL[r.kelompok ?? ""] ?? r.kelompok ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-extrabold text-xs text-slate-700 dark:text-slate-300">
                        {r.jumlahJam ?? 2} JP
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "px-3 py-1 text-[9px] font-black uppercase rounded-full border whitespace-nowrap",
                            r.aktif
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                              : "bg-slate-50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-450 border-slate-200 dark:border-slate-800/30"
                          )}
                        >
                          {r.aktif ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(!r.pengampu || r.pengampu.length === 0) ? (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 italic">Belum Ditunjuk</span>
                        ) : (
                          <div className="flex flex-col gap-1.5 max-w-[280px]">
                            {(() => {
                              const guruMap = new Map<string, { guruNama: string; kelasNama: string[] }>()
                              for (const p of r.pengampu!) {
                                const gName = p.guru?.namaLengkap ?? "—"
                                if (!guruMap.has(p.guruId)) {
                                  guruMap.set(p.guruId, { guruNama: gName, kelasNama: [] })
                                }
                                guruMap.get(p.guruId)!.kelasNama.push(p.kelas?.namaKelas ?? "—")
                              }
                              return Array.from(guruMap.entries()).map(([gId, info]) => (
                                <div key={gId} className="flex items-center space-x-2 text-xs bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-lg p-1.5">
                                  <span className="font-extrabold text-slate-800 dark:text-slate-200 leading-none whitespace-nowrap">{info.guruNama}</span>
                                  <div className="flex flex-wrap gap-1">
                                    {info.kelasNama.map((kn, i) => (
                                      <span key={i} className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-100/40 dark:border-indigo-800/30">
                                        {kn}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))
                            })()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => setDetailSubject(r)}
                            className="p-1.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-650 dark:hover:bg-teal-600 hover:text-white text-teal-650 dark:text-teal-400 rounded-lg transition-all cursor-pointer border border-transparent"
                            title="Lihat Detail Mapel"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setPengampuMapel({ id: r.id, namaMapel: r.namaMapel, jumlahJam: r.jumlahJam ?? 0 })
                              setPengampuOpen(true)
                            }}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-650 dark:hover:bg-indigo-600 hover:text-white text-indigo-650 dark:text-indigo-400 rounded-lg transition-all cursor-pointer border border-transparent"
                            title="Plotting Pengajar"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditData({
                                id: r.id,
                                namaMapel: r.namaMapel,
                                kodeMapel: r.kodeMapel ?? "",
                                kelompok: r.kelompok ?? "",
                                aktif: r.aktif,
                              })
                              setFormOpen(true)
                            }}
                            className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:text-teal-600 dark:hover:text-teal-400 text-slate-500 rounded-lg transition-all cursor-pointer border border-transparent hover:border-teal-100"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(r.id)}
                            className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-455 text-slate-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PengampuDialog
        open={pengampuOpen}
        onClose={() => {
          setPengampuOpen(false)
          setPengampuMapel(null)
        }}
        mataPelajaranId={pengampuMapel?.id ?? ""}
        mataPelajaranNama={pengampuMapel?.namaMapel ?? ""}
        jumlahJam={pengampuMapel?.jumlahJam ?? null}
      />

      <MapelFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
        }}
        onSubmit={handleSubmit}
        initial={editData}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <SubjectExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        subjects={(mapelList ?? []) as any}
        classes={(kelasList ?? []) as any}
        institution={sekolah}
      />

      {/* ================= CUSTOM ENTERPRISE DELETE MODAL ================= */}
      {deleteId && typeof window !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !removeMutation.isPending) {
              setDeleteId(null)
              setDeleteConfirmText("")
            }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/20 p-4 animate-in fade-in duration-200"
        >
          <div className="bg-background rounded-3xl w-full max-w-md mx-4 relative overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 my-auto flex flex-col text-left animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Icon */}
            <div className="flex items-center space-x-3.5 mb-5 shrink-0">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-850 dark:text-slate-100 leading-snug">
                  Hapus Mata Pelajaran
                </h3>
                <p className="text-xs text-rose-500 font-extrabold mt-0.5">
                  Tindakan ini permanen dan tidak dapat dibatalkan!
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4 mb-6 text-xs text-slate-505 leading-relaxed">
              <p>
                Menghapus mata pelajaran <strong className="text-slate-800 dark:text-slate-200 font-black">"{subjectToDelete?.namaMapel}"</strong> juga akan menghapus seluruh data plotting pengampu kelas serta jadwal terkait di sistem.
              </p>

              {/* Subject details card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-800/60 rounded-2xl">
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Kode Mapel</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mt-0.5">{subjectToDelete?.kodeMapel || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Nama Mapel</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mt-0.5">{subjectToDelete?.namaMapel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tingkat / Kelas</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                    {(() => {
                      const classesAssigned = subjectToDelete?.pengampu?.map((p: any) => p.kelas?.namaKelas).filter(Boolean) || []
                      return classesAssigned.length > 0 ? Array.from(new Set(classesAssigned)).join(", ") : "Semua Kelas"
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Kategori</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                    {KELOMPOK_LABEL[subjectToDelete?.kelompok ?? ""] ?? subjectToDelete?.kelompok ?? "Mapel Wajib"}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 block">
                  Konfirmasi Keamanan (Enterprise-grade)
                </Label>
                <p className="text-[11px] text-slate-400">
                  Ketik nama lengkap mata pelajaran <strong className="text-slate-800 dark:text-slate-200 font-bold">"{subjectToDelete?.namaMapel}"</strong> di bawah ini untuk mengonfirmasi penghapusan:
                </p>
                <Input
                  placeholder="Ketik nama mata pelajaran..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mt-2 h-9 px-3 text-xs font-bold rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0"
                  disabled={removeMutation.isPending}
                  autoFocus
                />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteId(null)
                  setDeleteConfirmText("")
                }}
                disabled={removeMutation.isPending}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={removeMutation.isPending || deleteConfirmText.trim().toLowerCase() !== subjectToDelete?.namaMapel.trim().toLowerCase()}
                className="flex-1 py-2.5 bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-rose-500/10"
              >
                {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {generateOpen && (
        <GenerateKurikulumDialog
          open
          onOpenChange={setGenerateOpen}
          sekolahLevel={sekolah?.jenjang}
          sekolahNama={sekolah?.namaSekolah}
          kelasList={(kelasList ?? []) as any}
          existingMapel={(mapelList ?? []) as any}
        />
      )}

      {/* ================= SUBJECT DETAIL MODAL ================= */}
      {detailSubject && typeof window !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailSubject(null)
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/20 p-4"
        >
          <div className="bg-background rounded-3xl w-full max-w-xl mx-4 relative overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 my-auto max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setDetailSubject(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start space-x-3.5 pr-8 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="px-2.5 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900 rounded-lg text-xs font-mono font-black uppercase">
                    {detailSubject.kodeMapel || "-"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-100/50 dark:border-teal-900">
                    {KELOMPOK_LABEL[detailSubject.kelompok ?? ""] ?? detailSubject.kelompok ?? "Wajib"}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-850 dark:text-slate-100 mt-1.5 leading-snug">
                  {detailSubject.namaMapel}
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 font-medium mt-0.5">
                  Detail informasi mata pelajaran dan penugasan guru pengampu per kelas.
                </p>
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar space-y-6 pr-1 flex-1">
              {/* Main Subject Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Kode Mapel</span>
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 block">{detailSubject.kodeMapel || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Beban Mengajar</span>
                  <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400 mt-0.5 block">{detailSubject.jumlahJam || 2} JP / Minggu</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Status</span>
                  <span className={`text-xs font-extrabold mt-0.5 block ${detailSubject.aktif ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {detailSubject.aktif ? "Aktif" : "Tidak Aktif"}
                  </span>
                </div>
              </div>

              {/* Guru Pengampu Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-750 dark:text-slate-350">
                      Guru Pengampu & Plotting
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const subToPlot = detailSubject
                      setDetailSubject(null)
                      setPengampuMapel({ id: subToPlot.id, namaMapel: subToPlot.namaMapel, jumlahJam: subToPlot.jumlahJam ?? 0 })
                      setPengampuOpen(true)
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <span>Atur Plotting Guru</span>
                  </button>
                </div>

                {/* Teacher Assignments Cards */}
                {(() => {
                  const parsedAssignments = detailSubject.pengampu || []

                  if (parsedAssignments.length === 0) {
                    return (
                      <div className="p-5 bg-amber-50/30 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-900/50 rounded-2xl text-center space-y-2">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                          Belum Ada Guru Pengampu yang Diplotting
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-500">
                          Mata pelajaran ini belum memiliki guru pengampu yang ditugaskan untuk kelas manapun.
                        </p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-2.5">
                      {parsedAssignments.map((item: any, idx: number) => {
                        return (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-background border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xs hover:border-indigo-150 dark:hover:border-indigo-900 transition-all">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-extrabold text-sm shadow-xs">
                                {item.guru?.namaLengkap ? item.guru.namaLengkap.charAt(0).toUpperCase() : "G"}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.guru?.namaLengkap || "Belum Ditunjuk"}</h5>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Guru Pengampu #{idx + 1}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Kelas Ditugaskan</span>
                              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 rounded-lg text-xs font-bold inline-block">
                                {item.kelas?.namaKelas || "Semua Kelas"}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Footer Modal Buttons */}
            <div className="flex items-center space-x-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const subToEdit = detailSubject
                  setDetailSubject(null)
                  setEditData({
                    id: subToEdit.id,
                    namaMapel: subToEdit.namaMapel,
                    kodeMapel: subToEdit.kodeMapel ?? "",
                    kelompok: subToEdit.kelompok ?? "",
                    aktif: subToEdit.aktif,
                  })
                  setFormOpen(true)
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center space-x-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Mapel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const subToDelete = detailSubject
                  setDetailSubject(null)
                  setDeleteId(subToDelete.id)
                }}
                className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-455 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailSubject(null)}
                className="flex-1 py-2.5 bg-teal-600 dark:bg-teal-700 hover:bg-teal-700 dark:hover:bg-teal-600 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-teal-500/10 text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
