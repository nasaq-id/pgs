"use client"

import { useState, useMemo, useEffect, type ReactElement } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import {
  Loader2,
  Sparkles,
  CalendarOff,
  UserX,
  CheckCircle2,
  X,
  Check,
  AlertTriangle,
  Eye,
  RotateCcw,
  Trash2,
  Search,
} from "lucide-react"
import { formatKelasLabel } from "./constants"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
  tahunAjaranId?: string | null
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

interface JadwalRecord {
  id: string
  kelasId: string
  mataPelajaranId: string
  guruId: string
  hari: string
  jpMulai: number | null
  jpCount: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  kelasRecords: KelasRecord[]
  mapelRecords: MapelRecord[]
  guruRecords: GuruRecord[]
  existingJadwal: JadwalRecord[]
}

const HARI_LIST = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
] as const

const MAPEL_COLORS = ["#0d9488", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981", "#f97316", "#3b82f6", "#14b8a6", "#a855f7", "#e11d48"]

function hashMapel(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h % MAPEL_COLORS.length
}

/** Tooltip seragam untuk tombol/field di dalam modal */
function Tip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipPortal>
        <TooltipPositioner>
          <TooltipPopup className="max-w-[220px] text-[10px]">{label}</TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  )
}

/** Replica client-side dari splitJP server (jadwal.ts) — dijaga identik. */
function splitJPClient(total: number): number[] {
  if (total <= 0) return []
  if (total <= 3) return [total]
  const nBlok = Math.ceil(total / 3)
  const base = Math.floor(total / nBlok)
  const sisa = total - base * nBlok
  const chunks: number[] = []
  for (let i = 0; i < nBlok; i++) chunks.push(base + (i < sisa ? 1 : 0))
  return chunks
}

/**
 * Replica client-side dari computePackableCapacity server (jadwal.ts):
 * DP exact bin-packing — kapasitas realistis (JP) yang bisa dikemas blok 1/2/3
 * ke dalam hari-hari dengan kapasitas slot tertentu.
 */
function computePackableCapacityClient(blockSizes: number[], dayCapacities: number[]): number {
  if (blockSizes.length === 0 || dayCapacities.length === 0) return 0
  const c1 = blockSizes.filter((b) => b === 1).length
  const c2 = blockSizes.filter((b) => b === 2).length
  const c3 = blockSizes.filter((b) => b === 3).length
  const caps = [...dayCapacities].sort((a, b) => b - a)

  const fillOptions = (cap: number): [number, number, number][] => {
    const opts: [number, number, number][] = []
    for (let x3 = 0; x3 * 3 <= cap; x3++) {
      for (let x2 = 0; x2 * 2 + x3 * 3 <= cap; x2++) {
        const remaining = cap - x3 * 3 - x2 * 2
        for (let x1 = 0; x1 <= Math.min(remaining, c1); x1++) opts.push([x1, x2, x3])
      }
    }
    return opts
  }

  const key = (a: number, b: number, c: number) => `${a}|${b}|${c}`
  const targetKey = key(c1, c2, c3)

  let frontier = new Set<string>([key(0, 0, 0)])
  const visited = new Set<string>(frontier)

  for (let day = 0; day < caps.length; day++) {
    const opts = fillOptions(caps[day] ?? caps[caps.length - 1] ?? 10)
    const next = new Set<string>()
    for (const f of frontier) {
      const [a1, a2, a3] = f.split("|").map(Number)
      for (const [x1, x2, x3] of opts) {
        if (a1 + x1 > c1 || a2 + x2 > c2 || a3 + x3 > c3) continue
        const nk = key(a1 + x1, a2 + x2, a3 + x3)
        if (nk === targetKey) return c1 + 2 * c2 + 3 * c3
        if (!visited.has(nk)) {
          visited.add(nk)
          next.add(nk)
        }
      }
    }
    frontier = next
    if (frontier.size === 0) break
  }

  let max = 0
  for (const f of visited) {
    const [a1, a2, a3] = f.split("|").map(Number)
    max = Math.max(max, a1 + 2 * a2 + 3 * a3)
  }
  return max
}

interface PreviewBlock {
  jpMulai: number
  jpCount: number
  mapelId: string
  mapelNama: string
  guruNama: string
}

interface PreviewEmptySlot {
  jp: number
  alasan: string | null
}

interface PreviewHari {
  hari: string
  blocks: PreviewBlock[]
  empty: PreviewEmptySlot[]
}

interface PreviewKelas {
  kelasId: string
  namaKelas: string
  bebanJP: number
  kapasitasJP: number
  kapasitasRealistisJP: number
  terpasangJP: number
  hari: PreviewHari[]
}

interface PreviewData {
  ok: boolean
  error: string | null
  totalJp: number
  perKelas: PreviewKelas[]
}

export default function AiGenerateDialog({
  open,
  onClose,
  kelasRecords,
  guruRecords,
}: Props) {
  const [targetKelasId, setTargetKelasId] = useState<string>("all")
  const [hariLibur, setHariLibur] = useState<string[]>(["sabtu"])
  const [customRequest, setCustomRequest] = useState<string>("")
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)

  // Teacher exception states matching reference ZIP structure
  const [teacherExceptions, setTeacherExceptions] = useState<Record<string, string[]>>({})
  const [teacherJPExceptions, setTeacherJPExceptions] = useState<Record<string, Record<string, number[]>>>({})
  const [selectedGuruIds, setSelectedGuruIds] = useState<string[]>([])
  const [activeGuruId, setActiveGuruId] = useState<string>("")
  const [activeTeacherDay, setActiveTeacherDay] = useState<string>("")
  const [guruSearch, setGuruSearch] = useState<string>("")
  const [guruSearchOpen, setGuruSearchOpen] = useState(false)

  // Progression States for terminal modal
  const [progressModalOpen, setProgressModalOpen] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0) // target dari server
  const [progressDisplay, setProgressDisplay] = useState(0) // nilai animasi (interpolasi)
  const [progressStatus, setProgressStatus] = useState<"processing" | "success" | "error">("processing")
  const [progressLogs, setProgressLogs] = useState<string[]>([])
  const [genStarted, setGenStarted] = useState(false)
  const [genInput, setGenInput] = useState<{
    kelasId?: string
    hariLibur: string[]
    constraints: ReturnType<typeof buildConstraints>
  } | null>(null)

  // Interpolasi halus: display meluncur menuju target (real dari server)
  useEffect(() => {
    if (!progressModalOpen) return
    const id = setInterval(() => {
      setProgressDisplay((prev) => {
        const target = progressPercent
        if (target === 100) return 100
        const next = prev + (target - prev) * 0.12
        return Math.min(next, Math.max(target - 1, prev + 0.2))
      })
    }, 80)
    return () => clearInterval(id)
  }, [progressModalOpen, progressPercent])

  // Fetch Plotting Pengajar (Pengampu)
  const { data: pengampuList, isLoading: isLoadingPengampu } = api.pengampu.getAll.useQuery(undefined, {
    enabled: open,
  })

  // Fetch Timeline items for max JP
  const { data: timelineList } = api.pengaturanJadwal.getTimeline.useQuery({}, {
    enabled: open,
  })

  // Fetch pengaturan for optimistic version
  const { data: pengaturan } = api.pengaturanJadwal.get.useQuery({}, {
    enabled: open,
  })

  // Fetch weekly holiday setting to prefill (still editable per generation)
  const { data: kaldikSetting } = api.pengaturanKalender.get.useQuery(undefined, {
    enabled: open,
  })

  const { data: draftSlots } = api.jadwal.previewBatch.useQuery({
    batchId: activeBatchId ?? ""
  }, {
    enabled: !!activeBatchId,
  })

  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const maxJpPerDay = useMemo(() => {
    const map = new Map<string, number>()
    if (!timelineList) return map
    for (const item of timelineList) {
      if (item.tipe === "jp") {
        map.set(item.hari, (map.get(item.hari) || 0) + 1)
      }
    }
    return map
  }, [timelineList])

  // Opsi "Tidak Bisa JP Ke" dinamis mengikuti jumlah slot JP di timeline (hari aktif)
  const jpOptions = useMemo(() => {
    const workDays = HARI_LIST.map((h) => h.value).filter((d) => !hariLibur.includes(d))
    const maxJp = Math.max(1, ...workDays.map((d) => maxJpPerDay.get(d) || 0))
    return Array.from({ length: maxJp }, (_, i) => i + 1)
  }, [maxJpPerDay, hariLibur])

  // Daftar guru terurut alfabetis untuk dropdown
  const sortedGuruRecords = useMemo(() => {
    return [...guruRecords].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap))
  }, [guruRecords])

  // Filter hasil pencarian nama guru
  const filteredGuruRecords = useMemo(() => {
    const q = guruSearch.trim().toLowerCase()
    if (!q) return sortedGuruRecords
    return sortedGuruRecords.filter((g) => g.namaLengkap.toLowerCase().includes(q))
  }, [sortedGuruRecords, guruSearch])

  // Guru terpilih (multi-select)
  const selectedGuruList = useMemo(
    () => sortedGuruRecords.filter((g) => selectedGuruIds.includes(g.id)),
    [sortedGuruRecords, selectedGuruIds]
  )

  // Guru yang sedang diedit ketersediaannya
  const activeGuru = useMemo(() => {
    if (activeGuruId && selectedGuruIds.includes(activeGuruId)) {
      return sortedGuruRecords.find((g) => g.id === activeGuruId) || null
    }
    return selectedGuruList[0] || null
  }, [sortedGuruRecords, selectedGuruIds, activeGuruId, selectedGuruList])

  // Ringkasan pembatasan per guru terpilih (untuk chip & hapus cepat)
  const configuredGuru = useMemo(() => {
    return selectedGuruList.map((g) => ({
      ...g,
      hariCount: (teacherExceptions[g.id] || []).length,
      jpCount: Object.values(teacherJPExceptions[g.id] || {}).reduce((acc, jps) => acc + jps.length, 0),
    }))
  }, [selectedGuruList, teacherExceptions, teacherJPExceptions])

  // Hari kerja aktif (hari libur sekolah tidak dihitung) untuk pemilihan JP per guru
  const activeWorkDays: string[] = useMemo(() => {
    return HARI_LIST.map((h) => h.value).filter((d) => !hariLibur.includes(d))
  }, [hariLibur])

  // Hari yang dipilih untuk mengatur JP guru aktif; fallback ke hari pertama yang sudah punya pembatasan JP
  const currentTeacherDay = useMemo(() => {
    const dayMap = activeGuru ? (teacherJPExceptions[activeGuru.id] || {}) : {}
    if (activeTeacherDay && activeWorkDays.includes(activeTeacherDay)) return activeTeacherDay
    const withExclusions = activeWorkDays.find((d) => (dayMap[d] || []).length > 0)
    return withExclusions || activeWorkDays[0] || ""
  }, [activeTeacherDay, activeWorkDays, activeGuru, teacherJPExceptions])

  const handleAddGuru = (guruId: string) => {
    setSelectedGuruIds((prev) => (prev.includes(guruId) ? prev : [...prev, guruId]))
    setActiveGuruId(guruId)
  }

  const handleRemoveGuru = (guruId: string) => {
    setSelectedGuruIds((prev) => prev.filter((id) => id !== guruId))
    setTeacherExceptions((prev) => {
      const next = { ...prev }
      delete next[guruId]
      return next
    })
    setTeacherJPExceptions((prev) => {
      const next = { ...prev }
      delete next[guruId]
      return next
    })
    setActiveGuruId((prev) => (prev === guruId ? "" : prev))
  }

  const handleClearTeacherExceptions = (guruId: string) => {
    setTeacherExceptions((prev) => {
      const next = { ...prev }
      delete next[guruId]
      return next
    })
    setTeacherJPExceptions((prev) => {
      const next = { ...prev }
      delete next[guruId]
      return next
    })
  }

  useEffect(() => {
    if (!open) return
    setTargetKelasId("all")
    const stored = kaldikSetting?.hariLiburMingguan
    setHariLibur(Array.isArray(stored) && stored.length > 0 ? (stored as string[]) : ["sabtu"])
    setCustomRequest("")
    setTeacherExceptions({})
    setTeacherJPExceptions({})
    setSelectedGuruIds([])
    setActiveGuruId("")
    setActiveTeacherDay("")
    setGuruSearch("")
    setGuruSearchOpen(false)
    setPreviewData(null)
    setPreviewError(null)
  }, [open, kaldikSetting])

  // Reset pemilihan hari saat berpindah guru aktif
  useEffect(() => {
    setActiveTeacherDay("")
  }, [activeGuruId])

  // Filter plotting pengajar based on selected target kelas
  const filteredPengampu = useMemo(() => {
    if (!pengampuList) return []
    if (targetKelasId === "all") return pengampuList
    return pengampuList.filter((p) => p.kelasId === targetKelasId)
  }, [pengampuList, targetKelasId])

  const totalBebanJP = useMemo(() => {
    return filteredPengampu.reduce((acc, p) => acc + (p.jumlahJam || 0), 0)
  }, [filteredPengampu])

  // Kapasitas slot mentah per minggu (hari aktif × slot JP per hari dari timeline)
  const kapasitasSlotMentah = useMemo(() => {
    let total = 0
    for (const h of HARI_LIST) {
      if (!hariLibur.includes(h.value)) total += maxJpPerDay.get(h.value) || 0
    }
    return total
  }, [maxJpPerDay, hariLibur])

  // Kapasitas realistis per minggu: DP bin-packing (identik dgn server).
  // Blok 3 JP hanya muat 9 JP/hari (3+3+3), blok 2 JP bisa 10 JP/hari.
  const kapasitasPerMinggu = useMemo(() => {
    const dayCaps = HARI_LIST.map((h) => h.value)
      .filter((d) => !hariLibur.includes(d))
      .map((d) => maxJpPerDay.get(d) || 0)
      .filter((c) => c > 0)
    if (dayCaps.length === 0) return 0

    if (targetKelasId !== "all") {
      const sizes: number[] = []
      for (const p of filteredPengampu) {
        for (const c of splitJPClient(p.jumlahJam || 0)) sizes.push(c)
      }
      return computePackableCapacityClient(sizes, dayCaps)
    }

    // Mode semua kelas: hitung per kelas, pakai kelas dengan beban terbesar
    // (konsisten dengan bebanCek yang memakai beban tertinggi per kelas).
    const per = new Map<string, number>()
    for (const p of pengampuList || []) {
      per.set(p.kelasId, (per.get(p.kelasId) || 0) + (p.jumlahJam || 0))
    }
    const maxBebanKelasId = [...per.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    if (!maxBebanKelasId) return 0
    const sizes: number[] = []
    for (const p of pengampuList || []) {
      if (p.kelasId === maxBebanKelasId) {
        for (const c of splitJPClient(p.jumlahJam || 0)) sizes.push(c)
      }
    }
    return computePackableCapacityClient(sizes, dayCaps)
  }, [pengampuList, filteredPengampu, targetKelasId, maxJpPerDay, hariLibur])

  // Beban terbesar per kelas (untuk mode "Semua Kelas" — server memvalidasi per kelas)
  const bebanTerbesarPerKelas = useMemo(() => {
    const per = new Map<string, number>()
    for (const p of pengampuList || []) {
      per.set(p.kelasId, (per.get(p.kelasId) || 0) + (p.jumlahJam || 0))
    }
    return Math.max(0, ...per.values())
  }, [pengampuList])

  const bebanCek = targetKelasId === "all" ? bebanTerbesarPerKelas : totalBebanJP
  const isOverload = bebanCek > kapasitasPerMinggu

  const utils = api.useUtils()
  const previewMutation = api.jadwal.previewGenerate.useMutation()

  const handleToggleHariLibur = (dayValue: string) => {
    if (hariLibur.includes(dayValue)) {
      setHariLibur(hariLibur.filter((d) => d !== dayValue))
    } else {
      setHariLibur([...hariLibur, dayValue])
    }
  }

  const handleToggleTeacherDay = (guruId: string, day: string) => {
    setTeacherExceptions((prev) => {
      const current = prev[guruId] || []
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day]
      return { ...prev, [guruId]: next }
    })
  }

  const handleToggleTeacherJP = (guruId: string, day: string, jpNum: number) => {
    setTeacherJPExceptions((prev) => {
      const dayMap = { ...(prev[guruId] || {}) }
      const current = dayMap[day] || []
      const next = current.includes(jpNum)
        ? current.filter((n) => n !== jpNum)
        : [...current, jpNum]
      dayMap[day] = next
      return { ...prev, [guruId]: dayMap }
    })
  }

  // Map the exceptions state to the server-compatible constraints list
  const buildConstraints = (): {
    guruId: string
    hari: "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"
    jpMulai: number
    jpSelesai: number
    isFullDay: boolean
  }[] => {
    const constraints: {
      guruId: string
      hari: "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"
      jpMulai: number
      jpSelesai: number
      isFullDay: boolean
    }[] = []

    // 1. Add day exclusions (full day off) — jpSelesai tinggi agar mencakup timeline berapa pun slotnya
    Object.entries(teacherExceptions).forEach(([guruId, days]) => {
      days.forEach((day) => {
        constraints.push({
          guruId,
          hari: day as any,
          jpMulai: 1,
          jpSelesai: 99,
          isFullDay: true,
        })
      })
    })

    // 2. Add JP exclusions per specific day
    Object.entries(teacherJPExceptions).forEach(([guruId, dayMap]) => {
      Object.entries(dayMap).forEach(([day, jps]) => {
        jps.forEach((jp) => {
          constraints.push({
            guruId,
            hari: day as any,
            jpMulai: jp,
            jpSelesai: jp,
            isFullDay: false,
          })
        })
      })
    })

    return constraints
  }

  const generateKelasMutation = api.jadwal.generateKelas.useMutation()
  const generateSekolahMutation = api.jadwal.generateSekolah.useMutation()
  const publishBatchMutation = api.jadwal.publishBatch.useMutation()
  const discardBatchMutation = api.jadwal.discardBatch.useMutation()

  const handlePreview = async () => {
    toast.info("Gunakan tombol 'Generate Otomatis' untuk menyusun draf jadwal, lalu tinjau hasilnya di layar konfirmasi.")
  }

  const handleGenerate = async () => {
    if (filteredPengampu.length === 0) {
      toast.error("Belum ada data Plotting Pengajar (Pengampu) di database untuk kelas yang dipilih.")
      return
    }

    if (isOverload) {
      toast.error(
        `Beban ${bebanCek} JP/minggu melebihi kapasitas realistis ${kapasitasPerMinggu} JP/minggu. Kurangi JP di Plotting Pengajar, tambah slot JP, atau kurangi hari libur.`
      )
      return
    }

    const constraints = buildConstraints()

    setProgressModalOpen(true)
    setProgressStatus("processing")
    setProgressPercent(10)
    setProgressDisplay(10)
    setProgressLogs([
      "[Sistem] Menginisialisasi AI Auto-Scheduler...",
      "[Sistem] Membaca data timeline & plotting pengajar...",
      ...(constraints.length > 0
        ? [`[Sistem] Menerapkan ${constraints.length} pembatasan ketersediaan guru...`]
        : []),
      "[Sistem] Menjalankan backtracking search dengan heuristic MRV...",
    ])

    try {
      const activeTahunAjaranId = kelasRecords[0]?.tahunAjaranId || undefined

      let res
      if (targetKelasId === "all") {
        setProgressLogs((prev) => [...prev, "[Sistem] Menyusun jadwal untuk semua kelas paralel..."])
        res = await generateSekolahMutation.mutateAsync({
          tahunAjaranId: activeTahunAjaranId,
          hariLibur: hariLibur,
          constraints,
        })
      } else {
        const targetKelasName = kelasRecords.find(k => k.id === targetKelasId)?.namaKelas || targetKelasId
        setProgressLogs((prev) => [...prev, `[Sistem] Menyusun jadwal khusus untuk kelas ${targetKelasName}...`])
        res = await generateKelasMutation.mutateAsync({
          kelasId: targetKelasId,
          tahunAjaranId: activeTahunAjaranId,
          hariLibur: hariLibur,
          constraints,
        })
      }

      if (res.success) {
        setProgressPercent(100)
        setProgressDisplay(100)
        setProgressStatus("success")
        setActiveBatchId(res.batchId)

        const skippedLogs = ((res as any).tanpaPlotting || []).map(
          (c: any) => `[Sistem] Lewati Rombel ${c.namaKelas}: Tidak ada data Plotting Pengajar.`
        )

        setProgressLogs((prev) => [
          ...prev,
          ...skippedLogs,
          `[Success] AI Auto-Scheduler berhasil menyusun draf jadwal pelajaran!`,
          `[Success] Draf disimpan sementara dalam Batch ID: ${res.batchId}`,
        ])
        toast.success("Draf jadwal berhasil disusun oleh AI!")
      } else {
        const errors = (res.gagal || []).map(g => `• Kelas ${g.kelasId}: ${g.error}`).join("\n")
        throw new Error(`Sebagian kelas gagal dijadwalkan:\n${errors}`)
      }
    } catch (err: any) {
      setProgressPercent(100)
      setProgressDisplay(100)
      setProgressStatus("error")
      setProgressLogs((prev) => [
        ...prev,
        `[Error] Gagal menyusun: ${err.message || String(err)}`,
      ])
      toast.error(err.message || "Gagal menyusun jadwal otomatis.")
    }
  }

  const handlePublish = async () => {
    if (!activeBatchId) return

    const unresolvedCount = draftSlots?.filter((s) => s.unresolved).length ?? 0
    if (unresolvedCount > 0 && !showPublishConfirm) {
      setShowPublishConfirm(true)
      return
    }

    setProgressStatus("processing")
    setProgressLogs((prev) => [...prev, "[Sistem] Menerbitkan draf jadwal ke database...", "[Sistem] Menghapus jadwal lama untuk kelas terpengaruh..."])
    try {
      const res = await publishBatchMutation.mutateAsync({
        batchId: activeBatchId,
        clientVersion: pengaturan?.version ?? 1
      })
      toast.success(`Jadwal pelajaran berhasil diterbitkan! (${res.kelasTerpengaruh} kelas diperbarui)`)
      utils.jadwal.getAll.invalidate()
      utils.jadwal.getTimelineWithJadwal.invalidate()
      utils.pengaturanJadwal.get.invalidate()
      setProgressModalOpen(false)
      setShowPublishConfirm(false)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Gagal menerbitkan jadwal.")
      setProgressStatus("success")
    }
  }

  const handleDiscard = async () => {
    if (!activeBatchId) return
    setProgressStatus("processing")
    setProgressLogs((prev) => [...prev, "[Sistem] Membatalkan draf jadwal...", "[Sistem] Menghapus entri draf dari database..."])
    try {
      await discardBatchMutation.mutateAsync({
        batchId: activeBatchId,
        clientVersion: pengaturan?.version
      })
      toast.info("Draf jadwal dibuang.")
      setProgressModalOpen(false)
      setActiveBatchId(null)
      setShowPublishConfirm(false)
    } catch (err: any) {
      toast.error(err.message || "Gagal membuang draf jadwal.")
      setProgressStatus("success")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 lg:p-8 text-left">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-800 dark:text-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              AI Auto-Scheduler
            </DialogTitle>
            <p className="text-xs text-slate-500 font-bold mt-1">
              Distribusi jadwal otomatis anti-bentrok, cerdas, dan efisien.
            </p>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Section 1: Target Rombel & Plotting Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border border-white/40 dark:border-slate-800/40 flex flex-col justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Target Kelas</Label>
                  <p className="text-[11px] text-muted-foreground">Pilih kelas yang akan di-generate jadwalnya</p>
                </div>
                <Select
                  value={targetKelasId}
                  onValueChange={(v) => setTargetKelasId(v || "all")}
                  options={[
                    { value: "all", label: `Semua Kelas (${kelasRecords.length} Rombel)` },
                    ...kelasRecords.map((k) => ({ value: k.id, label: formatKelasLabel(k) })),
                  ]}
                >
                  <Tip label="Pilih kelas yang akan di-generate jadwalnya">
                    <SelectTrigger className="mt-3 rounded-xl h-10">
                      <SelectValue placeholder="Pilih kelas..." />
                    </SelectTrigger>
                  </Tip>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Semua Kelas ({kelasRecords.length} Rombel)</SelectItem>
                      {kelasRecords.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {formatKelasLabel(k)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-2xl neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border border-white/40 dark:border-slate-800/40 flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-250">
                      {isLoadingPengampu ? "Memuat plotting..." : `${filteredPengampu.length} Plotting Pengajar`}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Beban Jam: <strong className="text-teal-600 font-extrabold">{totalBebanJP} JP/Minggu</strong>
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 bg-slate-200/40 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-250/30 text-center mt-3">
                  Diambil dari data Plotting Pengajar
                </div>
              </div>
            </div>

            {/* Kapasitas vs Beban */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isOverload
                  ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
                  : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50"
              }`}
            >
              {isOverload ? (
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div className="text-left space-y-1">
                <p className={`text-xs font-black uppercase tracking-wider ${isOverload ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {isOverload ? "Overload Deteksi — Generate Akan Dibatalkan" : "Kapasitas Jadwal Mencukupi"}
                </p>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Beban {bebanCek} JP/minggu vs kapasitas realistis {kapasitasPerMinggu} JP/minggu
                  {targetKelasId === "all" ? " (beban tertinggi per kelas)" : ""}.
                </p>
                {kapasitasSlotMentah > kapasitasPerMinggu && (
                  <p className="text-[10px] font-medium text-slate-400">
                    Slot mentah {kapasitasSlotMentah} JP — {kapasitasSlotMentah - kapasitasPerMinggu} slot tak bisa diisi blok 2-3 JP (mapel serba 3 JP → maks 9 JP/hari).
                  </p>
                )}
                {isOverload && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    Solusi: kurangi JP di Plotting Pengajar, tambah slot JP di Pengaturan Jadwal, atau kurangi hari libur yang dipilih.
                  </p>
                )}
                <p className="text-[10px] font-medium text-slate-400 pt-1">
                  Aturan: maksimal 3 JP per pertemuan — mapel 4+ JP otomatis dipecah merata ke hari berbeda (contoh: 4 JP → 2×2 JP, 5 JP → 3+2 JP).
                </p>
              </div>
            </div>

            {/* Section 2: Hari Libur Sekolah */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-amber-500" />
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Hari Libur Sekolah
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                AI tidak akan menjadwalkan mata pelajaran apa pun pada hari libur terpilih.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {HARI_LIST.map((h) => {
                  const isLibur = hariLibur.includes(h.value)
                  return (
                    <Tip key={h.value} label={isLibur ? "Jadikan hari masuk" : "Jadikan hari libur"}>
                      <button
                        type="button"
                        onClick={() => handleToggleHariLibur(h.value)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isLibur
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/50 shadow-sm"
                            : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-250 dark:border-emerald-900/50"
                        )}
                      >
                        <span>{h.label}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase bg-white/60 dark:bg-black/30">
                          {isLibur ? "Libur" : "Masuk"}
                        </span>
                      </button>
                    </Tip>
                  )
                })}
              </div>
            </div>

            {/* Section 3: Custom Constraints Instructions */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Instruksi Tambahan (Custom Request)
              </Label>
              <textarea
                placeholder="Contoh: Utamakan mata pelajaran eksakta di pagi hari, guru berhalangan mengajar tolong diposisikan di slot siang..."
                value={customRequest}
                onChange={(e) => setCustomRequest(e.target.value)}
                className="w-full px-4 py-3 neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/15 transition-all h-20 resize-none"
              />
            </div>

            {/* Section 4: Teacher Availability (dropdown per guru) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-indigo-500" />
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ketersediaan Mengajar & Pembatasan JP Guru
                </Label>
                {configuredGuru.length > 0 && (
                  <span className="ml-auto text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 px-2 py-0.5 rounded-lg">
                    {configuredGuru.length} Guru dipilih
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Opsional — diisi hanya ketika ada guru yang berhalangan atau request tidak bisa mengajar di hari dan jam (JP) tertentu.
              </p>

              <Tip label="Cari & pilih guru yang berhalangan (bisa lebih dari satu)">
                <button
                  type="button"
                  onClick={() => setGuruSearchOpen(true)}
                  className="w-full h-10 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 px-3.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/15"
                >
                  <span
                    className={`text-xs font-bold truncate ${
                      selectedGuruIds.length > 0
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {selectedGuruIds.length === 0
                      ? "Silahkan pilih guru terlebih dahulu"
                      : selectedGuruIds.length === 1
                        ? sortedGuruRecords.find((g) => g.id === selectedGuruIds[0])?.namaLengkap || ""
                        : `${selectedGuruIds.length} guru dipilih`}
                  </span>
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </Tip>

              {activeGuru ? (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 text-left shadow-inner space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                        {activeGuru.namaLengkap}
                      </span>
                    </div>
                    {(teacherExceptions[activeGuru.id]?.length || 0) > 0 ||
                    Object.values(teacherJPExceptions[activeGuru.id] || {}).some((jps) => jps.length > 0) ? (
                      <Tip label="Hapus semua pembatasan guru ini">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearTeacherExceptions(activeGuru.id)}
                          className="h-7 px-2 rounded-lg text-[10px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Bersihkan
                        </Button>
                      </Tip>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3 border-l-2 border-indigo-500">
                    {/* Day exceptions */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Hari Libur Guru:</span>
                      <div className="flex flex-wrap gap-1">
                        {HARI_LIST.map((h) => {
                          const isExcluded = (teacherExceptions[activeGuru.id] || []).includes(h.value)
                          return (
                            <Tip
                              key={h.value}
                              label={isExcluded ? "Boleh mengajar hari ini" : "Guru tidak bisa mengajar hari ini"}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleTeacherDay(activeGuru.id, h.value)}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all cursor-pointer ${
                                  isExcluded
                                    ? "bg-rose-50 border-rose-300 text-rose-700 font-black shadow-xs"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                                }`}
                              >
                                {h.label}
                              </button>
                            </Tip>
                          )
                        })}
                      </div>
                    </div>

                    {/* JP exceptions per day */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Pilih Hari (JP):</span>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {activeWorkDays.map((day) => {
                          const dayJPs = teacherJPExceptions[activeGuru.id]?.[day] || []
                          const isSelected = currentTeacherDay === day
                          return (
                            <Tip
                              key={day}
                              label={isSelected ? `Atur JP tidak bisa untuk ${day}` : `Pilih ${day} untuk mengatur JP`}
                            >
                              <button
                                type="button"
                                onClick={() => setActiveTeacherDay(day)}
                                className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-500 border-indigo-500 text-white font-black shadow-xs"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                                }`}
                              >
                                {HARI_LIST.find((h) => h.value === day)?.label}
                                {dayJPs.length > 0 && (
                                  <span className={`ml-1 ${isSelected ? "text-white/90" : "text-amber-600"}`}>
                                    ({dayJPs.length})
                                  </span>
                                )}
                              </button>
                            </Tip>
                          )
                        })}
                        {activeWorkDays.length === 0 && (
                          <span className="text-[9px] font-semibold text-slate-400">
                            Tidak ada hari kerja aktif (semua hari libur).
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Tidak Bisa JP Ke{currentTeacherDay ? ` (${HARI_LIST.find((h) => h.value === currentTeacherDay)?.label})` : ":"}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {currentTeacherDay &&
                          jpOptions.map((jpNum) => {
                            const isExcluded = (teacherJPExceptions[activeGuru.id]?.[currentTeacherDay] || []).includes(jpNum)
                            return (
                              <Tip
                                key={jpNum}
                                label={isExcluded ? "Boleh mengajar JP ini" : "Guru tidak bisa mengajar JP ini"}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleTeacherJP(activeGuru.id, currentTeacherDay, jpNum)}
                                  className={`w-5.5 h-5.5 rounded-md flex items-center justify-center text-[9px] font-bold border transition-all cursor-pointer ${
                                    isExcluded
                                      ? "bg-amber-50 border-amber-300 text-amber-700 font-black shadow-xs"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                                  }`}
                                >
                                  {jpNum}
                                </button>
                              </Tip>
                            )
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 p-4 text-[11px] font-semibold text-slate-400 text-center">
                  Silahkan pilih guru terlebih dahulu untuk mengatur ketersediaannya.
                </div>
              )}

              {configuredGuru.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 block">Guru terpilih:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {configuredGuru.map((g) => (
                      <Tip key={g.id} label="Klik untuk mengatur ketersediaan guru ini">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setActiveGuruId(g.id)}
                          onKeyDown={(e) => e.key === "Enter" && setActiveGuruId(g.id)}
                          className={`group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border cursor-pointer transition-colors ${
                            activeGuru?.id === g.id
                              ? "bg-indigo-100 dark:bg-indigo-900/60 border-indigo-300 dark:border-indigo-700"
                              : "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-900/50 hover:border-indigo-400"
                          }`}
                        >
                          <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">{g.namaLengkap}</span>
                          <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded-md">
                            {g.hariCount} hari · {g.jpCount} JP
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveGuru(g.id)
                            }}
                            className="p-1 rounded-md text-indigo-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Hapus guru dari pilihan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </Tip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
            <Tip label="Lihat hasil preview jadwal sebelum di-generate (dry-run)">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={filteredPengampu.length === 0 || previewLoading}
                className="rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                {previewLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview Jadwal
              </Button>
            </Tip>
            <Tip label="Tutup modal tanpa menyimpan">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                Batal
              </Button>
            </Tip>
            <Tip label="Mulai generate jadwal otomatis untuk kelas terpilih">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={filteredPengampu.length === 0 || isOverload}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl px-6 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Mulai Auto-Scheduler
              </Button>
            </Tip>
          </div>

          {/* ================= PREVIEW JADWAL (dry-run per kelas) ================= */}
          {(previewData || previewError || previewLoading) && (
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-500" />
                <Label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Preview Jadwal
                </Label>
                <span className="text-[10px] text-muted-foreground font-semibold ml-auto">
                  Preview identik dengan hasil generate (seeded)
                </span>
              </div>

              {previewLoading && (
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  Menyusun preview jadwal...
                </div>
              )}

              {previewError && (
                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  {previewError}
                </div>
              )}

              {previewData && previewData.ok && previewData.perKelas.length > 0 && (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {previewData.perKelas.map((kelas) => {
                    const kapReal = kelas.kapasitasRealistisJP || kelas.kapasitasJP
                    const sisa = kapReal - kelas.terpasangJP
                    const slotMentahTakTerpakai = Math.max(0, kelas.kapasitasJP - kapReal)
                    const jpMax = Math.max(
                      ...kelas.hari.map((h) => maxJpPerDay.get(h.hari) || 0),
                      ...kelas.hari.map((h) => h.blocks.reduce((m, b) => Math.max(m, b.jpMulai + b.jpCount - 1), 0)),
                      1
                    )
                    return (
                      <div key={kelas.kelasId} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100">{kelas.namaKelas}</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase",
                              sisa === 0
                                ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                            )}>
                              {kelas.terpasangJP}/{kapReal} JP terpasang
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            Beban {kelas.bebanJP} JP · Sisa {sisa} slot
                            {slotMentahTakTerpakai > 0 ? ` · ${slotMentahTakTerpakai} slot mentah tak terisi blok 2-3 JP` : ""}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <div className="min-w-[560px] space-y-1.5">
                            {kelas.hari.map((h) => (
                              <div key={h.hari} className="grid items-center gap-1.5" style={{ gridTemplateColumns: `70px repeat(${Math.max(jpMax, 1)}, minmax(0, 1fr))` }}>
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{h.hari}</span>
                                {Array.from({ length: Math.max(jpMax, 1) }, (_, i) => {
                                  const jp = i + 1
                                  const dayJpCount = Math.max(maxJpPerDay.get(h.hari) || 0, 1)

                                  // Slot di luar kapasitas hari ini (hari pendek): placeholder halus
                                  if (jp > dayJpCount) {
                                    return (
                                      <div
                                        key={jp}
                                        className="h-9 rounded-lg bg-slate-100/60 dark:bg-slate-900/30 border border-transparent flex items-center justify-center text-[8px] font-bold text-slate-200 dark:text-slate-700"
                                        style={{ gridColumn: String(jp) }}
                                      >
                                        –
                                      </div>
                                    )
                                  }

                                  const block = h.blocks.find((b) => jp >= b.jpMulai && jp < b.jpMulai + b.jpCount)
                                  const empty = h.empty.find((e) => e.jp === jp)

                                  if (block) {
                                    // Blok digambar sekali di posisi awal dengan span; sel kontinuasi dilewati
                                    if (block.jpMulai !== jp) return null
                                    return (
                                      <div
                                        key={jp}
                                        className="h-9 rounded-lg flex flex-col items-center justify-center overflow-hidden px-1 text-white shadow-sm"
                                        style={{ gridColumn: `${jp} / span ${block.jpCount}`, backgroundColor: MAPEL_COLORS[hashMapel(block.mapelId)] }}
                                      >
                                        <span className="text-[8.5px] font-black leading-tight truncate w-full text-center">{block.mapelNama}</span>
                                        <span className="text-[7.5px] font-semibold leading-tight opacity-90 truncate w-full text-center">{block.guruNama}</span>
                                      </div>
                                    )
                                  }

                                  if (empty) {
                                    const cell = (
                                      <div key={jp} className="h-9 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-background flex items-center justify-center text-[8px] font-bold text-slate-300 dark:text-slate-600" style={{ gridColumn: String(jp) }}>
                                        JP{jp}
                                      </div>
                                    )
                                    if (empty.alasan) {
                                      return (
                                        <Tooltip key={jp}>
                                          <TooltipTrigger render={cell} />
                                          <TooltipPortal>
                                            <TooltipPositioner>
                                              <TooltipPopup className="max-w-[220px] text-[10px]">{empty.alasan}</TooltipPopup>
                                            </TooltipPositioner>
                                          </TooltipPortal>
                                        </Tooltip>
                                      )
                                    }
                                    return cell
                                  }

                                  return null
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {previewData && previewData.ok && previewData.perKelas.length === 0 && (
                <p className="text-xs font-semibold text-slate-500 py-4 text-center">
                  Tidak ada kelas yang dapat dipreview.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= SEARCH GURU (batch select) ================= */}
      <Dialog open={guruSearchOpen} onOpenChange={(v) => !v && setGuruSearchOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden" showCloseButton={false}>
          <span className="sr-only">Cari & pilih guru</span>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={guruSearch}
              onChange={(e) => setGuruSearch(e.target.value)}
              placeholder="Cari nama guru..."
              className="flex-1 h-9 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
            />
            {guruSearch && (
              <button
                type="button"
                onClick={() => setGuruSearch("")}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
            {filteredGuruRecords.map((g) => {
              const isSelected = selectedGuruIds.includes(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => (isSelected ? handleRemoveGuru(g.id) : handleAddGuru(g.id))}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold transition-colors cursor-pointer",
                    isSelected
                      ? "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-slate-300 dark:border-slate-600"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                  <span className="flex-1 truncate">{g.namaLengkap}</span>
                  {isSelected && (
                    <span className="text-[9px] font-extrabold text-teal-500 uppercase">Terpilih</span>
                  )}
                </button>
              )
            })}
            {filteredGuruRecords.length === 0 && (
              <p className="px-3 py-6 text-center text-xs font-semibold text-slate-400">
                Guru tidak ditemukan
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500">
              {selectedGuruIds.length} guru dipilih
            </span>
            <Button
              type="button"
              onClick={() => setGuruSearchOpen(false)}
              className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black cursor-pointer"
            >
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= AI PROGRESS & LOGS DIALOG (Matching ZIP visual design) ================= */}
      <Dialog open={progressModalOpen} onOpenChange={(v) => !v && progressStatus !== "processing" && setProgressModalOpen(false)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 lg:p-8 text-center border-0 shadow-2xl">
          {progressStatus === "processing" && (
            <div className="flex flex-col items-center py-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-200/50 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-5 bg-indigo-50 text-indigo-600 rounded-full">
                  <Sparkles className="w-10 h-10 animate-pulse" />
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Menyusun Jadwal Cerdas AI
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-2 max-w-sm">
                Harap tunggu, asisten AI sedang mendistribusikan jadwal pelajaran, mencocokkan rombel kelas, dan ketersediaan waktu mengajar guru secara real-time.
              </p>

              {/* Progress bar */}
              <div className="w-full mt-6">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative shadow-inner">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                    style={{ width: `${progressDisplay}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-2">
                  <span>Proses Komputasi</span>
                  <span>{Math.round(progressDisplay)}%</span>
                </div>
              </div>

              {/* Logs terminal box */}
              <div className="w-full mt-6 text-left">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Log Komputasi AI:
                </span>
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-slate-350 space-y-2 max-h-40 overflow-y-auto leading-relaxed shadow-inner border border-slate-800">
                  {progressLogs.map((log, idx) => {
                    let logClass = "text-indigo-300"
                    if (log.startsWith("[Success]")) logClass = "text-emerald-400 font-extrabold"
                    else if (log.startsWith("[Error]")) logClass = "text-rose-400 font-extrabold"
                    else if (log.startsWith("[Sistem]")) logClass = "text-slate-400"
                    return (
                      <div key={idx} className={logClass}>
                        {log}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {progressStatus === "success" && (
            <div className="flex flex-col items-center py-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-100/50 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-5 bg-emerald-50 text-emerald-600 rounded-full shadow-lg shadow-emerald-100/50">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Jadwal Draf Berhasil Digenerate!
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-2 max-w-sm text-center">
                Hasil draf jadwal pelajaran sementara disimpan di server. Apakah Anda ingin mempublikasikan draf ini atau membatalkannya?
              </p>

              {showPublishConfirm && (
                <div className="w-full mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black uppercase text-[10px] tracking-wider mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Perhatian: Publish Gating
                  </div>
                  Terdapat <strong className="text-rose-600">{draftSlots?.filter(s => s.unresolved).length} slot</strong> yang memiliki konflik atau belum terselesaikan secara otomatis oleh solver. Guru atau ruang kelas mungkin bentrok pada jam tersebut. Apakah Anda tetap ingin menerbitkan jadwal?
                </div>
              )}

              <div className="w-full mt-6 text-left">
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 leading-relaxed border border-slate-800 shadow-inner">
                  <div className="text-emerald-400 font-extrabold">[Success] Penyusunan jadwal draf berhasil difinalisasi!</div>
                  <div className="text-slate-400">[Sistem] Seluruh JP mata pelajaran sukses dipetakan.</div>
                </div>
              </div>

              <div className="flex gap-3 w-full mt-8">
                <Button
                  variant="outline"
                  onClick={handleDiscard}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold uppercase cursor-pointer text-rose-600 border-rose-200 hover:bg-rose-50"
                  disabled={publishBatchMutation.isPending || discardBatchMutation.isPending}
                >
                  {showPublishConfirm ? "Batal (Discard)" : "Discard (Batal)"}
                </Button>
                <Button
                  onClick={handlePublish}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest cursor-pointer shadow-lg"
                  disabled={publishBatchMutation.isPending || discardBatchMutation.isPending}
                >
                  {publishBatchMutation.isPending ? "Publishing..." : showPublishConfirm ? "Ya, Tetap Publish" : "Publish (Simpan)"}
                </Button>
              </div>
            </div>
          )}

          {progressStatus === "error" && (
            <div className="flex flex-col items-center py-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-rose-100/50 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-5 bg-rose-50 text-rose-600 rounded-full shadow-lg shadow-rose-100/50">
                  <AlertTriangle className="w-10 h-10 stroke-[3]" />
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 tracking-tight font-extrabold">
                Penyusunan Jadwal Gagal
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-2 max-w-sm">
                Mesin asisten AI mengalami kendala dalam mendistribusikan jam pelajaran berdasarkan aturan atau pantangan yang diatur.
              </p>

              <div className="w-full mt-6 text-left">
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-rose-400 space-y-1.5 leading-relaxed border border-slate-800 shadow-inner max-h-40 overflow-y-auto">
                  {progressLogs.filter((log) => log.startsWith("[Error]")).map((log, idx) => (
                    <div key={idx} className="font-extrabold">{log}</div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 w-full mt-8">
                <Button
                  variant="outline"
                  onClick={() => setProgressModalOpen(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold uppercase cursor-pointer"
                >
                  Ubah Aturan
                </Button>
                <Button
                  onClick={handleGenerate}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest cursor-pointer shadow-lg"
                >
                  Coba Lagi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
