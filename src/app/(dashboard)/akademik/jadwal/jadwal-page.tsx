"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  Pencil,
  Trash2,
  Loader2,
  Settings,
  Sparkles,
  Plus,
  Clock,
  BookOpen,
  Flag,
  Coffee,
  RotateCcw,
  BarChart2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useSession } from "next-auth/react"
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type JadwalFormDialogType from "@/components/jadwal/JadwalFormDialog"
import type { JadwalFormData } from "@/components/jadwal/JadwalFormDialog"
import type PengaturanJadwalDialogType from "@/components/jadwal/PengaturanJadwalDialog"
import type CetakJadwalType from "@/components/jadwal/CetakJadwal"
import type ExportJadwalMenuType from "@/components/jadwal/ExportJadwalMenu"
import type AiGenerateDialogType from "@/components/jadwal/AiGenerateDialog"
import { DAYS, DAY_LABEL, toTimeInputValue, formatKelasLabel } from "@/components/jadwal/constants"

const JadwalFormDialog = dynamic<ComponentProps<typeof JadwalFormDialogType>>(
  () => import("@/components/jadwal/JadwalFormDialog").then((m) => m.default),
  { ssr: false }
)
const PengaturanJadwalDialog = dynamic<ComponentProps<typeof PengaturanJadwalDialogType>>(
  () => import("@/components/jadwal/PengaturanJadwalDialog").then((m) => m.default),
  { ssr: false }
)
const CetakJadwal = dynamic<ComponentProps<typeof CetakJadwalType>>(
  () => import("@/components/jadwal/CetakJadwal").then((m) => m.default),
  { ssr: false }
)
const ExportJadwalMenu = dynamic<ComponentProps<typeof ExportJadwalMenuType>>(
  () => import("@/components/jadwal/ExportJadwalMenu").then((m) => m.default),
  { ssr: false }
)
const AiGenerateDialog = dynamic<ComponentProps<typeof AiGenerateDialogType>>(
  () => import("@/components/jadwal/AiGenerateDialog").then((m) => m.default),
  { ssr: false }
)
const ReviewAndAnalysisModal = dynamic(() =>
  import("@/components/jadwal/ReviewAndAnalysisModal").then((m) => m.ReviewAndAnalysisModal),
  { ssr: false }
)

interface JadwalRecord {
  id: string
  kelasId: string
  mataPelajaranId: string
  guruId: string
  hari: string
  jamMulai: string | null
  jamSelesai: string | null
  jpMulai: number | null
  jpCount: number | null
}

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
}

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
}

interface GuruRecord {
  id: string
  namaLengkap: string
}

interface PengaturanData {
  id: string
  sekolahId: string
  durasiJP: number
  jamMulai: string
}

interface TimelineRecord {
  id: string
  pengaturanJadwalId: string
  hari: string
  tipe: string
  label: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
  warna: string | null
}

function JadwalSkeleton() {
  return (
    <div className="space-y-6 text-left animate-pulse">
      {/* Premium selector panel skeleton */}
      <div className="bg-slate-200 dark:bg-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-3 w-full md:max-w-md">
          <div className="h-6 w-36 bg-slate-300 dark:bg-slate-700 rounded-full" />
          <div className="h-8 w-64 bg-slate-300 dark:bg-slate-700 rounded-2xl" />
          <div className="h-4 w-full bg-slate-300 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="flex gap-3 items-end">
          <div className="h-10 w-32 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          <div className="h-10 w-32 bg-slate-300 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>

      {/* Quick Actions Bar skeleton */}
      <div className="flex justify-end gap-3 bg-slate-100 dark:bg-slate-900/40 p-4 rounded-3xl">
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-850 rounded-xl" />
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-850 rounded-xl" />
        <div className="h-10 w-28 bg-slate-200 dark:bg-slate-850 rounded-xl" />
      </div>

      {/* Grid view skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-900/30 rounded-3xl p-5 border border-slate-100 dark:border-slate-850 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-8 w-14 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JadwalPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  // Role permissions checks
  const canEdit = role === "super_admin" || role === "admin_sekolah" || role === "tu" || role === "kurikulum"
  const canViewAll = role === "super_admin" || role === "admin_sekolah" || role === "tu" || role === "kurikulum" || role === "yayasan" || role === "kepala_sekolah" || role === "kepsek"
  const isGuru = role === "guru"
  const isSiswa = role === "siswa"

  const { data: profile } = api.profil.getProfile.useQuery(undefined, { enabled: !!session })

  const [manualKelasId, setManualKelasId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<JadwalFormData | null>(null)
  const [addForHari, setAddForHari] = useState<string | null>(null)
  const [addJpMulai, setAddJpMulai] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pengaturanOpen, setPengaturanOpen] = useState(false)
  const [cetakOpen, setCetakOpen] = useState(false)
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMode, setResetMode] = useState<"all" | "kelas">("all")
  const [reviewOpen, setReviewOpen] = useState(false)

  // Filters & Modes states
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [scheduleViewMode, setScheduleViewMode] = useState<'mingguan' | 'harian'>('mingguan')

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const kelasRecords = useMemo(() => (kelasList ?? []) as KelasRecord[], [kelasList])

  // Derived value — tidak perlu useEffect: kelasRecords & profile sudah
  // tersedia sinkron dari server-side hydration di render pertama.
  const kelasId = useMemo(() => {
    if (isSiswa) return (profile?.kelasId as string) || ""
    if (manualKelasId) return manualKelasId
    return kelasRecords[0]?.id || ""
  }, [isSiswa, profile, manualKelasId, kelasRecords])

  const selectedKelasMain = useMemo(() => {
    const cls = kelasRecords.find((k) => k.id === kelasId)
    return cls ? formatKelasLabel(cls) : ""
  }, [kelasId, kelasRecords])

  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 500 })

  // Query is dynamically filtered by teacher ID if logged in as a teacher
  const { data: jadwalList, isLoading } = api.jadwal.getAll.useQuery(
    isGuru
      ? { guruId: (profile?.id || "none") as string }
      : { kelasId: kelasId || undefined },
    { enabled: isGuru ? !!profile?.id : (isSiswa ? !!kelasId : true) }
  )
  const { data: allJadwalList } = api.jadwal.getAll.useQuery(
    { limit: 10000 },
    { enabled: canEdit || canViewAll }
  )
  const { data: pengaturan } = api.pengaturanJadwal.get.useQuery({})
  const { data: timelineList } = api.pengaturanJadwal.getTimeline.useQuery({})

  const utils = api.useUtils()

  const clearAllMutation = api.jadwal.clearAll.useMutation({
    onSuccess: (res) => {
      toast.success(`Jadwal berhasil di-reset (${res.count} entri dihapus)`)
      utils.jadwal.getAll.invalidate()
      utils.jadwal.getTimelineWithJadwal.invalidate()
      setResetOpen(false)
    },
    onError: (err) => toast.error(err.message || "Gagal mereset jadwal"),
  })

  const handleResetJadwal = async () => {
    setResetting(true)
    try {
      const targetKelasId = resetMode === "kelas" ? kelasId || undefined : undefined
      if (resetMode === "kelas" && !targetKelasId) {
        toast.error("Tidak ada kelas yang dipilih. Pilih rombel dulu atau gunakan mode Semua Kelas.")
        return
      }
      await clearAllMutation.mutateAsync({ kelasId: targetKelasId })
    } finally {
      setResetting(false)
    }
  }

  const createMutation = api.jadwal.create.useMutation({
    onSuccess: () => {
      utils.jadwal.getAll.invalidate()
    },
  })

  const updateMutation = api.jadwal.update.useMutation({
    onSuccess: () => {
      utils.jadwal.getAll.invalidate()
    },
  })

  const removeMutation = api.jadwal.remove.useMutation({
    ...useOptimisticRemove({ queryKey: [["jadwal", "getAll"]] }),
  })

  const mapelRecords = useMemo(() => (mapelList ?? []) as MapelRecord[], [mapelList])
  const guruRecords = useMemo(() => (guruList ?? []) as GuruRecord[], [guruList])
  const jadwalRecords = useMemo(() => (jadwalList ?? []) as JadwalRecord[], [jadwalList])
  const pengaturanData = (pengaturan ?? null) as PengaturanData | null
  const timelineRecords = useMemo(() => (timelineList ?? []) as TimelineRecord[], [timelineList])

  const mapelMap = useMemo(
    () => new Map(mapelRecords.map((m) => [m.id, m])),
    [mapelRecords]
  )

  const guruMap = useMemo(
    () => new Map(guruRecords.map((g) => [g.id, g])),
    [guruRecords]
  )

  const aktifDays = useMemo(() => {
    return DAYS
  }, [])

  const timelineByDay = useMemo(() => {
    const map = new Map<string, TimelineRecord[]>()
    for (const day of aktifDays) {
      const items = timelineRecords
        .filter((t) => t.hari === day)
        .sort((a, b) => a.urutan - b.urutan)
      map.set(day, items)
    }
    return map
  }, [timelineRecords, aktifDays])

  const handleSubmit = async (data: JadwalFormData) => {
    if (!canEdit) return
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          mataPelajaranId: data.mataPelajaranId,
          guruId: data.guruId,
          hari: data.hari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu",
          jpMulai: data.jpMulai,
          jpCount: data.jpCount,
        },
      })
      toast.success(`JP berhasil diperbarui untuk ${DAY_LABEL[data.hari]} pada JP ${data.jpMulai}`)
    } else {
      await createMutation.mutateAsync({
        kelasId: kelasId,
        mataPelajaranId: data.mataPelajaranId,
        guruId: data.guruId,
        hari: data.hari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu",
        jpMulai: data.jpMulai,
        jpCount: data.jpCount,
      })
      toast.success(`JP berhasil ditambahkan ke ${DAY_LABEL[data.hari]} pada JP ${data.jpMulai}`)
    }
    setFormOpen(false)
    setEditEntry(null)
    setAddForHari(null)
    setAddJpMulai(null)
  }

  const handleDelete = async () => {
    if (!canEdit || !deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const openEdit = (entry: JadwalRecord) => {
    if (!canEdit) return
    setEditEntry({
      id: entry.id,
      hari: entry.hari,
      jamMulai: toTimeInputValue(entry.jamMulai),
      jamSelesai: toTimeInputValue(entry.jamSelesai),
      mataPelajaranId: entry.mataPelajaranId,
      guruId: entry.guruId,
      jpMulai: entry.jpMulai,
      jpCount: entry.jpCount,
    })
    setAddForHari(null)
    setFormOpen(true)
  }

  const openAdd = (hari: string, jpSlot?: number) => {
    if (!canEdit) return
    setEditEntry(null)
    setAddForHari(hari)
    setAddJpMulai(jpSlot ?? null)
    setFormOpen(true)
  }

  const hasData = jadwalRecords.length > 0

  const isInitialLoading =
    (isGuru && !profile) ||
    (isSiswa && (!profile || !kelasId)) ||
    kelasList === undefined ||
    mapelList === undefined ||
    timelineList === undefined

  if (isInitialLoading) {
    return <JadwalSkeleton />
  }

  if (kelasRecords.length === 0) {
    return (
      <div className="space-y-6">
        <div className="neumo-card bg-background rounded-[2rem] p-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-1">Belum Ada Kelas</h3>
            <p className="text-sm text-muted-foreground">
              Tambahkan kelas terlebih dahulu sebelum mengatur jadwal pelajaran.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Jadwal Pelajaran</h2>
        <p className="text-muted-foreground">Atur jadwal kegiatan belajar mengajar</p>
      </div>

      {/* Premium selection panel */}
      <div className="bg-gradient-to-tr from-slate-800 to-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-500/20">
            {isGuru ? "Jadwal Mengajar Anda" : isSiswa ? "Jadwal Belajar Kelas Anda" : "Panel Distribusi Jadwal"}
          </span>
          <h3 className="text-xl lg:text-2xl font-extrabold tracking-tight mt-3">
            {isGuru ? (
              <span>Tinjau Agenda: <span className="text-teal-400">{(profile?.namaLengkap as string) || "Guru"}</span></span>
            ) : (
              <span>Tinjau Mingguan: <span className="text-teal-400">{selectedKelasMain || "Pilih Rombel"}</span></span>
            )}
          </h3>
          <p className="text-slate-300 text-xs mt-1.5 max-w-md font-medium">
            {isGuru
              ? "Tinjauan lengkap jam pelajaran mengajar Anda yang terdaftar secara resmi di sekolah."
              : "Silakan filter rombel kelas dan pilih hari untuk melihat jadwal kegiatan belajar mengajar secara sistematis."}
          </p>
        </div>

        {/* Class, Day & View Mode pickers */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
          {/* Hide rombel picker for students and teachers */}
          {!isSiswa && !isGuru && (
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Rombel Kelas</label>
              <Select
                value={kelasId}
                onValueChange={(v) => v && setManualKelasId(v)}
                options={kelasRecords.map((k) => ({ value: k.id, label: formatKelasLabel(k) }))}
              >
                 <SelectTrigger className="w-full sm:w-48 !h-10 !rounded-xl text-xs font-bold !bg-teal-600 !text-white [&[data-slot=select-value]]:!text-white hover:!bg-teal-700 !shadow-none !ring-0 !focus-visible:ring-0 [&[data-open]]:!ring-0 [&[data-state=open]]:!ring-0 [&_svg]:!text-white [&[data-open]_svg]:!text-white [&[data-state=open]_svg]:!text-white">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl !text-popover-foreground">
                  {kelasRecords.map((k) => (
                    <SelectItem key={k.id} value={k.id} label={formatKelasLabel(k)} className="!text-slate-800 dark:!text-slate-200 focus:!text-slate-900 dark:focus:!text-white focus:!bg-slate-100 dark:focus:!bg-slate-800">
                      {formatKelasLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Filter Hari</label>
            <Select
              value={selectedDays.length === 0 ? "all" : selectedDays[0]}
              onValueChange={(val) => {
                if (val === "all" || !val) {
                  setSelectedDays([])
                } else {
                  setSelectedDays([val])
                }
              }}
              options={[
                { value: "all", label: "Semua Hari" },
                ...DAYS.map((day) => ({ value: day, label: DAY_LABEL[day] })),
              ]}
            >
              <SelectTrigger className="w-full sm:w-40 !h-10 !rounded-xl text-xs font-bold !bg-teal-600 !text-white [&[data-slot=select-value]]:!text-white hover:!bg-teal-700 !shadow-none !ring-0 !focus-visible:ring-0 [&[data-open]]:!ring-0 [&[data-state=open]]:!ring-0 [&_svg]:!text-white [&[data-open]_svg]:!text-white [&[data-state=open]_svg]:!text-white">
                <SelectValue placeholder="Pilih Hari" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl !text-popover-foreground">
                <SelectItem value="all" label="Semua Hari" className="!text-slate-800 dark:!text-slate-200 focus:!text-slate-900 dark:focus:!text-white focus:!bg-slate-100 dark:focus:!bg-slate-800">Semua Hari</SelectItem>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day} label={DAY_LABEL[day]} className="!text-slate-800 dark:!text-slate-200 focus:!text-slate-900 dark:focus:!text-white focus:!bg-slate-100 dark:focus:!bg-slate-800">
                    {DAY_LABEL[day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[8px] font-black text-slate-300 uppercase tracking-wider mb-1">Mode Tampilan</label>
            <div className="flex bg-slate-800/80 p-1 border border-slate-700/80 rounded-xl">
              <button
                type="button"
                onClick={() => setScheduleViewMode("mingguan")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  scheduleViewMode === "mingguan"
                    ? "bg-teal-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Mingguan (PC Grid)
              </button>
              <button
                type="button"
                onClick={() => setScheduleViewMode("harian")}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  scheduleViewMode === "harian"
                    ? "bg-teal-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Harian (Timeline)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar - Enhanced with Neumorphism card style */}
      {(canEdit || canViewAll) && (
        <div className="grid grid-cols-2 gap-3 mb-6 neumo-card bg-background p-4 rounded-3xl border-0 lg:flex lg:flex-wrap lg:justify-end">
          {canEdit && (
            <>
              <Button
                onClick={() => setPengaturanOpen(true)}
                className="flex items-center justify-center font-bold px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer !h-10 shadow-md neumo-sm w-full lg:w-auto"
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>Pengaturan Jadwal</span>
              </Button>

              <Button
                onClick={() => setAiGenerateOpen(true)}
                className="flex items-center justify-center font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer !h-10 shadow-md neumo-sm w-full lg:w-auto"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span>AI Auto-Generate</span>
              </Button>

              <Button
                onClick={() => setReviewOpen(true)}
                className="flex items-center justify-center font-bold px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer !h-10 shadow-md neumo-sm w-full lg:w-auto"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                <span>Audit Jadwal (AI Review)</span>
              </Button>
            </>
          )}

          {canViewAll && (
            <ExportJadwalMenu
              onCetak={() => setCetakOpen(true)}
              disabled={!kelasId || !hasData}
            />
          )}

          {canEdit && (
            <Button
              onClick={() => { setResetMode("all"); setResetOpen(true) }}
              disabled={resetting}
              className="flex items-center justify-center font-bold px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-950/70 rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer !h-10 w-full lg:w-auto"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              <span>Reset Jadwal</span>
            </Button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-900/30 rounded-3xl p-5 border border-slate-100 dark:border-slate-850 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-8 w-14 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : timelineRecords.length === 0 ? (
        <div className="neumo-card bg-background p-12 rounded-3xl text-center flex flex-col items-center justify-center border-0">
          <Settings className="h-12 w-12 text-slate-350 mb-2" />
          <h4 className="text-sm font-black text-slate-850 uppercase tracking-wider">Timeline Jam Belum Dibuat</h4>
          <p className="text-xs text-slate-400 font-bold max-w-sm mt-1 uppercase">
            Silakan konfigurasikan template timeline jam pelajaran (JP) terlebih dahulu di tombol Pengaturan Jadwal.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Day selection tab buttons - Enhanced with Neumorphism card style */}
          {scheduleViewMode === "harian" && (
            <div className="neumo-card bg-background p-4 rounded-3xl text-left space-y-2 border-0">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">
                Saring Berdasarkan Hari Kerja
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setSelectedDays([])}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                    selectedDays.length === 0
                      ? "bg-teal-600 text-white neumo-sm"
                      : "bg-background text-slate-600 neumo-sm hover:scale-[1.01]"
                  }`}
                >
                  Semua Hari
                </button>
                {DAYS.map((day) => {
                  const isSel = selectedDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (selectedDays.includes(day)) {
                          setSelectedDays(selectedDays.filter((d) => d !== day))
                        } else {
                          setSelectedDays([day])
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                        isSel
                          ? "bg-teal-600 text-white neumo-sm"
                          : "bg-background text-slate-600 neumo-sm hover:scale-[1.01]"
                      }`}
                    >
                      {DAY_LABEL[day]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {scheduleViewMode === "mingguan" ? (
            /* ================= WEEKLY GRID VIEW ================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
              {DAYS.filter((day) => selectedDays.length === 0 || selectedDays.includes(day)).map((day) => {
                const dayItems = timelineByDay.get(day) ?? []
                const jpItems = dayItems.filter((t) => t.tipe === "jp")

                return (
                  <div key={day} className="neumo-card bg-background rounded-3xl p-5 border-0 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm animate-pulse" />
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                          {DAY_LABEL[day]}
                        </h4>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => openAdd(day)}
                          className="rounded-lg p-1.5 bg-teal-50 dark:bg-slate-900 hover:bg-teal-600 hover:text-white text-teal-600 dark:text-teal-400 transition-all border-0 shadow-sm neumo-sm cursor-pointer"
                          title={`Tambah Jadwal Hari ${DAY_LABEL[day]}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Timeline items stack */}
                    <div className="space-y-3">
                      {dayItems.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-400 font-bold uppercase">Libur / Tidak KBM</p>
                      ) : (
                        dayItems.map((item) => {
                          if (item.tipe !== "jp") {
                            // Non-JP Agenda Item - Styled Inset
                            let Icon = Clock
                            let iconColor = "text-slate-500 bg-slate-50 dark:bg-slate-900"
                            let cardStyle = "bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] text-slate-700 dark:text-slate-300"

                            if (item.tipe === "upacara") {
                              Icon = Flag
                              iconColor = "text-amber-600 bg-amber-50 dark:bg-slate-900"
                              cardStyle = "bg-amber-50/40 dark:bg-[oklch(0.14_0.01_250)] text-amber-900 dark:text-amber-300"
                            } else if (item.tipe === "pembiasaan") {
                              Icon = BookOpen
                              iconColor = "text-emerald-600 bg-emerald-50 dark:bg-slate-900"
                              cardStyle = "bg-emerald-50/40 dark:bg-[oklch(0.14_0.01_250)] text-emerald-900 dark:text-emerald-300"
                            } else if (item.tipe === "istirahat") {
                              Icon = Coffee
                              iconColor = "text-indigo-600 bg-indigo-50 dark:bg-slate-900"
                              cardStyle = "bg-indigo-50/40 dark:bg-[oklch(0.14_0.01_250)] text-indigo-900 dark:text-indigo-300"
                            } else if (item.tipe === "sholat") {
                              Icon = Sparkles
                              iconColor = "text-purple-600 bg-purple-50 dark:bg-slate-900"
                              cardStyle = "bg-purple-50/40 dark:bg-[oklch(0.14_0.01_250)] text-purple-900 dark:text-purple-300"
                            }

                            return (
                              <div
                                key={item.id}
                                className={`p-3 rounded-2xl border-0 flex items-center justify-between gap-3 text-left neumo-inset ${cardStyle}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={`p-2 rounded-xl shrink-0 ${iconColor} border-0 shadow-xs`}>
                                    <Icon size={14} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[8px] font-black opacity-60 uppercase tracking-widest block">Agenda</span>
                                    <h5 className="text-xs font-black truncate leading-tight uppercase">
                                      {item.label || item.tipe}
                                    </h5>
                                  </div>
                                </div>
                                <span className="font-mono text-[9px] font-extrabold opacity-75 whitespace-nowrap">
                                  {item.jamMulai} - {item.jamSelesai}
                                </span>
                              </div>
                            )
                          } else {
                            // JP slot
                            const jpIndex = jpItems.findIndex((x) => x.id === item.id)
                            const academicJp = jpIndex + 1
                            const entries = jadwalRecords.filter(
                              (e) => e.hari === day && e.jpMulai !== null && e.jpCount !== null
                            )
                            const entry = entries.find(
                              (e) => academicJp >= e.jpMulai! && academicJp < e.jpMulai! + e.jpCount!
                            )

                            if (entry) {
                              const isStart = entry.jpMulai === academicJp
                              const mapel = mapelMap.get(entry.mataPelajaranId)
                              const teacher = guruMap.get(entry.guruId)
                              const kelas = kelasRecords.find((k) => k.id === entry.kelasId)

                              const startSlot = jpItems[entry.jpMulai! - 1]
                              const endSlot = jpItems[entry.jpMulai! - 1 + entry.jpCount! - 1]
                              const tStart = startSlot?.jamMulai || item.jamMulai
                              const tEnd = endSlot?.jamSelesai || item.jamSelesai

                              return (
                                <div
                                  key={`jp-${item.id}`}
                                  className="group relative p-3 bg-background dark:bg-slate-900 border-0 rounded-2xl hover:scale-[1.01] transition-all flex flex-col justify-between text-left neumo-sm hover:shadow-md"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border-0 rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                      JP {academicJp}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-slate-400">
                                      {tStart} - {tEnd}
                                    </span>
                                  </div>

                                  <div className="mt-2 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-1.5 py-0.5 bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border-0 rounded text-[9px] font-mono font-black uppercase">
                                        {mapel?.kodeMapel || "MAPEL"}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 truncate flex-1 block">
                                        {isGuru
                                          ? formatKelasLabel(kelas)
                                          : (teacher?.namaLengkap || "Guru")}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-black text-slate-850 dark:text-slate-200 mt-1 line-clamp-2 leading-tight uppercase">
                                      {mapel?.namaMapel || "—"}
                                    </h5>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/80 flex items-center justify-end">
                                    {isStart ? (
                                      <div className="flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canEdit && (
                                          <>
                                            <button
                                              onClick={() => openEdit(entry)}
                                              className="p-1.5 bg-background hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-655 rounded-lg border-0 neumo-sm cursor-pointer"
                                              title="Edit Jadwal"
                                            >
                                              <Pencil size={11} />
                                            </button>
                                            <button
                                              onClick={() => setDeleteId(entry.id)}
                                              className="p-1.5 bg-background hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 rounded-lg border-0 neumo-sm cursor-pointer"
                                              title="Hapus Jadwal"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[9px] font-black text-teal-400 dark:text-teal-400 uppercase tracking-widest">
                                        Lanjutan
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            } else {
                              // Empty JP slot - Sunken style
                              return (
                                <div
                                  key={`jp-empty-${item.id}`}
                                  className="p-3 bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 rounded-2xl flex items-center justify-between text-left neumo-inset"
                                >
                                  <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">JP {academicJp}</span>
                                    <span className="text-[10px] text-slate-350 font-bold block mt-0.5 uppercase tracking-wide">
                                      {isGuru ? "Tidak Mengajar" : "Sesi Kosong"}
                                    </span>
                                  </div>
                                  {canEdit && (
                                    <button
                                      onClick={() => openAdd(day, academicJp)}
                                      className="p-1.5 bg-background hover:bg-teal-600 hover:text-white text-teal-600 dark:text-teal-400 rounded-xl border-0 shadow-sm neumo-sm cursor-pointer"
                                      title="Isi Jadwal JP"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )
                            }
                          }
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ================= HARIAN/TIMELINE LIST VIEW ================= */
            <div className="space-y-6">
              {DAYS.filter((day) => selectedDays.length === 0 || selectedDays.includes(day)).map((day) => {
                const dayItems = timelineByDay.get(day) ?? []
                const jpItems = dayItems.filter((t) => t.tipe === "jp")

                return (
                  <div key={day} className="neumo-card bg-background rounded-3xl p-6 border-0 space-y-4">
                    <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-50 dark:border-slate-800">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm animate-pulse" />
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">{DAY_LABEL[day]}</h4>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-150/40 dark:bg-slate-850 px-2.5 py-0.5 rounded-md uppercase">
                        Hari KBM Aktif
                      </span>
                    </div>

                    <div className="relative border-l border-slate-100 dark:border-slate-800 pl-4 ml-2 space-y-4 text-left">
                      {dayItems.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold uppercase py-2">Tidak ada jadwal</p>
                      ) : (
                        dayItems.map((item) => {
                          if (item.tipe !== "jp") {
                            // Non-JP timeline item - Inset
                            let Icon = Clock
                            let iconColor = "text-slate-500 bg-slate-50 dark:bg-slate-900"
                            let badgeStyle = "text-slate-800 bg-slate-50 dark:bg-slate-900 border-0"

                            if (item.tipe === "upacara") {
                              Icon = Flag
                              iconColor = "text-amber-600 bg-amber-50 dark:bg-slate-900"
                              badgeStyle = "text-amber-900 bg-amber-50 dark:bg-slate-900 border-0"
                            } else if (item.tipe === "pembiasaan") {
                              Icon = BookOpen
                              iconColor = "text-emerald-600 bg-emerald-50 dark:bg-slate-900"
                              badgeStyle = "text-emerald-900 bg-emerald-50 dark:bg-slate-900 border-0"
                            } else if (item.tipe === "istirahat") {
                              Icon = Coffee
                              iconColor = "text-indigo-600 bg-indigo-50 dark:bg-slate-900"
                              badgeStyle = "text-indigo-900 bg-indigo-50 dark:bg-slate-900 border-0"
                            } else if (item.tipe === "sholat") {
                              Icon = Sparkles
                              iconColor = "text-purple-600 bg-purple-50 dark:bg-slate-900"
                              badgeStyle = "text-purple-900 bg-purple-50 dark:bg-slate-900 border-0"
                            }

                            return (
                              <div
                                key={item.id}
                                className="relative p-3.5 bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left neumo-inset"
                              >
                                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-slate-350 border-2 border-white dark:border-slate-900" />
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className={`p-2.5 rounded-xl shrink-0 ${iconColor} border-0 shadow-xs`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Agenda</span>
                                    <h5 className="text-xs font-black text-slate-850 dark:text-slate-250 truncate leading-none uppercase">{item.label || item.tipe}</h5>
                                  </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-xl font-mono text-[10px] font-bold ${badgeStyle} shadow-inner`}>
                                  {item.jamMulai} - {item.jamSelesai}
                                </div>
                              </div>
                            )
                          } else {
                            const jpIndex = jpItems.findIndex((x) => x.id === item.id)
                            const academicJp = jpIndex + 1
                            const entries = jadwalRecords.filter(
                              (e) => e.hari === day && e.jpMulai !== null && e.jpCount !== null
                            )
                            const entry = entries.find(
                              (e) => academicJp >= e.jpMulai! && academicJp < e.jpMulai! + e.jpCount!
                            )

                            return entry ? (
                              // Filled JP slot timeline item - Raised style
                              <div
                                key={item.id}
                                className="relative p-4 bg-background dark:bg-slate-900 border-0 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:scale-[1.01] transition-all neumo-sm"
                              >
                                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-teal-500" />
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <span className="px-2.5 py-1 rounded-xl font-bold text-xs bg-teal-50 dark:bg-slate-850 text-teal-700 dark:text-teal-400 shrink-0">
                                    JP {academicJp}
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 bg-teal-50 dark:bg-slate-850 text-teal-705 dark:text-teal-400 border-0 rounded text-[9px] font-mono font-black uppercase">
                                        {mapelMap.get(entry.mataPelajaranId)?.kodeMapel || "MAPEL"}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 truncate flex-1 block">
                                        {isGuru
                                          ? formatKelasLabel(kelasRecords.find((k) => k.id === entry.kelasId))
                                          : (guruMap.get(entry.guruId)?.namaLengkap || "—")}
                                      </span>
                                    </div>
                                    <h5 className="text-xs sm:text-sm font-black text-slate-850 dark:text-slate-200 mt-1 leading-tight uppercase">
                                      {mapelMap.get(entry.mataPelajaranId)?.namaMapel || "—"}
                                    </h5>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-slate-50 dark:border-slate-800/80 sm:border-t-0">
                                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 border-0 px-2.5 py-1 rounded-lg shadow-inner">
                                    {item.jamMulai} - {item.jamSelesai}
                                  </span>

                                  <div className="flex space-x-1 shrink-0">
                                    {entry.jpMulai === academicJp && canEdit && (
                                      <>
                                        <button
                                          onClick={() => openEdit(entry)}
                                          className="p-1.5 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-655 border-0 neumo-sm cursor-pointer"
                                          title="Edit"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteId(entry.id)}
                                          className="p-1.5 bg-background hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-600 border-0 neumo-sm cursor-pointer"
                                          title="Hapus"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Empty JP slot timeline item - Sunken style
                              <div
                                key={item.id}
                                className="relative p-4 bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left neumo-inset"
                              >
                                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-slate-350" />
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <span className="px-2.5 py-1 rounded-xl font-bold text-xs bg-slate-50 dark:bg-slate-850 text-slate-400 shrink-0">
                                    JP {academicJp}
                                  </span>
                                  <div className="min-w-0 flex-1 text-left">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                      {isGuru ? "Tidak Mengajar" : "Sesi Kosong"}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-455 dark:text-slate-500 block mt-0.5">
                                      {isGuru ? "Waktu luang / koordinasi" : "Dapat diisi jadwal pelajaran"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2.5 sm:pt-0 border-0">
                                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 border-0 px-2.5 py-1 rounded-lg shadow-inner">
                                    {item.jamMulai} - {item.jamSelesai}
                                  </span>

                                  {canEdit && (
                                    <button
                                      onClick={() => openAdd(day, academicJp)}
                                      disabled={mapelRecords.length === 0}
                                      className="p-1.5 bg-background hover:bg-teal-600 hover:text-white text-teal-600 dark:text-teal-400 rounded-xl border-0 shadow-sm neumo-sm cursor-pointer text-[10px] font-bold"
                                      title="Isi Jadwal"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          }
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer stats summary */}
          {hasData && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-[10px] font-black uppercase text-slate-400 flex-wrap">
              <span>
                <strong className="text-slate-700 dark:text-slate-300">{jadwalRecords.length}</strong> jadwal terdaftar
              </span>
              <span>
                <strong className="text-slate-700 dark:text-slate-300">
                  {new Set(jadwalRecords.map((j) => j.hari)).size}
                </strong>{" "}
                hari kbm
              </span>
              <span>
                <strong className="text-slate-700 dark:text-slate-300">
                  {new Set(jadwalRecords.map((j) => j.mataPelajaranId)).size}
                </strong>{" "}
                mapel aktif
              </span>
              {pengaturanData && (
                <span>
                  1 JP = <strong className="text-slate-700 dark:text-slate-300">{pengaturanData.durasiJP}</strong> menit
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialog components */}
      {canEdit && (
        <>
          <JadwalFormDialog
            open={formOpen}
            onClose={() => {
              setFormOpen(false)
              setEditEntry(null)
              setAddForHari(null)
              setAddJpMulai(null)
            }}
            onOpenPengaturan={() => {
              setFormOpen(false)
              setPengaturanOpen(true)
            }}
            onSubmit={handleSubmit}
            initial={editEntry}
            mapelList={mapelRecords}
            guruList={guruRecords}
            saving={createMutation.isPending || updateMutation.isPending}
            existingJadwal={jadwalRecords as any}
            timelineItems={timelineRecords as any}
            contextHari={addForHari ?? undefined}
            initialJp={addJpMulai}
            kelasId={kelasId}
          />

          <PengaturanJadwalDialog
            open={pengaturanOpen}
            onClose={() => setPengaturanOpen(false)}
          />

          <AlertDialog open={resetOpen} onOpenChange={(open) => !resetting && setResetOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Jadwal Pelajaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih cakupan reset, lalu konfirmasi. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/60 has-[[data-slot=radio-group-item][aria-checked=true]]:border-rose-300 has-[[data-slot=radio-group-item][aria-checked=true]]:bg-rose-50/50 dark:has-[[data-slot=radio-group-item][aria-checked=true]]:border-rose-900/60"
                onClick={() => setResetMode("all")}>
                <RadioGroup
                  value={resetMode}
                  onValueChange={(v) => setResetMode(v as "all" | "kelas")}
                >
                  <RadioGroupItem value="all" />
                </RadioGroup>
                <span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Semua Kelas</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hapus seluruh jadwal pelajaran di semua rombel sekolah ini</span>
                </span>
              </label>
              {kelasId && (
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/60 has-[[data-slot=radio-group-item][aria-checked=true]]:border-rose-300 has-[[data-slot=radio-group-item][aria-checked=true]]:bg-rose-50/50 dark:has-[[data-slot=radio-group-item][aria-checked=true]]:border-rose-900/60"
                  onClick={() => setResetMode("kelas")}>
                  <RadioGroup
                    value={resetMode}
                    onValueChange={(v) => setResetMode(v as "all" | "kelas")}
                  >
                    <RadioGroupItem value="kelas" />
                  </RadioGroup>
                  <span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">Hanya {selectedKelasMain || "Kelas Terpilih"}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hapus jadwal rombel yang sedang dipilih saja</span>
                  </span>
                </label>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetJadwal}
              disabled={resetting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RotateCcw className="w-4 h-4 mr-1.5" />}
              Ya, Reset Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AiGenerateDialog
            open={aiGenerateOpen}
            onClose={() => setAiGenerateOpen(false)}
            kelasRecords={kelasRecords}
            mapelRecords={mapelRecords}
            guruRecords={guruRecords}
            existingJadwal={jadwalRecords as any}
          />
      {(canEdit || canViewAll) && (
        <ReviewAndAnalysisModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          classes={kelasRecords}
          schedules={(allJadwalList ?? []) as any}
          subjects={mapelRecords}
          teachers={guruRecords}
        />
      )}
        </>
      )}

      {canViewAll && (
        <CetakJadwal
          open={cetakOpen}
          onClose={() => setCetakOpen(false)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl p-6 bg-background border-0 shadow-2xl overflow-hidden max-w-sm text-left">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">Hapus Jadwal</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold text-slate-455 leading-normal">
              Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-3 mt-4 border-t border-slate-100 pt-4">
            <AlertDialogCancel disabled={removeMutation.isPending} className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={removeMutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Hapus</span>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
