"use client"

import { useState, useMemo, useEffect } from "react"
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
  Users,
  Bell,
  Printer,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
  TooltipProvider,
} from "@/components/ui/tooltip"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import type JadwalFormDialogType from "@/components/jadwal/JadwalFormDialog"
import type { JadwalFormData } from "@/components/jadwal/JadwalFormDialog"
import type CetakJadwalType from "@/components/jadwal/CetakJadwal"
import type ExportJadwalMenuType from "@/components/jadwal/ExportJadwalMenu"
import type AiGenerateDialogType from "@/components/jadwal/AiGenerateDialog"
import { DAYS, DAY_LABEL, toTimeInputValue, formatKelasLabel } from "@/components/jadwal/constants"
const MAPEL_COLORS = [
  { bg: "bg-emerald-50/70 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-300/60 dark:border-emerald-800/40" },
  { bg: "bg-indigo-50/70 dark:bg-indigo-950/20", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-300/60 dark:border-indigo-800/40" },
  { bg: "bg-amber-50/70 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", border: "border-amber-300/60 dark:border-amber-800/40" },
  { bg: "bg-rose-50/70 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-400", border: "border-rose-300/60 dark:border-rose-800/40" },
  { bg: "bg-sky-50/70 dark:bg-sky-950/20", text: "text-sky-700 dark:text-sky-400", border: "border-sky-300/60 dark:border-sky-800/40" },
  { bg: "bg-violet-50/70 dark:bg-violet-950/20", text: "text-violet-700 dark:text-violet-400", border: "border-violet-300/60 dark:border-violet-800/40" },
  { bg: "bg-pink-50/70 dark:bg-pink-950/20", text: "text-pink-700 dark:text-pink-400", border: "border-pink-300/60 dark:border-pink-800/40" },
  { bg: "bg-cyan-50/70 dark:bg-cyan-950/20", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-300/60 dark:border-cyan-800/40" },
  { bg: "bg-teal-50/70 dark:bg-teal-950/20", text: "text-teal-700 dark:text-teal-400", border: "border-teal-300/60 dark:border-teal-800/40" },
  { bg: "bg-orange-50/70 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-300/60 dark:border-orange-800/40" },
]

function getMapelColor(mapelId: string | undefined) {
  if (!mapelId) return MAPEL_COLORS[0]
  let hash = 0
  for (let i = 0; i < mapelId.length; i++) {
    hash = mapelId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % MAPEL_COLORS.length
  return MAPEL_COLORS[index]
}

const PengaturanJadwalPanel = dynamic(
  () => import("@/components/jadwal/PengaturanJadwalPanel").then((m) => m.default)
)

const JadwalFormDialog = dynamic<ComponentProps<typeof JadwalFormDialogType>>(
  () => import("@/components/jadwal/JadwalFormDialog").then((m) => m.default),
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
  waliKelasId?: string | null
}

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
}

interface GuruRecord {
  id: string
  namaLengkap: string
  nipnuptk?: string | null
  email?: string | null
  kategoriPegawai?: string | null
}

interface PengaturanData {
  id: string
  sekolahId: string
  durasiJP: number
  jamMulai: string
  lastPublishedAt?: string | null
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
  // Publish notifikasi hanya untuk role yang diizinkan oleh router notifikasi.create
  const canPublish = role === "super_admin" || role === "admin_sekolah"
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
  const [cetakOpen, setCetakOpen] = useState(false)
  const [cetakGuruId, setCetakGuruId] = useState<string | null>(null)
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMode, setResetMode] = useState<"all" | "kelas">("all")
  const [reviewOpen, setReviewOpen] = useState(false)

  // Filters & Modes states
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [scheduleViewMode, setScheduleViewMode] = useState<'mingguan' | 'harian'>('mingguan')

  // Mode filter admin: Filter Rombel (per kelas) vs Cari Jadwal Guru (per guru)
  const [adminFilterMode, setAdminFilterMode] = useState<'kelas' | 'guru'>('kelas')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")

  // Tampilan "jadwal per guru" — berlaku untuk guru (role guru) maupun admin
  // dalam mode Cari Jadwal Guru. Menentukan label di kartu JP (Rombel vs Guru).
  const isTeacherView = isGuru || (!isSiswa && adminFilterMode === "guru")

  // Top-level tabs (mengikuti struktur prototipe: Pengaturan Jadwal vs Distribusi Jadwal)
  const [activeMainTab, setActiveMainTab] = useState<'pengaturan' | 'distribusi'>('distribusi')

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

  const guruRecords = useMemo(() => (guruList ?? []) as GuruRecord[], [guruList])

  // Auto-pilih guru pertama saat masuk mode Cari Jadwal Guru (mirip prototipe)
  useEffect(() => {
    if (!isGuru && !isSiswa && adminFilterMode === "guru" && !selectedTeacherId && guruRecords.length > 0) {
      setSelectedTeacherId(guruRecords[0].id)
    }
  }, [adminFilterMode, isGuru, isSiswa, guruRecords, selectedTeacherId])

  const selectedTeacherObj = useMemo(() => {
    if (isGuru) {
      return (guruRecords.find((g) => g.id === (profile?.id as string)) ||
        (profile?.namaLengkap ? { id: (profile?.id as string) || "", namaLengkap: profile.namaLengkap as string } : null)) || null
    }
    if (selectedTeacherId) {
      return guruRecords.find((g) => g.id === selectedTeacherId) || null
    }
    return guruRecords[0] || null
  }, [isGuru, guruRecords, profile, selectedTeacherId])

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
  const { data: tahunAjaranData } = api.lembaga.getActiveTahunAjaran.useQuery(undefined, {
    enabled: isSiswa,
  })

  const utils = api.useUtils()

  const publishNotifMutation = api.notifikasi.create.useMutation()

  const publishJadwalMutation = api.pengaturanJadwal.publish.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.get.invalidate()
      toast.success("Jadwal pelajaran berhasil diterbitkan / diperbarui")
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui status terbit jadwal"),
  })

  const handlePublishSchedule = async () => {
    const isUpdate = !!pengaturanData?.lastPublishedAt
    const judul = isUpdate ? "Jadwal Pelajaran Diperbarui" : "Jadwal Pelajaran Terbit"
    const pesan = isUpdate
      ? "Jadwal pembelajaran telah diperbarui oleh Administrator. Silakan cek perubahan terbaru."
      : "Jadwal pelajaran baru telah terbit dan sudah dapat diakses."
    // Publish status & kirim notifikasi berjalan independen — gagalnya notifikasi
    // tidak menghalangi update lastPublishedAt (mirip prototipe).
    const notifPromise = publishNotifMutation
      .mutateAsync({
        judul,
        pesan,
        tipe: "info",
        targetRoles: ["guru", "siswa", "tu", "yayasan"],
        link: "/akademik/jadwal",
      })
      .catch((err) => {
        toast.error(err?.message || "Gagal mengirim pemberitahuan")
      })
    try {
      await publishJadwalMutation.mutateAsync({})
    } catch {
      // toast ditangani di onError mutation
    }
    await notifPromise
  }

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

  const saveDraftSlotMutation = api.jadwal.saveDraftSlot.useMutation({
    onSuccess: () => {
      utils.jadwal.getAll.invalidate()
      utils.jadwal.getTimelineWithJadwal.invalidate()
      utils.pengaturanJadwal.get.invalidate()
      toast.success("Jadwal berhasil dipindahkan secara manual")
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memindahkan jadwal")
    }
  })

  const handleDragDropMove = async (draggedId: string, targetKelasId: string, targetHari: string, targetJp: number) => {
    const list = allJadwalList ?? []
    const record = list.find((r) => r.id === draggedId)
    if (!record) return
    try {
      await saveDraftSlotMutation.mutateAsync({
        id: record.id,
        kelasId: targetKelasId,
        mataPelajaranId: record.mataPelajaranId,
        guruId: record.guruId,
        hari: targetHari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu",
        jpMulai: targetJp,
        jpCount: record.jpCount ?? 1,
        clientVersion: pengaturan?.version ?? 1,
      })
    } catch {
      // toast is handled in mutation
    }
  }

  const mapelRecords = useMemo(() => (mapelList ?? []) as MapelRecord[], [mapelList])
  const jadwalRecords = useMemo(() => {
    if (adminFilterMode === "guru" && canViewAll) {
      // Mode Cari Jadwal Guru: tampilkan jadwal milik guru terpilih di semua rombel
      if (!selectedTeacherId) return [] as JadwalRecord[]
      return ((allJadwalList ?? []) as JadwalRecord[]).filter((e) => e.guruId === selectedTeacherId)
    }
    if (kelasId === "semua") {
      return (allJadwalList ?? []) as JadwalRecord[]
    }
    return (jadwalList ?? []) as JadwalRecord[]
  }, [kelasId, allJadwalList, jadwalList, adminFilterMode, canViewAll, selectedTeacherId])
  const pengaturanData = (pengaturan ?? null) as (PengaturanData & { lastPublishedAt?: string | null }) | null
  const timelineRecords = useMemo(() => (timelineList ?? []) as TimelineRecord[], [timelineList])

  const mapelMap = useMemo(
    () => new Map(mapelRecords.map((m) => [m.id, m])),
    [mapelRecords]
  )

  // Statistik guru untuk kartu info (mode Cari Jadwal Guru)
  const teacherStats = useMemo(() => {
    const list = (allJadwalList ?? []) as JadwalRecord[]
    const targetId = isGuru ? (profile?.id as string) : selectedTeacherId
    const teacherScheds = list.filter((s) => s.guruId === targetId)
    const classSet = new Set<string>()
    const subjectSet = new Set<string>()
    let totalJP = 0
    for (const s of teacherScheds) {
      const cls = kelasRecords.find((c) => c.id === s.kelasId)
      if (cls) classSet.add(cls.namaKelas)
      else if (s.kelasId) classSet.add(s.kelasId)
      const sub = mapelMap.get(s.mataPelajaranId)
      if (sub) subjectSet.add(sub.namaMapel)
      totalJP += s.jpCount ?? 1
    }
    return {
      totalJP,
      classesTaught: Array.from(classSet),
      subjectsTaught: Array.from(subjectSet),
      schedCount: teacherScheds.length,
    }
  }, [allJadwalList, isGuru, profile, selectedTeacherId, kelasRecords, mapelMap])

  const guruMap = useMemo(
    () => new Map(guruRecords.map((g) => [g.id, g])),
    [guruRecords]
  )

  const aktifDays = useMemo(() => {
    const daysInTimeline = new Set(timelineRecords.map((t) => t.hari))
    const baseDays = DAYS.filter((day) => daysInTimeline.has(day))
    if (isTeacherView) {
      return baseDays.filter((day) =>
        jadwalRecords.some((e) => e.hari === day)
      )
    }
    return baseDays
  }, [timelineRecords, isTeacherView, jadwalRecords])

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

      {/* Top-level Tab Switcher (Pengaturan Jadwal vs Distribusi Jadwal) */}
      {canEdit && (
        <TooltipProvider>
          <div role="tablist" aria-label="Mode jadwal pelajaran" className="flex bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-1 border border-slate-200/80 dark:border-slate-800 rounded-2xl max-w-md shadow-xs shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeMainTab === "pengaturan"}
                    onClick={() => setActiveMainTab("pengaturan")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border select-none ${
                      activeMainTab === "pengaturan"
                        ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-900"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-transparent"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    Pengaturan Jadwal
                  </button>
                }
              />
              <TooltipPortal>
                <TooltipPositioner>
                  <TooltipPopup className="max-w-[240px] text-[10px]">
                    Konfigurasi durasi JP, jam mulai, dan susunan kegiatan per hari
                  </TooltipPopup>
                </TooltipPositioner>
              </TooltipPortal>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeMainTab === "distribusi"}
                    onClick={() => setActiveMainTab("distribusi")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border select-none ${
                      activeMainTab === "distribusi"
                        ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-900"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-transparent"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    Distribusi Jadwal
                  </button>
                }
              />
              <TooltipPortal>
                <TooltipPositioner>
                  <TooltipPopup className="max-w-[240px] text-[10px]">
                    Atur &amp; tinjau jadwal per rombel atau per guru
                  </TooltipPopup>
                </TooltipPositioner>
              </TooltipPortal>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {/* Pengaturan Jadwal inline panel (tab pengaturan) */}
      {activeMainTab === "pengaturan" && canEdit && (
        <PengaturanJadwalPanel onDone={() => setActiveMainTab("distribusi")} />
      )}

      {/* Distribusi Jadwal content (tab distribusi) */}
      {activeMainTab === "distribusi" && (
        <>
      {/* Premium selection panel */}
      <div className="bg-emerald-500/10 dark:bg-emerald-950/20 backdrop-blur-md border border-emerald-500/20 dark:border-emerald-900/50 text-slate-900 dark:text-slate-100 rounded-3xl p-6 lg:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0">
          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-300/80 dark:border-emerald-700/60 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isGuru ? "Jadwal Mengajar Anda" : isSiswa ? "Jadwal Belajar Kelas Anda" : adminFilterMode === "guru" ? "Cari Jadwal Guru" : "Panel Distribusi Jadwal"}
          </span>
          <h3 className="text-xl lg:text-2xl font-extrabold tracking-tight mt-3">
            {isGuru ? (
              <span>Tinjau Agenda: <span className="text-emerald-700 dark:text-emerald-400 font-black">{profile?.namaLengkap as string || "Guru"}</span></span>
            ) : isSiswa ? (
              <span>Jadwal Kelas: <span className="text-emerald-700 dark:text-emerald-400 font-black">{selectedKelasMain || "Pilih Rombel"}</span></span>
            ) : adminFilterMode === "guru" ? (
              <span>Jadwal Mengajar Guru: <span className="text-indigo-700 dark:text-indigo-400 font-black">{selectedTeacherObj?.namaLengkap || "Pilih Guru"}</span></span>
            ) : kelasId === "semua" ? (
              <span>Matriks Sekolah: <span className="text-emerald-700 dark:text-emerald-400 font-black">Semua Rombel</span></span>
            ) : (
              <span>Tinjau Mingguan: <span className="text-emerald-700 dark:text-emerald-400 font-black">{selectedKelasMain || "Pilih Rombel"}</span></span>
            )}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1.5 max-w-md font-medium">
            {isGuru
              ? "Tinjauan lengkap jam pelajaran mengajar Anda yang terdaftar secara resmi di sekolah."
              : isSiswa
                ? "Silakan cek jadwal kegiatan belajar mengajar kelas Anda secara lengkap."
                : adminFilterMode === "guru"
                  ? "Cari nama guru untuk menampilkan informasi jadwal mengajar lengkap di seluruh kelas."
                  : "Silakan filter rombel kelas dan pilih hari untuk melihat jadwal kegiatan belajar mengajar secara sistematis."}
          </p>
          {isSiswa && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 px-3 py-1.5 rounded-xl border border-teal-100 dark:border-teal-900 font-bold">
                <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="text-[11px]">
                  Wali Kelas:{" "}
                  <strong className="font-extrabold">
                    {(() => {
                      const cls = kelasRecords.find((k) => k.id === (profile?.kelasId as string))
                      if (!cls) return "Belum Ditentukan"
                      const wali = guruMap.get(cls.waliKelasId || "")
                      return wali?.namaLengkap || "Belum Ditentukan"
                    })()}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px]">
                  Tahun Ajaran:{" "}
                  <strong className="font-bold">
                    {tahunAjaranData?.namaTahunAjaran || "2025/2026"}{" "}
                    {tahunAjaranData?.semester ? `(${String(tahunAjaranData.semester).toUpperCase()})` : ""}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Class, Day & View Mode pickers */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
          {/* Admin filter mode toggle: Filter Rombel vs Cari Jadwal Guru */}
          {!isSiswa && !isGuru && (
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">Mode Filter</label>
              <div className="flex items-center bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-1.5 border border-slate-300/80 dark:border-slate-700 rounded-2xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => setAdminFilterMode("kelas")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    adminFilterMode === "kelas"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Filter Rombel
                </button>
                <button
                  type="button"
                  onClick={() => setAdminFilterMode("guru")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    adminFilterMode === "guru"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Cari Jadwal Guru
                </button>
              </div>
            </div>
          )}

          {/* Rombel picker (mode kelas) — hide for students and teachers */}
          {!isSiswa && !isGuru && adminFilterMode === "kelas" && (
            <div className="w-full sm:w-auto">
              <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">Rombel Kelas</label>
              <Select
                value={kelasId || "semua"}
                onValueChange={(v) => v && setManualKelasId(v)}
                options={[
                  { value: "semua", label: "Semua Kelas (Matriks)" },
                  ...kelasRecords.map((k) => ({ value: k.id, label: formatKelasLabel(k) })),
                ]}
              >
                 <SelectTrigger className="w-full sm:w-48 !h-10 !rounded-xl text-xs font-bold bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border-slate-300/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-emerald-500 !shadow-none !ring-0 !focus-visible:ring-0">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl !text-popover-foreground">
                  <SelectItem value="semua" label="Semua Kelas (Matriks)" className="!text-slate-800 dark:!text-slate-200 focus:!text-slate-900 dark:focus:!text-white focus:!bg-slate-100 dark:focus:!bg-slate-800">
                    Semua Kelas (Matriks)
                  </SelectItem>
                  {kelasRecords.map((k) => (
                    <SelectItem key={k.id} value={k.id} label={formatKelasLabel(k)} className="!text-slate-800 dark:!text-slate-200 focus:!text-slate-900 dark:focus:!text-white focus:!bg-slate-100 dark:focus:!bg-slate-800">
                      {formatKelasLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Teacher picker (mode guru) */}
          {!isSiswa && !isGuru && adminFilterMode === "guru" && (
            <div className="w-full sm:w-auto min-w-[220px] sm:min-w-[280px]">
              <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">Pilih / Cari Guru</label>
              <SearchableSelect
                options={guruRecords.map((t) => ({
                  value: t.id,
                  label: `${t.namaLengkap}${t.nipnuptk ? ` (${t.nipnuptk})` : ""}`,
                }))}
                value={selectedTeacherId || (selectedTeacherObj?.id ?? "")}
                onValueChange={(v) => v && setSelectedTeacherId(v)}
                placeholder="Cari Nama Guru / NIP..."
                searchPlaceholder="Cari nama / NIP guru..."
                contentClassName="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl !text-popover-foreground"
                className="w-full bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-300/80 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">Filter Hari</label>
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
              <SelectTrigger className="w-full sm:w-40 !h-10 !rounded-xl text-xs font-bold bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm border-slate-300/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-emerald-500 !shadow-none !ring-0 !focus-visible:ring-0">
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
            <label className="block text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Mode Tampilan</label>
            <div className="flex w-full sm:w-auto bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm p-1 border border-slate-300/70 dark:border-slate-700 rounded-2xl shadow-2xs">
              <button
                type="button"
                onClick={() => setScheduleViewMode("mingguan")}
                className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  scheduleViewMode === "mingguan"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold"
                }`}
              >
                Mingguan (PC Grid)
              </button>
              <button
                type="button"
                onClick={() => setScheduleViewMode("harian")}
                className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  scheduleViewMode === "harian"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold"
                }`}
              >
                Harian (Timeline)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Info Card — mode Cari Jadwal Guru (admin) */}
      {!isSiswa && !isGuru && adminFilterMode === "guru" && selectedTeacherObj && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 rounded-3xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5 animate-in fade-in duration-200">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black rounded-2xl flex items-center justify-center text-xl shadow-md uppercase shrink-0">
              {selectedTeacherObj.namaLengkap?.charAt(0) || "G"}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">{selectedTeacherObj.namaLengkap}</h4>
                {selectedTeacherObj.kategoriPegawai && (
                  <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold rounded-lg border border-indigo-100 dark:border-indigo-800">
                    {selectedTeacherObj.kategoriPegawai}
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-extrabold rounded-lg border border-amber-100 dark:border-amber-900">
                  Beban Mengajar: {teacherStats.totalJP} JP / Minggu
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                NIP/NUPTK: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedTeacherObj.nipnuptk || "-"}</span>
                {selectedTeacherObj.email && (
                  <>
                    {" "}&bull; Email: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedTeacherObj.email}</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rombel Mengajar:</span>
                {teacherStats.classesTaught.length > 0 ? (
                  teacherStats.classesTaught.map((clsName, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800 rounded-md text-[10px] font-extrabold">
                      {clsName}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic font-medium">Belum ada jadwal rombel</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mapel Diajar:</span>
                {teacherStats.subjectsTaught.length > 0 ? (
                  teacherStats.subjectsTaught.map((subjName, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-teal-50/80 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border border-teal-100 dark:border-teal-800 rounded-md text-[10px] font-extrabold">
                      {subjName}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic font-medium">Belum ada mapel dijadwalkan</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              onClick={() => { setCetakGuruId(selectedTeacherObj.id); setCetakOpen(true) }}
              className="flex items-center justify-center font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer !h-10 shadow-xs neumo-sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              <span>Cetak Jadwal Guru</span>
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions Bar - mengikuti prototipe: soft translucent buttons */}
      {(canEdit || canViewAll) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end gap-2.5 sm:gap-3 mb-6 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs">
          {canEdit && (
            <>
              <Button
                onClick={() => setAiGenerateOpen(true)}
                className="w-full lg:w-auto flex items-center justify-center font-black px-4 py-2.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-950 dark:text-indigo-200 dark:border-indigo-800/60 shadow-2xs rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer backdrop-blur-xs"
              >
                <Sparkles className="w-4 h-4 mr-2 text-indigo-700 dark:text-indigo-300 shrink-0" />
                <span>AI Auto-Generate</span>
              </Button>

              <Button
                onClick={() => setReviewOpen(true)}
                className="w-full lg:w-auto flex items-center justify-center font-black px-4 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-950 dark:text-amber-200 dark:border-amber-800/60 shadow-2xs rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer backdrop-blur-xs"
              >
                <BarChart2 className="w-4 h-4 mr-2 text-amber-700 dark:text-amber-300 shrink-0" />
                <span>Review & Analisis Jadwal</span>
              </Button>
            </>
          )}

          {canPublish && (
            <Button
              onClick={handlePublishSchedule}
              disabled={publishNotifMutation.isPending || publishJadwalMutation.isPending}
              className="w-full lg:w-auto flex items-center justify-center font-black px-4 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-950 dark:text-blue-200 dark:border-blue-800/60 shadow-2xs rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer backdrop-blur-xs"
              title={
                pengaturanData?.lastPublishedAt
                  ? "Kirim pembaruan jadwal"
                  : "Kirim pemberitahuan jadwal"
              }
            >
              <Bell className="w-4 h-4 mr-2 text-blue-700 dark:text-blue-300 shrink-0" />
              <span>
                {publishNotifMutation.isPending || publishJadwalMutation.isPending
                  ? "Mengirim..."
                  : pengaturanData?.lastPublishedAt
                    ? "Kirim Pembaruan"
                    : "Kirim Pemberitahuan"}
              </span>
            </Button>
          )}

          {canViewAll && (
            <ExportJadwalMenu
              onCetak={() => {
                if (adminFilterMode === "guru" && selectedTeacherId) {
                  setCetakGuruId(selectedTeacherId)
                } else {
                  setCetakGuruId(null)
                }
                setCetakOpen(true)
              }}
              disabled={!kelasId || !hasData}
              filterGuruId={adminFilterMode === "guru" ? selectedTeacherId : null}
              filterGuruNama={adminFilterMode === "guru" ? selectedTeacherObj?.namaLengkap : null}
            />
          )}

          {canEdit && (
            <Button
              onClick={() => { setResetMode("all"); setResetOpen(true) }}
              disabled={resetting}
              className="w-full lg:w-auto flex items-center justify-center font-black px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-950 dark:text-rose-200 dark:border-rose-800/60 shadow-2xs rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer backdrop-blur-xs"
            >
              <RotateCcw className="w-4 h-4 mr-2 text-rose-700 dark:text-rose-300 shrink-0" />
              <span>Reset Mapel / Jadwal</span>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 p-12 rounded-3xl text-center flex flex-col items-center justify-center shadow-sm">
          <Settings className="h-12 w-12 text-slate-350 mb-2" />
          <h4 className="text-sm font-black text-slate-850 uppercase tracking-wider">Timeline Jam Belum Dibuat</h4>
          <p className="text-xs text-slate-400 font-bold max-w-sm mt-1 uppercase">
            Silakan konfigurasikan template timeline jam pelajaran (JP) terlebih dahulu di tombol Pengaturan Jadwal.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Day selection tab buttons - mengikuti prototipe */}
          {(scheduleViewMode === "harian" || kelasId === "semua") && (
            <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl text-left space-y-2.5">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {kelasId === "semua" ? "Pilih Hari Matriks" : "Saring Hari (Klik hari untuk filter satu/beberapa hari secara fleksibel)"}
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth whitespace-nowrap">
                {kelasId !== "semua" && (
                  <button
                    type="button"
                    onClick={() => setSelectedDays([])}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      selectedDays.length === 0
                        ? "bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-100"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    Semua Hari
                  </button>
                )}
                {aktifDays.map((day) => {
                  const isSel = kelasId === "semua"
                    ? (selectedDays[0] || aktifDays[0] || "senin") === day
                    : selectedDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (kelasId === "semua") {
                          setSelectedDays([day])
                        } else {
                          if (selectedDays.includes(day)) {
                            setSelectedDays(selectedDays.filter((d) => d !== day))
                          } else {
                            setSelectedDays([day])
                          }
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        isSel
                          ? "bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-100"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {DAY_LABEL[day]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {kelasId === "semua" ? (
            /* ================= MATRIX VIEW (ALL CLASSES) ================= */
            <MatrixView
              day={selectedDays[0] || aktifDays[0] || "senin"}
              dayItems={timelineByDay.get(selectedDays[0] || aktifDays[0] || "senin") ?? []}
              kelasRecords={kelasRecords}
              jadwalRecords={jadwalRecords}
              mapelMap={mapelMap}
              guruMap={guruMap}
              canEdit={canEdit}
              onDragDropMove={handleDragDropMove}
            />
          ) : scheduleViewMode === "mingguan" ? (
            /* ================= WEEKLY GRID VIEW ================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
              {DAYS.filter((day) => {
                if (selectedDays.length > 0 && !selectedDays.includes(day)) return false
                if (isTeacherView) {
                  return jadwalRecords.some((e) => e.hari === day)
                }
                return true
              }).map((day) => {
                const dayItems = timelineByDay.get(day) ?? []
                const jpItems = dayItems.filter((t) => t.tipe === "jp")

                return (
                  <div key={day} className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 rounded-2xl shadow-sm p-5 w-full flex flex-col space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-1 border-b border-slate-150 dark:border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm flex-shrink-0" />
                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                          {DAY_LABEL[day]}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md flex-shrink-0">
                        KBM
                      </span>
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
                            // Non-JP Agenda Item - dashed card (mengikuti prototipe)
                            let Icon = Clock
                            let iconColor = "text-slate-500 bg-slate-50 dark:bg-slate-900"
                            let cardStyle = "bg-slate-50/50 border-slate-200/50 text-slate-700 dark:text-slate-300"

                            if (item.tipe === "upacara") {
                              Icon = Flag
                              iconColor = "text-amber-600 bg-amber-50 dark:bg-slate-900"
                              cardStyle = "bg-amber-50/40 border-amber-200/40 text-amber-900 dark:text-amber-300"
                            } else if (item.tipe === "pembiasaan") {
                              Icon = BookOpen
                              iconColor = "text-emerald-600 bg-emerald-50 dark:bg-slate-900"
                              cardStyle = "bg-emerald-50/40 border-emerald-200/40 text-emerald-900 dark:text-emerald-300"
                            } else if (item.tipe === "istirahat") {
                              Icon = Coffee
                              iconColor = "text-indigo-600 bg-indigo-50 dark:bg-slate-900"
                              cardStyle = "bg-indigo-50/40 border-indigo-200/40 text-indigo-900 dark:text-indigo-300"
                            } else if (item.tipe === "sholat") {
                              Icon = Sparkles
                              iconColor = "text-purple-600 bg-purple-50 dark:bg-slate-900"
                              cardStyle = "bg-purple-50/40 border-purple-200/40 text-purple-900 dark:text-purple-300"
                            }

                            return (
                              <div
                                key={item.id}
                                className={`p-3.5 rounded-xl border border-dashed flex flex-col justify-between gap-1.5 text-left ${cardStyle}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`p-2 rounded-lg shrink-0 ${iconColor}`}>
                                    <Icon size={14} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-black opacity-60 uppercase tracking-wider block">Agenda</span>
                                    <h5 className="text-xs font-black truncate leading-tight uppercase">
                                      {item.label || item.tipe}
                                    </h5>
                                  </div>
                                </div>
                                <div className="text-[11px] font-mono font-bold opacity-75 mt-1 text-right">
                                  {item.jamMulai} - {item.jamSelesai}
                                </div>
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
                              if (!isStart) return null

                              const mapel = mapelMap.get(entry.mataPelajaranId)
                              const teacher = guruMap.get(entry.guruId)
                              const kelas = kelasRecords.find((k) => k.id === entry.kelasId)

                              const startSlot = jpItems[entry.jpMulai! - 1]
                              const endSlot = jpItems[entry.jpMulai! - 1 + entry.jpCount! - 1]
                              const tStart = startSlot?.jamMulai || item.jamMulai
                              const tEnd = endSlot?.jamSelesai || item.jamSelesai

                              const color = getMapelColor(entry.mataPelajaranId)

                              return (
                                <div
                                  key={`jp-${item.id}`}
                                  className={`group relative p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50/40 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 border-l-4 ${color.border} rounded-xl transition-all flex flex-col justify-between text-left shadow-sm hover:shadow-md`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`${color.bg} ${color.text} border border-slate-100/40 dark:border-slate-800/60 rounded px-2 py-0.5 text-[10px] font-black tracking-wider uppercase flex items-center gap-1`}>
                                      <span>
                                        JP {entry.jpMulai}
                                        {entry.jpCount! > 1 ? `–${entry.jpMulai! + entry.jpCount! - 1}` : ""}
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-400">
                                      {tStart} - {tEnd}
                                    </span>
                                  </div>

                                  <div className="mt-2 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`px-1.5 py-0.5 ${color.bg} ${color.text} rounded text-[10px] font-mono font-black uppercase tracking-wider`}>
                                        {mapel?.kodeMapel || "MAPEL"}
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-500 truncate flex-1 block">
                                        {isTeacherView
                                          ? formatKelasLabel(kelas)
                                          : (teacher?.namaLengkap || "Guru")}
                                      </span>
                                    </div>
                                    <h5 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 mt-1.5 line-clamp-2 leading-snug uppercase">
                                      {mapel?.namaMapel || "—"}
                                    </h5>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between min-h-[32px]">
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {entry.jpCount! > 1 ? `${entry.jpCount} JP` : "1 JP"}
                                    </span>
                                    <div className="flex space-x-1.5">
                                      {canEdit && (
                                        <>
                                          <button
                                            onClick={() => openEdit(entry)}
                                            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 rounded-lg transition-all border border-transparent hover:border-teal-100 dark:hover:border-teal-800 cursor-pointer"
                                            title="Edit"
                                          >
                                            <Pencil size={11} />
                                          </button>
                                          <button
                                            onClick={() => setDeleteId(entry.id)}
                                            className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-800 cursor-pointer"
                                            title="Hapus"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            } else {
                              if (isTeacherView) return null

                              // Find other slots occupied by a teacher in this day/JP to check for clashes
                              const findTeacherOccupancy = (guruId: string, jpIndex: number) => {
                                return (allJadwalList ?? []).filter(
                                  (e) => e.hari === day && e.guruId === guruId && e.jpMulai !== null && e.jpCount !== null &&
                                         jpIndex >= e.jpMulai && jpIndex < e.jpMulai + e.jpCount
                                )
                              }

                              // Find teachers who teach this class at some point in the schedule, but are busy in another class during this day & JP
                              const classTeachers = Array.from(new Set(
                                (allJadwalList ?? [])
                                  .filter((e) => e.kelasId === kelasId)
                                  .map((e) => e.guruId)
                              ))

                              const busyTeachers = classTeachers
                                .map((guruId) => {
                                  const busyIn = findTeacherOccupancy(guruId, academicJp).filter((c) => c.kelasId !== kelasId)
                                  if (busyIn.length > 0) {
                                    const teacher = guruMap.get(guruId)
                                    const clNames = busyIn.map((c) => {
                                      const cl = kelasRecords.find((x) => x.id === c.kelasId)
                                      return cl ? cl.namaKelas : "Kelas Lain"
                                    })
                                    return `${teacher?.namaLengkap || "Guru"} (${clNames.join(", ")})`
                                  }
                                  return null
                                })
                                .filter(Boolean) as string[]

                              // Empty JP slot - dashed style (mengikuti prototipe)
                              return (
                                <div
                                  key={`jp-empty-${item.id}`}
                                  className="p-3.5 bg-slate-50/30 dark:bg-slate-900/40 hover:bg-teal-50/10 dark:hover:bg-teal-950/20 border border-dashed border-slate-200/80 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800 rounded-xl transition-all flex flex-col justify-between text-left group"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div>
                                      <span className="text-slate-400 text-[10px] font-black uppercase">JP {academicJp}</span>
                                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wide">
                                        Sesi Kosong
                                      </span>
                                    </div>
                                    {canEdit && (
                                      <button
                                        onClick={() => openAdd(day, academicJp)}
                                        className="p-1.5 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-600 hover:text-white text-teal-600 dark:text-teal-400 rounded-lg transition-all border border-teal-100/30 dark:border-teal-900/60 cursor-pointer"
                                        title="Isi Jadwal"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  <div className="text-[8px] text-slate-400 font-medium leading-tight border-t border-slate-200/50 dark:border-slate-800/50 pt-1.5 mt-1">
                                    {busyTeachers.length > 0 ? (
                                      <>
                                        <span className="font-bold text-slate-450 uppercase block mb-0.5 text-[7px] tracking-wide">Guru Sibuk:</span>
                                        {busyTeachers.map((t, idx) => (
                                          <span key={idx} className="block truncate text-slate-500">{t}</span>
                                        ))}
                                      </>
                                    ) : (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-[7px] uppercase tracking-wider">
                                        ✓ Guru Free
                                      </span>
                                    )}
                                  </div>
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
                  <div key={day} className="bg-white dark:bg-slate-900 border border-slate-100/80 dark:border-slate-800 rounded-3xl shadow-sm p-6 space-y-4">
                    <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-50 dark:border-slate-800">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm" />
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">{DAY_LABEL[day]}</h4>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md uppercase">
                        Hari KBM Aktif
                      </span>
                    </div>

                    <div className="relative border-l border-slate-100 dark:border-slate-800 pl-4 ml-2 space-y-4 text-left">
                      {dayItems.length === 0 ? (
                        <p className="text-xs text-slate-400 font-bold uppercase py-2">Tidak ada jadwal</p>
                      ) : (
                        dayItems.map((item) => {
                          if (item.tipe !== "jp") {
                            // Non-JP timeline item - dashed (mengikuti prototipe)
                            let Icon = Clock
                            let iconColor = "text-slate-500 bg-slate-100 dark:bg-slate-900"
                            let badgeStyle = "text-slate-850 bg-slate-50 dark:bg-slate-900 border-slate-200"

                            if (item.tipe === "upacara") {
                              Icon = Flag
                              iconColor = "text-amber-600 bg-amber-50 dark:bg-slate-900"
                              badgeStyle = "text-amber-900 bg-amber-50 dark:bg-slate-900 border-amber-200/50"
                            } else if (item.tipe === "pembiasaan") {
                              Icon = BookOpen
                              iconColor = "text-emerald-600 bg-emerald-50 dark:bg-slate-900"
                              badgeStyle = "text-emerald-900 bg-emerald-50 dark:bg-slate-900 border-emerald-200/50"
                            } else if (item.tipe === "istirahat") {
                              Icon = Coffee
                              iconColor = "text-indigo-600 bg-indigo-50 dark:bg-slate-900"
                              badgeStyle = "text-indigo-900 bg-indigo-50 dark:bg-slate-900 border-indigo-200/50"
                            } else if (item.tipe === "sholat") {
                              Icon = Sparkles
                              iconColor = "text-purple-600 bg-purple-50 dark:bg-slate-900"
                              badgeStyle = "text-purple-900 bg-purple-50 dark:bg-slate-900 border-purple-200/50"
                            }

                            return (
                              <div
                                key={item.id}
                                className="relative p-3.5 sm:p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-left"
                              >
                                <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white dark:border-slate-900" />
                                <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100/80 dark:border-slate-800">
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${iconColor}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block truncate">Agenda Khusus</span>
                                  </div>
                                  <div className={`inline-flex items-center h-7 px-2.5 rounded-lg border font-mono text-xs font-bold shrink-0 ${badgeStyle}`}>
                                    <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                                    <span>{item.jamMulai} - {item.jamSelesai}</span>
                                  </div>
                                </div>
                                <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 break-words">{item.label || item.tipe}</h5>
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
                              // Filled JP slot timeline item - mengikuti prototipe
                              <div
                                key={item.id}
                                className={`relative p-3 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 rounded-2xl border ${entry.jpMulai !== academicJp ? "border-teal-200/80 bg-teal-50/15 dark:bg-teal-950/20" : "border-slate-100 dark:border-slate-800"} transition-all text-left shadow-2xs`}
                              >
                                <div className={`absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${entry.jpMulai !== academicJp ? "bg-teal-400" : "bg-teal-500"}`} />
                                <div className="flex items-center justify-between gap-1.5 sm:gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-hidden">
                                    <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] sm:text-xs shrink-0 flex items-center gap-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-100/55 dark:border-teal-900/60`}>
                                      <span>JP {academicJp}</span>
                                      {entry.jpCount! > 1 && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-100/80 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 rounded font-bold">
                                          {academicJp - entry.jpMulai! + 1}/{entry.jpCount} JP
                                        </span>
                                      )}
                                    </span>
                                    {entry.jpMulai === academicJp && (
                                      <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-100/50 dark:border-teal-900/60 rounded-md text-[10px] font-mono font-black uppercase tracking-wider">
                                        {mapelMap.get(entry.mataPelajaranId)?.kodeMapel || "MAPEL"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="inline-flex items-center h-6 sm:h-7 px-2 sm:px-2.5 bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0">
                                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                                    <span>{item.jamMulai} - {item.jamSelesai}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 min-w-0">
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 tracking-tight leading-snug break-words uppercase">
                                      {mapelMap.get(entry.mataPelajaranId)?.namaMapel || "—"}
                                    </h5>
                                    <p className="text-xs font-bold text-slate-500 mt-0.5 break-words">
                                      {isTeacherView
                                        ? `Rombel: ${formatKelasLabel(kelasRecords.find((k) => k.id === entry.kelasId))}`
                                        : (guruMap.get(entry.guruId)?.namaLengkap || "—")}
                                    </p>
                                  </div>
                                  {entry.jpMulai === academicJp && canEdit && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={() => openEdit(entry)}
                                        className="h-8 w-8 inline-flex items-center justify-center bg-slate-100/80 dark:bg-slate-800 hover:bg-teal-500 hover:text-white text-slate-500 dark:text-slate-300 rounded-lg transition-all border border-slate-200/80 dark:border-slate-700 hover:border-teal-500 cursor-pointer shadow-2xs"
                                        title="Edit"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setDeleteId(entry.id)}
                                        className="h-8 w-8 inline-flex items-center justify-center bg-slate-100/80 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-500 dark:text-slate-300 rounded-lg transition-all border border-slate-200/80 dark:border-slate-700 hover:border-rose-500 cursor-pointer shadow-2xs"
                                        title="Hapus"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              // Empty JP slot timeline item - dashed (mengikuti prototipe)
                              <div
                                key={item.id}
                                className="relative p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-left"
                              >
                                <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-slate-300" />
                                <div className="flex items-center justify-between gap-1.5 sm:gap-2 pb-2 mb-2 border-b border-slate-100/80 dark:border-slate-800">
                                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                    <span className="px-2 py-0.5 rounded-lg font-bold text-[11px] sm:text-xs shrink-0 bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700">
                                      JP {academicJp}
                                    </span>
                                  </div>
                                  <div className="inline-flex items-center h-6 sm:h-7 px-2 sm:px-2.5 bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 rounded-lg text-[10px] sm:text-xs font-mono font-bold shrink-0">
                                    <Clock className="w-3 h-3 mr-1 text-slate-400" />
                                    <span>{item.jamMulai} - {item.jamSelesai}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 min-w-0">
                                  <div className="min-w-0 flex-1 text-left">
                                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                      {isTeacherView ? "Tidak Mengajar" : "Sesi Kosong"}
                                    </span>
                                    <span className="text-xs sm:text-sm font-semibold text-slate-400 block mt-0.5">
                                      {isTeacherView ? "Waktu luang / koordinasi" : "Dapat diisi jadwal pelajaran"}
                                    </span>
                                  </div>
                                  {canEdit && (
                                    <button
                                      onClick={() => openAdd(day, academicJp)}
                                      disabled={mapelRecords.length === 0}
                                      className="h-8 px-2.5 inline-flex items-center justify-center gap-1 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white rounded-lg transition-all border border-teal-200/80 dark:border-teal-900/60 cursor-pointer text-xs font-bold shrink-0"
                                      title="Isi Jadwal"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span className="text-xs">Tambah</span>
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
        </>
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
              setActiveMainTab("pengaturan")
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
          onClose={() => { setCetakOpen(false); setCetakGuruId(null) }}
          initialGuruId={cetakGuruId}
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

function MatrixView({
  day,
  dayItems,
  kelasRecords,
  jadwalRecords,
  mapelMap,
  guruMap,
  canEdit,
  onDragDropMove,
}: {
  day: string
  dayItems: TimelineRecord[]
  kelasRecords: KelasRecord[]
  jadwalRecords: JadwalRecord[]
  mapelMap: Map<string, MapelRecord>
  guruMap: Map<string, GuruRecord>
  canEdit: boolean
  onDragDropMove: (draggedId: string, targetKelasId: string, targetHari: string, targetJp: number) => Promise<void>
}) {
  const jpItems = dayItems.filter((t) => t.tipe === "jp")

  // Find other slots occupied by a teacher in this day/JP to check for clashes
  const findTeacherOccupancy = (guruId: string, jpIndex: number) => {
    return jadwalRecords.filter(
      (e) => e.hari === day && e.guruId === guruId && e.jpMulai !== null && e.jpCount !== null &&
             jpIndex >= e.jpMulai && jpIndex < e.jpMulai + e.jpCount
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100/80 dark:border-slate-800 overflow-x-auto shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-sm" />
        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
          Matriks Jadwal Hari {day.toUpperCase()} (Semua Rombel)
        </h4>
      </div>

      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
            <TableHead className="w-32 font-bold text-xs uppercase text-slate-400">Jam / JP</TableHead>
            {kelasRecords.map((k) => (
              <TableHead key={k.id} className="text-center font-black text-xs uppercase text-slate-700 dark:text-slate-205">
                {k.namaKelas}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dayItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={kelasRecords.length + 1} className="text-center py-12 text-slate-400 font-bold uppercase text-xs">
                Hari Libur / Tidak Ada Kegiatan Belajar Mengajar
              </TableCell>
            </TableRow>
          ) : (
            dayItems.map((item) => {
              if (item.tipe !== "jp") {
                // Render special row for agenda items like break/ceremony across all classes
                let bgStyle = "bg-slate-50/50 dark:bg-slate-900/30 text-slate-400"
                if (item.tipe === "istirahat") bgStyle = "bg-indigo-50/20 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400"
                if (item.tipe === "upacara") bgStyle = "bg-amber-50/20 dark:bg-amber-950/10 text-amber-600 dark:text-amber-400"

                return (
                  <TableRow key={item.id} className={`border-slate-100 dark:border-slate-800 ${bgStyle}`}>
                    <TableCell className="font-mono text-[10px] font-extrabold whitespace-nowrap">
                      {item.jamMulai} - {item.jamSelesai}
                    </TableCell>
                    <TableCell colSpan={kelasRecords.length} className="text-center font-black uppercase text-[10px] tracking-widest">
                      {item.label || item.tipe}
                    </TableCell>
                  </TableRow>
                )
              }

              // It's a JP slot
              const jpIndex = jpItems.findIndex((x) => x.id === item.id)
              const academicJp = jpIndex + 1

              return (
                <TableRow key={item.id} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                  <TableCell className="font-mono text-[10px] font-extrabold text-slate-500 whitespace-nowrap py-4">
                    <span className="block text-[8px] text-slate-450 uppercase">JP {academicJp}</span>
                    {item.jamMulai} - {item.jamSelesai}
                  </TableCell>

                  {kelasRecords.map((k) => {
                    const entries = jadwalRecords.filter(
                      (e) => e.kelasId === k.id && e.hari === day && e.jpMulai !== null && e.jpCount !== null
                    )
                    const entry = entries.find(
                      (e) => academicJp >= e.jpMulai! && academicJp < e.jpMulai! + e.jpCount!
                    )

                    if (!entry) {
                      // Find teachers who teach this class at some point in the schedule, but are busy in another class during this day & JP
                      const classTeachers = Array.from(new Set(
                        jadwalRecords
                          .filter((e) => e.kelasId === k.id)
                          .map((e) => e.guruId)
                      ))

                      const busyTeachers = classTeachers
                        .map((guruId) => {
                          const busyIn = findTeacherOccupancy(guruId, academicJp).filter((c) => c.kelasId !== k.id)
                          if (busyIn.length > 0) {
                            const teacher = guruMap.get(guruId)
                            const clNames = busyIn.map((c) => {
                              const cl = kelasRecords.find((x) => x.id === c.kelasId)
                              return cl ? cl.namaKelas : "Kelas Lain"
                            })
                            return `${teacher?.namaLengkap || "Guru"} (${clNames.join(", ")})`
                          }
                          return null
                        })
                        .filter(Boolean) as string[]

                      return (
                        <TableCell
                          key={k.id}
                          className="p-3 border border-dashed border-slate-100 dark:border-slate-800/60 bg-slate-50/10 dark:bg-slate-900/5 text-center transition-all hover:bg-slate-100/50 cursor-pointer"
                          onDragOver={(e) => {
                            if (canEdit) e.preventDefault()
                          }}
                          onDrop={async (e) => {
                            if (!canEdit) return
                            const draggedId = e.dataTransfer.getData("text/plain")
                            if (draggedId) {
                              await onDragDropMove(draggedId, k.id, day, academicJp)
                            }
                          }}
                        >
                          <span className="text-[10px] font-bold text-slate-350 uppercase tracking-wider block">Kosong</span>
                          {busyTeachers.length > 0 ? (
                             <div className="mt-1.5 text-[8px] text-slate-400 font-medium leading-tight">
                               <span className="font-bold text-slate-400/80 uppercase block mb-0.5 text-[7px] tracking-wide">Guru Sibuk:</span>
                               {busyTeachers.map((t, idx) => (
                                 <span key={idx} className="block truncate max-w-[125px] mx-auto text-slate-455">{t}</span>
                                ))}
                             </div>
                           ) : (
                             <span className="text-[7px] font-bold text-emerald-650 dark:text-emerald-400 block mt-1 uppercase tracking-wider">
                               ✓ Guru Free
                             </span>
                           )}
                        </TableCell>
                      )
                    }

                    if (academicJp > entry.jpMulai!) {
                      return null
                    }

                    const mapel = mapelMap.get(entry.mataPelajaranId)
                    const teacher = guruMap.get(entry.guruId)
                    
                    // Check if teacher is teaching in another class at the same time
                    const concurrentClasses = findTeacherOccupancy(entry.guruId, academicJp)
                      .filter((c) => c.kelasId !== k.id)
                      .map((c) => {
                        const cl = kelasRecords.find((x) => x.id === c.kelasId)
                        return cl ? cl.namaKelas : "Kelas Lain"
                      })

                    const hasClash = concurrentClasses.length > 0
                    const color = getMapelColor(entry.mataPelajaranId)

                     return (
                       <TableCell
                         key={k.id}
                         rowSpan={entry.jpCount ?? 1}
                         className={`p-3 text-center border-r border-b border-slate-100 dark:border-slate-800/50 ${hasClash ? "bg-rose-50/30 dark:bg-rose-950/15 border-l-4 border-l-rose-500" : `${color.bg} border-l-4 ${color.border}`} transition-all cursor-grab active:cursor-grabbing`}
                         onDragOver={(e) => {
                           if (canEdit) e.preventDefault()
                         }}
                         onDrop={async (e) => {
                           if (!canEdit) return
                           const draggedId = e.dataTransfer.getData("text/plain")
                           if (draggedId && draggedId !== entry.id) {
                             await onDragDropMove(draggedId, k.id, day, academicJp)
                           }
                         }}
                       >
                         <div
                           draggable={canEdit}
                           onDragStart={(e) => {
                             e.dataTransfer.setData("text/plain", entry.id)
                             e.dataTransfer.effectAllowed = "move"
                           }}
                           className="w-full h-full flex flex-col justify-center min-h-[48px]"
                         >
                           <span className={`px-1.5 py-0.5 ${color.bg} ${color.text} rounded text-[9px] font-mono font-black uppercase w-fit mx-auto`}>
                             {mapel?.kodeMapel || "MAPEL"}
                           </span>
                           <h6 className="text-[11px] font-black text-slate-800 dark:text-slate-200 mt-1 uppercase line-clamp-2">
                             {mapel?.namaMapel || "—"}
                           </h6>
                           <span className="text-[10px] text-slate-500 font-bold block mt-0.5 truncate max-w-[120px] mx-auto">
                             {teacher?.namaLengkap || "—"}
                           </span>
                           {hasClash && (
                             <span className="text-[8px] font-black text-rose-500 block mt-1 uppercase tracking-wider">
                               Bentrok: {concurrentClasses.join(", ")}
                             </span>
                           )}
                         </div>
                       </TableCell>
                     )

                  })}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

