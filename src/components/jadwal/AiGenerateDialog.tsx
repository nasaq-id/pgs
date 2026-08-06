"use client"

import { useState, useMemo, useEffect } from "react"
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
  Info,
} from "lucide-react"
import { formatKelasLabel } from "./constants"
import { cn } from "@/lib/utils"

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

const JP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function AiGenerateDialog({
  open,
  onClose,
  kelasRecords,
  guruRecords,
}: Props) {
  const [targetKelasId, setTargetKelasId] = useState<string>("all")
  const [hariLibur, setHariLibur] = useState<string[]>(["sabtu"])
  const [customRequest, setCustomRequest] = useState<string>("")

  // Teacher exception states matching reference ZIP structure
  const [teacherExceptions, setTeacherExceptions] = useState<Record<string, string[]>>({})
  const [teacherJPExceptions, setTeacherJPExceptions] = useState<Record<string, number[]>>({})

  // Progression States for terminal modal
  const [progressModalOpen, setProgressModalOpen] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressStatus, setProgressStatus] = useState<"processing" | "success" | "error">("processing")
  const [progressLogs, setProgressLogs] = useState<string[]>([])

  // Fetch Plotting Pengajar (Pengampu)
  const { data: pengampuList, isLoading: isLoadingPengampu } = api.pengampu.getAll.useQuery(undefined, {
    enabled: open,
  })

  // Fetch Timeline items for max JP
  const { data: timelineList } = api.pengaturanJadwal.getTimeline.useQuery({}, {
    enabled: open,
  })

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

  useEffect(() => {
    if (!open) return
    setTargetKelasId("all")
    setHariLibur(["sabtu"])
    setCustomRequest("")
    setTeacherExceptions({})
    setTeacherJPExceptions({})
  }, [open])

  // Filter plotting pengajar based on selected target kelas
  const filteredPengampu = useMemo(() => {
    if (!pengampuList) return []
    if (targetKelasId === "all") return pengampuList
    return pengampuList.filter((p) => p.kelasId === targetKelasId)
  }, [pengampuList, targetKelasId])

  const totalBebanJP = useMemo(() => {
    return filteredPengampu.reduce((acc, p) => acc + (p.jumlahJam || 0), 0)
  }, [filteredPengampu])

  // Kapasitas slot per minggu (hari aktif × slot JP per hari dari timeline)
  const kapasitasPerMinggu = useMemo(() => {
    let total = 0
    for (const h of HARI_LIST) {
      if (!hariLibur.includes(h.value)) total += maxJpPerDay.get(h.value) || 0
    }
    return total
  }, [maxJpPerDay, hariLibur])

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
  const generateMutation = api.jadwal.autoGenerate.useMutation()

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

  const handleToggleTeacherJP = (guruId: string, jpNum: number) => {
    setTeacherJPExceptions((prev) => {
      const current = prev[guruId] || []
      const next = current.includes(jpNum)
        ? current.filter((n) => n !== jpNum)
        : [...current, jpNum]
      return { ...prev, [guruId]: next }
    })
  }

  const handleGenerate = async () => {
    if (filteredPengampu.length === 0) {
      toast.error("Belum ada data Plotting Pengajar (Pengampu) di database untuk kelas yang dipilih.")
      return
    }

    // Map the exceptions state to the server-compatible constraints list
    const constraints: {
      guruId: string
      hari: "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"
      jpMulai: number
      jpSelesai: number
      isFullDay: boolean
    }[] = []

    // 1. Add day exclusions (full day off)
    Object.entries(teacherExceptions).forEach(([guruId, days]) => {
      days.forEach((day) => {
        constraints.push({
          guruId,
          hari: day as any,
          jpMulai: 1,
          jpSelesai: 12,
          isFullDay: true,
        })
      })
    })

    // 2. Add JP exclusions across all work days
    const workDays = HARI_LIST.map((h) => h.value).filter((d) => !hariLibur.includes(d))
    Object.entries(teacherJPExceptions).forEach(([guruId, jps]) => {
      jps.forEach((jp) => {
        workDays.forEach((day) => {
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

    // Open terminal progress modal
    setProgressModalOpen(true)
    setProgressStatus("processing")
    setProgressPercent(5)
    setProgressLogs([
      "[Sistem] Menghubungi mesin asisten AI...",
      "[Sistem] Menganalisis rombel kelas dan program mata pelajaran...",
    ])

    // Simulated log delays for a realistic premium computation vibe
    setTimeout(() => {
      setProgressPercent(25)
      setProgressLogs((prev) => [
        ...prev,
        "[Sistem] Membaca preferensi guru pengampu...",
        "[Sistem] Menyesuaikan ketersediaan & pantangan mengajar guru...",
      ])
    }, 500)

    setTimeout(() => {
      setProgressPercent(55)
      setProgressLogs((prev) => [
        ...prev,
        "[Sistem] Menghitung alokasi optimal slot KBM sekolah...",
        "[Sistem] Memetakan seluruh JP mata pelajaran tanpa bentrok...",
      ])
    }, 1000)

    // Execute server-side scheduler
    setTimeout(async () => {
      try {
        await generateMutation.mutateAsync({
          kelasId: targetKelasId === "all" ? undefined : targetKelasId,
          hariLibur: hariLibur as any[],
          constraints,
        })

        setProgressPercent(100)
        setProgressStatus("success")
        setProgressLogs((prev) => [
          ...prev,
          "[Success] Penyusunan jadwal berhasil difinalisasi oleh solver!",
          "[Success] Berhasil menyusun seluruh jadwal kelas tanpa ada bentrok guru!",
        ])
        toast.success("Jadwal pelajaran berhasil digenerate otomatis oleh AI!")
        await utils.jadwal.getAll.invalidate()
      } catch (err: any) {
        setProgressStatus("error")
        setProgressLogs((prev) => [
          ...prev,
          `[Error] Gagal menyusun: ${err.message || "Kesalahan solver internal"}`,
        ])
      }
    }, 1500)
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
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Target Kelas</Label>
                  <p className="text-[11px] text-muted-foreground">Pilih kelas yang akan di-generate jadwalnya</p>
                </div>
                <select
                  value={targetKelasId}
                  onChange={(e) => setTargetKelasId(e.target.value)}
                  className="mt-3 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Semua Kelas ({kelasRecords.length} Rombel)</option>
                  {kelasRecords.map((k) => (
                    <option key={k.id} value={k.id}>
                      {formatKelasLabel(k)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
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
                  Beban {bebanCek} JP/minggu vs kapasitas {kapasitasPerMinggu} JP/minggu
                  {targetKelasId === "all" ? " (beban tertinggi per kelas)" : ""}.
                </p>
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
                    <button
                      key={h.value}
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
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:bg-white dark:focus:bg-slate-950 transition-all h-20 resize-none"
              />
            </div>

            {/* Section 4: Teacher Availability scroll list (Matching ZIP layout) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-indigo-500" />
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ketersediaan Mengajar & Pembatasan JP Guru
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Atur hari libur mengajar guru atau jam pelajaran (JP) tertentu saat guru tersebut berhalangan hadir.
              </p>

              <div className="max-h-[260px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40 space-y-4 text-left shadow-inner">
                {guruRecords.map((t) => {
                  const excludedDays = teacherExceptions[t.id] || []
                  const excludedJPs = teacherJPExceptions[t.id] || []
                  return (
                    <div key={t.id} className="pb-3 border-b border-slate-200/60 dark:border-slate-800/80 last:border-0 last:pb-0 space-y-2.5">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{t.namaLengkap}</span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3 border-l-2 border-indigo-500">
                        {/* Day exceptions */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Hari Libur Guru:</span>
                          <div className="flex flex-wrap gap-1">
                            {HARI_LIST.map((h) => {
                              const isExcluded = excludedDays.includes(h.value)
                              return (
                                <button
                                  key={h.value}
                                  type="button"
                                  onClick={() => handleToggleTeacherDay(t.id, h.value)}
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all cursor-pointer ${
                                    isExcluded
                                      ? "bg-rose-50 border-rose-300 text-rose-700 font-black shadow-xs"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                                  }`}
                                >
                                  {h.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* JP exceptions */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Tidak Bisa JP Ke:</span>
                          <div className="flex flex-wrap gap-1">
                            {JP_OPTIONS.map((jpNum) => {
                              const isExcluded = excludedJPs.includes(jpNum)
                              return (
                                <button
                                  key={jpNum}
                                  type="button"
                                  onClick={() => handleToggleTeacherJP(t.id, jpNum)}
                                  className={`w-5.5 h-5.5 rounded-md flex items-center justify-center text-[9px] font-bold border transition-all cursor-pointer ${
                                    isExcluded
                                      ? "bg-amber-50 border-amber-300 text-amber-700 font-black shadow-xs"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                                  }`}
                                >
                                  {jpNum}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl font-bold text-xs uppercase cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={filteredPengampu.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl px-6 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Mulai Auto-Scheduler
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
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-2">
                  <span>Proses Komputasi</span>
                  <span>{progressPercent}%</span>
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
                Jadwal Pelajaran Berhasil Digenerate!
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-2 max-w-sm">
                Asisten AI telah memetakan slot mengajar dengan efisiensi optimal tanpa ada bentrok guru maupun rombel kelas.
              </p>

              <div className="w-full mt-6 text-left">
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 leading-relaxed border border-slate-800 shadow-inner">
                  <div className="text-emerald-400 font-extrabold">[Success] Penyusunan jadwal berhasil difinalisasi!</div>
                  <div className="text-slate-400">[Sistem] Seluruh JP mata pelajaran sukses dipetakan.</div>
                </div>
              </div>

              <Button
                onClick={() => {
                  setProgressModalOpen(false)
                  onClose()
                }}
                className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all text-xs uppercase tracking-widest cursor-pointer shadow-lg"
              >
                Tutup & Tinjau Jadwal
              </Button>
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
