"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { Plus, Pencil, Trash2, Loader2, Search, MoreHorizontal, GripVertical, BookOpen, Layers, Clock, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
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
import ImportExportMapel from "@/components/mapel/ImportExportMapel"

const GenerateKurikulumDialog = dynamic(() => import("@/components/mapel/GenerateKurikulumDialog"), { ssr: false })

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
  const [pengampuOpen, setPengampuOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [pengampuMapel, setPengampuMapel] = useState<{ id: string; namaMapel: string; jumlahJam: number } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [localRecords, setLocalRecords] = useState<MapelRecord[]>([])
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
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
    search,
    tingkat: tingkatFilter || undefined,
  })
  const utils = api.useUtils()

  useEffect(() => {
    setLocalRecords((mapelList ?? []) as MapelRecord[])
  }, [mapelList])

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
        },
      })
    } else {
      const res = await createMutation.mutateAsync({
        namaMapel: data.namaMapel,
        kodeMapel: data.kodeMapel || null,
        kelompok: (data.kelompok as "A" | "B" | "C" | "muatan_lokal") || null,
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
            jumlahJam: 4,
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
            <ImportExportMapel
              mapelList={(mapelList ?? []) as any}
              onDone={() => utils.mapel.getAll.invalidate()}
            />
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
          ) : localRecords.length === 0 ? (
            <div className="neumo-card bg-background rounded-[22px] p-8 text-center text-slate-400 font-semibold">
              {search ? "Tidak ditemukan" : "Belum ada mata pelajaran"}
            </div>
          ) : (
            localRecords.map((r, index) => {
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

                    <div className="flex space-x-1.5 items-center">
                      <button
                        onClick={() => {
                          setPengampuMapel({ id: r.id, namaMapel: r.namaMapel, jumlahJam: r.jumlahJam ?? 0 })
                          setPengampuOpen(true)
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                        title="Plotting Pengajar"
                      >
                        <span>Plot Pengajar</span>
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
                        className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === r.id ? null : r.id)
                          }}
                          className={cn(
                            "w-7 h-7 flex items-center justify-center border rounded-lg transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/20",
                            isMenuOpen
                              ? "border-slate-800 text-slate-800 dark:border-slate-650 dark:text-slate-200"
                              : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                          )}
                        >
                          <MoreHorizontal size={14} strokeWidth={2.5} />
                        </button>
                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 bottom-full mb-2 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-50 min-w-[150px] p-1.5 space-y-1 block animate-fade-in text-left"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setDeleteId(r.id)
                              }}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-455 font-bold text-xs transition-colors cursor-pointer text-left"
                            >
                              <Trash2 size={13} className="text-rose-500 shrink-0" />
                              <span>Hapus Mapel</span>
                            </button>
                          </div>
                        )}
                      </div>
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
                <TableHead className="text-center text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Guru Pengampu</TableHead>
                <TableHead className="text-center w-24 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : localRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold">
                    Tidak ada data mata pelajaran ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                localRecords.map((r, index) => {
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
                      <TableCell className="relative text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === r.id ? null : r.id)
                          }}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border rounded-lg hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm mx-auto cursor-pointer focus:outline-none",
                            activeMenuId === r.id
                              ? "border-slate-800 text-slate-800 dark:border-slate-650 dark:text-slate-200"
                              : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                          )}
                        >
                          <MoreHorizontal className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {activeMenuId === r.id && (
                          <div
                            ref={menuRef}
                            className={cn(
                              "absolute right-12 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 min-w-[190px] p-2 space-y-1 block animate-fade-in text-left",
                              index >= localRecords.length - 3 ? "bottom-0" : "top-0"
                            )}
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setPengampuMapel({ id: r.id, namaMapel: r.namaMapel, jumlahJam: r.jumlahJam ?? 0 })
                                setPengampuOpen(true)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                                <span className="text-xs font-bold leading-none shrink-0">👥</span>
                              </div>
                              <span>Plotting Pengajar</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setEditData({
                                  id: r.id,
                                  namaMapel: r.namaMapel,
                                  kodeMapel: r.kodeMapel ?? "",
                                  kelompok: r.kelompok ?? "",
                                  aktif: r.aktif,
                                })
                                setFormOpen(true)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-455 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                                <Pencil size={14} strokeWidth={2.5} />
                              </div>
                              <span>Edit Pelajaran</span>
                            </button>

                            <div className="h-px bg-slate-100 dark:bg-slate-850 my-1 mx-2"></div>

                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setDeleteId(r.id)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-455 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-450 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors shrink-0">
                                <Trash2 size={14} strokeWidth={2.5} />
                              </div>
                              <span>Hapus Pelajaran</span>
                            </button>
                          </div>
                        )}
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

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus mata pelajaran ini? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    </div>
  )
}
