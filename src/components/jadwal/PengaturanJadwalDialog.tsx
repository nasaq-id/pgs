"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Plus, Trash2, Copy, Clock, BookOpen, Flag, Coffee, Sparkles, ChevronDown, Settings, Sliders, CalendarDays, Info, RotateCcw } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { timeToMinutes, minutesToTime } from "./constants"
import { toast } from "sonner"

const ALL_DAYS = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
]

interface TimelineFormData {
  id?: string
  pengaturanJadwalId?: string
  hari: string
  tipe: string
  label: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
  warna?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
}

const TIPE_ICONS: Record<string, React.ElementType> = {
  jp: Clock,
  pembiasaan: BookOpen,
  upacara: Flag,
  istirahat: Coffee,
  sholat: Sparkles,
  lainnya: Clock,
}

const TIPE_LABELS: Record<string, string> = {
  jp: "JP",
  pembiasaan: "Pembiasaan",
  upacara: "Upacara",
  istirahat: "Istirahat",
  sholat: "Sholat",
  lainnya: "Lainnya",
}

const TIPE_COLORS: Record<string, string> = {
  jp: "border-l-[hsl(142_72%_40%)]",
  upacara: "border-l-amber-500",
  istirahat: "border-l-blue-400",
  sholat: "border-l-purple-400",
  pembiasaan: "border-l-emerald-400",
  lainnya: "border-l-gray-400",
}

export default function PengaturanJadwalDialog({ open, onClose }: Props) {
  const utils = api.useUtils()

  const { data: pengaturan, isLoading: loadPengaturan } = api.pengaturanJadwal.get.useQuery(
    {},
    { enabled: open }
  )

  const upsertPengaturan = api.pengaturanJadwal.upsert.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.get.invalidate()
      utils.pengaturanJadwal.getTimeline.invalidate()
    },
  })

  const { data: timelineList, isLoading: loadTimeline } = api.pengaturanJadwal.getTimeline.useQuery(
    {},
    { enabled: open }
  )

  const upsertTimeline = api.pengaturanJadwal.upsertTimeline.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.getTimeline.invalidate()
    },
  })

  const deleteTimeline = api.pengaturanJadwal.deleteTimeline.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.getTimeline.invalidate()
    },
  })

  const clearTimelineDay = api.pengaturanJadwal.clearTimelineDay.useMutation({
    onSuccess: (res) => {
      toast.success(`Berhasil menghapus ${res.count} item`)
      utils.pengaturanJadwal.getTimeline.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus item hari ini"),
  })

  const applyTemplate = api.pengaturanJadwal.applyTemplateToDays.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.getTimeline.invalidate()
    },
  })

  const addJpItem = api.pengaturanJadwal.addJpItem.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.getTimeline.invalidate()
    },
  })

  const insertActivityItem = api.pengaturanJadwal.insertActivityItem.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.getTimeline.invalidate()
    },
  })

  const [durasiJP, setDurasiJP] = useState(40)
  const [jamMulai, setJamMulai] = useState("07:00")
  const [saving, setSaving] = useState(false)
  const [timelineHari, setTimelineHari] = useState("senin")

  const [dayChecklist, setDayChecklist] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_DAYS.map((d) => [d.value, true]))
  )

  // Activity insertion form
  const [showInsertForm, setShowInsertForm] = useState(false)
  const [insertHari, setInsertHari] = useState("senin")
  const [insertType, setInsertType] = useState("istirahat")
  const [insertLabel, setInsertLabel] = useState("")
  const [insertJamMulai, setInsertJamMulai] = useState("")
  const [insertJamSelesai, setInsertJamSelesai] = useState("")
  const [insertAfterUrutan, setInsertAfterUrutan] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    if (pengaturan) {
      setDurasiJP(pengaturan.durasiJP)
      setJamMulai(pengaturan.jamMulai)
    }
  }, [open, pengaturan])

  const timelineItems = useMemo(() => (timelineList ?? []) as TimelineFormData[], [timelineList])

  const itemsByDay = useMemo(() => {
    const map = new Map<string, TimelineFormData[]>()
    for (const day of ALL_DAYS) {
      map.set(day.value, timelineItems.filter((t) => t.hari === day.value).sort((a, b) => a.urutan - b.urutan))
    }
    return map
  }, [timelineItems])

  const daysWithItems = useMemo(() => {
    const days = new Set<string>()
    for (const item of timelineItems) {
      days.add(item.hari)
    }
    return days
  }, [timelineItems])

  const specialDays = useMemo(() => {
    return ALL_DAYS.filter((d) => d.value !== timelineHari && daysWithItems.has(d.value))
  }, [timelineHari, daysWithItems])

  const startMinutes = pengaturan ? timeToMinutes(pengaturan.jamMulai) : 420
  const durasi = pengaturan?.durasiJP ?? 40

  const getNextJpTime = useCallback(
    (hari: string) => {
      const items = itemsByDay.get(hari) ?? []
      const jpCount = items.filter((i) => i.tipe === "jp").length
      const nextStart = startMinutes + jpCount * durasi
      const nextEnd = nextStart + durasi
      return {
        jamMulai: minutesToTime(nextStart),
        jamSelesai: minutesToTime(nextEnd),
      }
    },
    [itemsByDay, startMinutes, durasi]
  )

  const handleSavePengaturan = async () => {
    setSaving(true)
    try {
      await upsertPengaturan.mutateAsync({ durasiJP, jamMulai })
    } finally {
      setSaving(false)
    }
  }

  const handleAddJp = async (hari: string) => {
    setSaving(true)
    try {
      await addJpItem.mutateAsync({ hari: hari as any })
      toast.success("Jam Pelajaran (JP) berhasil ditambahkan")
    } catch {
      toast.error("Gagal menambahkan JP")
    } finally {
      setSaving(false)
    }
  }

  const handleInsertActivity = async () => {
    if (!insertJamMulai || !insertJamSelesai) return
    if (insertType === "pembiasaan" && !insertLabel.trim()) return

    setSaving(true)
    try {
      const label = insertType === "pembiasaan" ? insertLabel.trim() : undefined

      await insertActivityItem.mutateAsync({
        hari: insertHari as any,
        tipe: insertType as any,
        label: label || undefined,
        jamMulai: insertJamMulai,
        jamSelesai: insertJamSelesai,
        insertAfterUrutan,
      })

      setShowInsertForm(false)
      setInsertLabel("")
      setInsertType("istirahat")
      setInsertAfterUrutan(null)
      toast.success("Kegiatan berhasil ditambahkan")
    } catch {
      toast.error("Gagal menambahkan kegiatan")
    } finally {
      setSaving(false)
    }
  }

  const handleInsertAfter = async (hari: string, afterItem: TimelineFormData, tipe: string) => {
    const targetUrutan = afterItem.urutan + 1

    if (tipe === "jp") {
      setSaving(true)
      try {
        await insertActivityItem.mutateAsync({
          hari: hari as any,
          tipe: "jp",
          jamMulai: "00:00",
          jamSelesai: "00:00",
          insertAfterUrutan: afterItem.urutan,
        })
        toast.success("Jam Pelajaran (JP) berhasil disisipkan")
      } catch {
        toast.error("Gagal menyisipkan JP")
      } finally {
        setSaving(false)
      }
    } else {
      setInsertHari(hari)
      setInsertType(tipe)
      setInsertLabel("")
      setInsertJamMulai(afterItem.jamSelesai)
      const endMin = timeToMinutes(afterItem.jamSelesai) + 30
      setInsertJamSelesai(minutesToTime(endMin))
      setInsertAfterUrutan(targetUrutan)
      setShowInsertForm(true)
    }
  }

  const handleDeleteItem = async (id: string) => {
    await deleteTimeline.mutateAsync({ id })
  }

  const handleApplyTemplate = async () => {
    const checkedDays = Object.entries(dayChecklist)
      .filter(([, checked]) => checked)
      .map(([day]) => day)
      .filter((d) => d !== timelineHari)

    if (checkedDays.length === 0) return

    await applyTemplate.mutateAsync({
      sourceHari: timelineHari as any,
      targetHari: checkedDays as any,
    })
  }

  const handleClose = () => {
    if (upsertPengaturan.isPending) return
    onClose()
  }

  const loading = loadPengaturan || loadTimeline

  const showInsert = (hari: string, type: string) => {
    setInsertHari(hari)
    setInsertType(type)
    setInsertLabel("")
    const items = itemsByDay.get(hari) ?? []
    const lastItem = items[items.length - 1]
    if (lastItem) {
      setInsertJamMulai(lastItem.jamSelesai)
      const endMin = timeToMinutes(lastItem.jamSelesai) + 30
      setInsertJamSelesai(minutesToTime(endMin))
    } else {
      setInsertJamMulai(pengaturan?.jamMulai ?? "07:00")
      const endMin = timeToMinutes(pengaturan?.jamMulai ?? "07:00") + 30
      setInsertJamSelesai(minutesToTime(endMin))
    }
    setShowInsertForm(true)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-[32px] p-6 bg-background border-0 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-500 animate-spin-slow" />
            Pengaturan Jadwal Global
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Pengaturan...</p>
          </div>
        ) : (
          <Tabs defaultValue="dasar" className="space-y-6 mt-4">
            <TabsList className="grid grid-cols-2 w-full max-w-[420px] p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800">
              <TabsTrigger
                value="dasar"
                className="rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                Pengaturan Umum
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Timeline Jadwal
              </TabsTrigger>
            </TabsList>

            {/* TAB: Dasar (Pengaturan Umum) */}
            <TabsContent value="dasar" className="space-y-5 animate-fade-in outline-none">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Atur durasi standar untuk setiap Jam Pelajaran (JP) dan jam dimulainya Kegiatan Belajar Mengajar (KBM). Perubahan di sini akan secara otomatis menyesuaikan durasi KBM harian pada template jadwal sekolah.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Durasi per JP (Menit)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={15}
                      max={120}
                      value={durasiJP}
                      onChange={(e) => setDurasiJP(Number(e.target.value))}
                      className="rounded-xl h-11 text-sm font-bold border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jam Mulai KBM</Label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={jamMulai}
                      onChange={(e) => setJamMulai(e.target.value)}
                      className="rounded-xl h-11 text-sm font-bold border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={handleSavePengaturan}
                  disabled={saving || loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 px-6 h-10 text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Pengaturan
                </Button>
              </div>
            </TabsContent>

            {/* TAB: Timeline (Timeline Jadwal Harian) */}
            <TabsContent value="timeline" className="space-y-6 animate-fade-in outline-none">
              {/* Day Selector Row */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Pilih Hari untuk Dikonfigurasi
                </Label>
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 overflow-x-auto">
                  {ALL_DAYS.map((d) => {
                    const isActive = timelineHari === d.value
                    const itemCount = itemsByDay.get(d.value)?.length || 0
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setTimelineHari(d.value)}
                        className={`flex-shrink-0 min-w-[95px] flex flex-col items-center justify-center py-2.5 px-3 rounded-xl transition-all duration-300 transform active:scale-95 cursor-pointer ${
                          isActive
                            ? "bg-emerald-600 dark:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/15 scale-[1.02]"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-150 hover:bg-white dark:hover:bg-slate-800 font-medium"
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wider font-extrabold">{d.label}</span>
                        {itemCount > 0 ? (
                          <span className={`text-[9px] mt-1 px-2 py-0.5 rounded-full font-black tracking-tight ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}>
                            {itemCount} Kegiatan
                          </span>
                        ) : (
                          <span className="text-[9px] mt-1 text-slate-400 dark:text-slate-500 italic">
                            Kosong
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Day Timeline Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Jadwal Hari <strong className="text-emerald-600 dark:text-emerald-400 capitalize">{timelineHari}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Salin ke Hari Lain */}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-800 font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                        disabled={(itemsByDay.get(timelineHari)?.length ?? 0) === 0 || applyTemplate.isPending}
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        Salin Ke...
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-slate-100 dark:border-slate-800">
                      <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Salin Jadwal ke:
                        </span>
                      </div>
                      {ALL_DAYS.filter((d) => d.value !== timelineHari).map((d) => (
                        <div
                          key={d.value}
                          onClick={() => {
                            setDayChecklist((prev) => ({ ...prev, [d.value]: !prev[d.value] }))
                          }}
                          className="flex items-center gap-2.5 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={!!dayChecklist[d.value]}
                            onChange={() => {}} // handled by click handler above
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{d.label}</span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Button
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await handleApplyTemplate()
                            toast.success(`Jadwal berhasil disalin`)
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-sm"
                          disabled={
                            applyTemplate.isPending ||
                            Object.entries(dayChecklist).filter(([k, v]) => v && k !== timelineHari).length === 0
                          }
                        >
                          {applyTemplate.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          Terapkan
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Salin dari Hari Lain (bila kosong) */}
                  {(itemsByDay.get(timelineHari)?.length ?? 0) === 0 && specialDays.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-800 font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50"
                          disabled={applyTemplate.isPending}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Salin Dari...
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                        {specialDays.map((d) => (
                          <DropdownMenuItem
                            key={d.value}
                            onClick={async () => {
                              await applyTemplate.mutateAsync({
                                sourceHari: d.value as any,
                                targetHari: [timelineHari as any],
                              })
                              toast.success(`Jadwal disalin dari hari ${d.label}`)
                            }}
                            className="cursor-pointer font-bold text-xs rounded-lg py-2"
                          >
                            Jadwal Hari {d.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Reset JP (Jam Pelajaran) */}
                  {(itemsByDay.get(timelineHari)?.filter((item) => item.tipe === "jp").length ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-800 font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      onClick={async () => {
                        if (confirm(`Hapus seluruh Jam Pelajaran (JP) di hari ${ALL_DAYS.find(d => d.value === timelineHari)?.label}?`)) {
                          await clearTimelineDay.mutateAsync({ hari: timelineHari as any, tipe: "jp" })
                        }
                      }}
                      disabled={clearTimelineDay.isPending}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset JP
                    </Button>
                  )}

                  {/* Reset/Hapus Hari Ini */}
                  {(itemsByDay.get(timelineHari)?.length ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-xs gap-1.5 border-slate-200 dark:border-slate-800 font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      onClick={async () => {
                        if (confirm(`Hapus seluruh kegiatan hari ${ALL_DAYS.find(d => d.value === timelineHari)?.label}?`)) {
                          await clearTimelineDay.mutateAsync({ hari: timelineHari as any })
                        }
                      }}
                      disabled={clearTimelineDay.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Kosongkan Hari
                    </Button>
                  )}
                </div>
              </div>

              {/* Timeline Items List */}
              <div className="space-y-4">
                {(itemsByDay.get(timelineHari)?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center bg-slate-50/50 dark:bg-slate-900/10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center mb-3">
                      <Clock className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                      Jadwal Hari {ALL_DAYS.find((d) => d.value === timelineHari)?.label} Kosong
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Mulai konfigurasi dengan menambahkan Jam Pelajaran (JP) baru atau sisipkan kegiatan (istirahat, sholat, pembiasaan).
                    </p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-dashed border-slate-200 dark:border-slate-800/80 ml-4 pl-6 space-y-4 py-2">
                    {(itemsByDay.get(timelineHari) ?? []).map((item) => {
                      const Icon = TIPE_ICONS[item.tipe] || Clock
                      const jpItems = (itemsByDay.get(timelineHari) ?? []).filter((i) => i.tipe === "jp")
                      const jpIndex = jpItems.findIndex((i) => (i.id && item.id ? i.id === item.id : i.urutan === item.urutan))
                      const displayLabel =
                        item.tipe === "pembiasaan" && item.label
                          ? `Pembiasaan: ${item.label}`
                          : item.tipe === "jp"
                            ? `Jam Pelajaran ${jpIndex >= 0 ? jpIndex + 1 : item.urutan}`
                            : item.label || TIPE_LABELS[item.tipe]

                      return (
                        <div key={item.id} className="relative group">
                          {/* Timeline Node dot */}
                          <div className={`absolute -left-[31px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-background dark:border-slate-950 flex items-center justify-center shadow-sm z-10 ${
                            item.tipe === "jp" ? "bg-emerald-500" :
                            item.tipe === "istirahat" ? "bg-blue-400" :
                            item.tipe === "sholat" ? "bg-purple-400" :
                            item.tipe === "pembiasaan" ? "bg-teal-400" :
                            item.tipe === "upacara" ? "bg-amber-500" : "bg-slate-400"
                          }`}>
                            <div className="h-1 w-1 rounded-full bg-white" />
                          </div>

                          {/* Card */}
                          <div className={`flex items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 ${TIPE_COLORS[item.tipe] || "border-l-border"}`}>
                            <div className="flex items-start sm:items-center gap-3 text-sm min-w-0 flex-1">
                              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                                item.tipe === "jp" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600" :
                                item.tipe === "istirahat" ? "bg-blue-50 dark:bg-blue-950/20 text-blue-500" :
                                item.tipe === "sholat" ? "bg-purple-50 dark:bg-purple-950/20 text-purple-500" :
                                item.tipe === "pembiasaan" ? "bg-teal-50 dark:bg-teal-950/20 text-teal-500" :
                                item.tipe === "upacara" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-500" :
                                "bg-slate-50 dark:bg-slate-900 text-slate-500"
                              }`}>
                                <Icon className="h-4 w-4 shrink-0" />
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 sm:py-1 rounded-xl font-bold font-mono text-[10px] sm:text-[11px] tracking-tight shrink-0 shadow-sm w-fit">
                                  {item.jamMulai} - {item.jamSelesai}
                                </span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">{displayLabel}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              {/* Sisipkan Kegiatan */}
                              <DropdownMenu>
                                <DropdownMenuTrigger render={
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                                    title="Sisipkan kegiatan setelah ini"
                                    disabled={saving}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                } />
                                <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                                  <DropdownMenuItem onClick={() => handleInsertAfter(timelineHari, item, "jp")} className="cursor-pointer font-bold text-xs rounded-lg">
                                    <Clock className="h-4 w-4 mr-2 text-teal-600" />
                                    Sisip JP Baru
                                  </DropdownMenuItem>
                                  {timelineHari === "senin" && (
                                    <DropdownMenuItem onClick={() => handleInsertAfter(timelineHari, item, "upacara")} className="cursor-pointer font-bold text-xs rounded-lg">
                                      <Flag className="h-4 w-4 mr-2 text-amber-500" />
                                      Upacara (Senin)
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleInsertAfter(timelineHari, item, "istirahat")} className="cursor-pointer font-bold text-xs rounded-lg">
                                    <Coffee className="h-4 w-4 mr-2 text-blue-400" />
                                    Istirahat
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleInsertAfter(timelineHari, item, "sholat")} className="cursor-pointer font-bold text-xs rounded-lg">
                                    <Sparkles className="h-4 w-4 mr-2 text-purple-450" />
                                    Sholat
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleInsertAfter(timelineHari, item, "pembiasaan")} className="cursor-pointer font-bold text-xs rounded-lg">
                                    <BookOpen className="h-4 w-4 mr-2 text-emerald-500" />
                                    Pembiasaan...
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* Hapus Item */}
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                                onClick={() => item.id && handleDeleteItem(item.id)}
                                disabled={deleteTimeline.isPending || saving}
                              >
                                {deleteTimeline.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Day Bottom Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider gap-1.5 border-slate-200 dark:border-slate-800 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleAddJp(timelineHari)}
                  disabled={upsertTimeline.isPending || !pengaturan}
                >
                  {upsertTimeline.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  ) : (
                    <Plus className="h-4 w-4 text-emerald-600" />
                  )}
                  Tambah JP (Jam Pelajaran)
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider gap-1.5 border-slate-200 dark:border-slate-800 text-slate-700 hover:bg-slate-50 cursor-pointer"
                      disabled={!pengaturan}
                    >
                      <Plus className="h-4 w-4 text-blue-500" />
                      Sisip Kegiatan Lain
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  } />
                  <DropdownMenuContent align="start" className="w-48 p-1.5 rounded-xl shadow-xl border-slate-100 dark:border-slate-800">
                    {timelineHari === "senin" ? (
                      <DropdownMenuItem onClick={() => showInsert(timelineHari, "upacara")} className="rounded-lg font-bold text-xs">
                        <Flag className="h-4 w-4 mr-2 text-amber-500" />
                        Upacara (Senin)
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled className="opacity-40 cursor-not-allowed rounded-lg font-bold text-xs">
                        <Flag className="h-4 w-4 mr-2" />
                        Upacara (Khusus Senin)
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => showInsert(timelineHari, "istirahat")} className="rounded-lg font-bold text-xs">
                      <Coffee className="h-4 w-4 mr-2 text-blue-500" />
                      Istirahat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => showInsert(timelineHari, "sholat")} className="rounded-lg font-bold text-xs">
                      <Sparkles className="h-4 w-4 mr-2 text-purple-550" />
                      Sholat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => showInsert(timelineHari, "pembiasaan")} className="rounded-lg font-bold text-xs">
                      <BookOpen className="h-4 w-4 mr-2 text-emerald-500" />
                      Pembiasaan...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Insert Activity Dialog */}
        {showInsertForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300" onClick={() => setShowInsertForm(false)}>
            <div className="bg-background rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-2xl p-6 w-full max-w-sm mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                {insertType === "upacara"
                  ? "Sisip Upacara"
                  : insertType === "pembiasaan"
                    ? "Sisip Pembiasaan"
                    : `Sisip ${TIPE_LABELS[insertType] || insertType}`}
              </h3>

              {insertType === "pembiasaan" && (
                <div className="space-y-1.5 mb-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nama Pembiasaan</Label>
                  <Input
                    value={insertLabel}
                    onChange={(e) => setInsertLabel(e.target.value)}
                    placeholder="Contoh: Literasi Pagi, Tahfidz"
                    className="h-10 rounded-xl text-sm font-bold border-slate-200 dark:border-slate-800"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jam Mulai</Label>
                  <Input
                    type="time"
                    value={insertJamMulai}
                    onChange={(e) => setInsertJamMulai(e.target.value)}
                    className="h-10 rounded-xl text-sm font-bold border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jam Selesai</Label>
                  <Input
                    type="time"
                    value={insertJamSelesai}
                    onChange={(e) => setInsertJamSelesai(e.target.value)}
                    className="h-10 rounded-xl text-sm font-bold border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowInsertForm(false)
                    setInsertLabel("")
                    setInsertAfterUrutan(null)
                  }}
                  className="rounded-xl h-9 px-4 text-xs font-bold"
                  disabled={upsertTimeline.isPending}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleInsertActivity}
                  disabled={
                    upsertTimeline.isPending ||
                    (insertType === "pembiasaan" && !insertLabel.trim())
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-4 text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  {upsertTimeline.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
