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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Plus, Trash2, Copy, Clock, BookOpen, Flag, Coffee, Sparkles, ChevronDown } from "lucide-react"
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

  const applyTemplate = api.pengaturanJadwal.applyTemplateToDays.useMutation({
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
    const items = itemsByDay.get(hari) ?? []
    const maxUrutan = items.length > 0 ? Math.max(...items.map((i) => i.urutan)) : 0
    const { jamMulai: jm, jamSelesai: js } = getNextJpTime(hari)
    await upsertTimeline.mutateAsync({
      hari: hari as any,
      tipe: "jp",
      jamMulai: jm,
      jamSelesai: js,
      urutan: maxUrutan + 1,
    })
  }

  const handleInsertActivity = async () => {
    if (!insertJamMulai || !insertJamSelesai) return
    if (insertType === "pembiasaan" && !insertLabel.trim()) return

    setSaving(true)
    try {
      const items = itemsByDay.get(insertHari) ?? []
      const label = insertType === "pembiasaan" ? insertLabel.trim() : undefined

      if (insertAfterUrutan !== null) {
        // 1. Shift all subsequent items (urutan >= targetUrutan)
        for (const item of items) {
          if (item.urutan >= insertAfterUrutan && item.id) {
            await upsertTimeline.mutateAsync({
              id: item.id,
              hari: item.hari as any,
              tipe: item.tipe as any,
              label: item.label ?? undefined,
              jamMulai: item.jamMulai,
              jamSelesai: item.jamSelesai,
              urutan: item.urutan + 1,
              warna: item.warna ?? undefined,
            })
          }
        }

        // 2. Insert new activity at target urutan
        await upsertTimeline.mutateAsync({
          hari: insertHari as any,
          tipe: insertType as any,
          label,
          jamMulai: insertJamMulai,
          jamSelesai: insertJamSelesai,
          urutan: insertAfterUrutan,
        })
      } else {
        const maxUrutan = items.length > 0 ? Math.max(...items.map((i) => i.urutan)) : 0
        await upsertTimeline.mutateAsync({
          hari: insertHari as any,
          tipe: insertType as any,
          label,
          jamMulai: insertJamMulai,
          jamSelesai: insertJamSelesai,
          urutan: maxUrutan + 1,
        })
      }

      setShowInsertForm(false)
      setInsertLabel("")
      setInsertType("istirahat")
      setInsertAfterUrutan(null)
      toast.success("Kegiatan berhasil ditambahkan")
    } catch (err: any) {
      toast.error("Gagal menambahkan kegiatan")
    } finally {
      setSaving(false)
    }
  }

  const handleInsertAfter = async (hari: string, afterItem: TimelineFormData, tipe: string) => {
    const items = itemsByDay.get(hari) ?? []
    const targetUrutan = afterItem.urutan + 1

    if (tipe === "jp") {
      setSaving(true)
      try {
        // 1. Shift all subsequent items
        for (const item of items) {
          if (item.urutan >= targetUrutan && item.id) {
            await upsertTimeline.mutateAsync({
              id: item.id,
              hari: item.hari as any,
              tipe: item.tipe as any,
              label: item.label ?? undefined,
              jamMulai: item.jamMulai,
              jamSelesai: item.jamSelesai,
              urutan: item.urutan + 1,
              warna: item.warna ?? undefined,
            })
          }
        }

        // 2. Insert new JP
        const { jamMulai: jm, jamSelesai: js } = getNextJpTime(hari)
        await upsertTimeline.mutateAsync({
          hari: hari as any,
          tipe: "jp",
          jamMulai: jm,
          jamSelesai: js,
          urutan: targetUrutan,
        })
        toast.success("Jam Pelajaran (JP) berhasil disisipkan")
      } catch (err: any) {
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

  const renderTimelinePanel = (hari: string, isKhusus: boolean) => {
    const items = itemsByDay.get(hari) ?? []
    const jpItems = items.filter((i) => i.tipe === "jp")

    return (
      <div className="space-y-4">
        {isKhusus ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2">
            <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              Pengaturan khusus untuk hari ini. Perubahan tidak memengaruhi template utama.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto text-xs h-7"
              onClick={async () => {
                await applyTemplate.mutateAsync({
                  sourceHari: timelineHari as any,
                  targetHari: [hari as any],
                })
              }}
              disabled={applyTemplate.isPending}
            >
              <Copy className="h-3 w-3 mr-1" />
              Reset dari Template
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap text-xs">Hari:</Label>
              <Select value={timelineHari} onValueChange={(v) => v && setTimelineHari(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Terapkan untuk:</span>
              {ALL_DAYS.map((d) => (
                <label
                  key={d.value}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer transition-colors ${
                    dayChecklist[d.value]
                      ? "bg-[hsl(142_20%_90%)] text-[hsl(142_72%_30%)] dark:bg-[hsl(142_30%_20%)] dark:text-[hsl(142_60%_70%)]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={dayChecklist[d.value]}
                    onChange={(e) =>
                      setDayChecklist((prev) => ({ ...prev, [d.value]: e.target.checked }))
                    }
                    className="sr-only"
                  />
                  {d.label.slice(0, 3)}
                </label>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7"
                onClick={handleApplyTemplate}
                disabled={applyTemplate.isPending}
              >
                {applyTemplate.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Simpan Template
              </Button>
            </div>
          </div>
        )}

        {/* Timeline items list */}
        <div className="space-y-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Belum ada item untuk {ALL_DAYS.find((d) => d.value === hari)?.label}.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Tambah Jam Pelajaran atau Sisipkan Kegiatan untuk memulai.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = TIPE_ICONS[item.tipe] || Clock
              const jpIndex = jpItems.findIndex((i) => (i.id && item.id ? i.id === item.id : i.urutan === item.urutan))
              const displayLabel =
                item.tipe === "pembiasaan" && item.label
                  ? `Pembiasaan : ${item.label}`
                  : item.tipe === "jp"
                    ? `JP ${jpIndex >= 0 ? jpIndex + 1 : item.urutan}`
                    : item.label || TIPE_LABELS[item.tipe]
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 border-l-4 ${TIPE_COLORS[item.tipe] || "border-l-border"}`}
                >
                  <div className="flex items-center gap-3 text-sm min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground text-xs font-mono shrink-0 w-28">
                      {item.jamMulai} - {item.jamSelesai}
                    </span>
                    <span className="font-medium truncate">{displayLabel}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/20 cursor-pointer"
                          title="Sisipkan kegiatan setelah ini"
                          disabled={saving}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleInsertAfter(hari, item, "jp")} className="cursor-pointer font-medium text-xs">
                          <Clock className="h-4 w-4 mr-2 text-teal-600" />
                          Sisip JP Baru
                        </DropdownMenuItem>
                        {hari === "senin" && (
                          <DropdownMenuItem onClick={() => handleInsertAfter(hari, item, "upacara")} className="cursor-pointer font-medium text-xs">
                            <Flag className="h-4 w-4 mr-2 text-amber-500" />
                            Upacara (Senin)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleInsertAfter(hari, item, "istirahat")} className="cursor-pointer font-medium text-xs">
                          <Coffee className="h-4 w-4 mr-2 text-blue-400" />
                          Istirahat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleInsertAfter(hari, item, "sholat")} className="cursor-pointer font-medium text-xs">
                          <Sparkles className="h-4 w-4 mr-2 text-purple-450" />
                          Sholat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleInsertAfter(hari, item, "pembiasaan")} className="cursor-pointer font-medium text-xs">
                          <BookOpen className="h-4 w-4 mr-2 text-emerald-500" />
                          Pembiasaan...
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive cursor-pointer"
                      onClick={() => item.id && handleDeleteItem(item.id)}
                      disabled={deleteTimeline.isPending || saving}
                    >
                      {deleteTimeline.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => handleAddJp(hari)}
            disabled={upsertTimeline.isPending || !pengaturan}
          >
            {upsertTimeline.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Tambah Jam Pelajaran (JP)
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button size="sm" variant="outline" className="gap-1.5" disabled={!pengaturan}>
                <Plus className="h-3.5 w-3.5" />
                Sisip Kegiatan
                <ChevronDown className="h-3 w-3" />
              </Button>
            } />
            <DropdownMenuContent align="start" className="w-48">
              {hari === "senin" && (
                <DropdownMenuItem onClick={() => showInsert(hari, "upacara")}>
                  <Flag className="h-4 w-4 mr-2" />
                  Upacara (Senin)
                </DropdownMenuItem>
              )}
              {hari !== "senin" && (
                <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                  <Flag className="h-4 w-4 mr-2" />
                  Upacara (khusus Senin)
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => showInsert(hari, "istirahat")}>
                <Coffee className="h-4 w-4 mr-2" />
                Istirahat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => showInsert(hari, "sholat")}>
                <Sparkles className="h-4 w-4 mr-2" />
                Sholat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => showInsert(hari, "pembiasaan")}>
                <BookOpen className="h-4 w-4 mr-2" />
                Pembiasaan...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengaturan Jadwal Global</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(142_72%_40%)]" />
          </div>
        ) : (
          <Tabs defaultValue="dasar">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="dasar">Dasar</TabsTrigger>
              <TabsTrigger value="timeline">Template Timeline</TabsTrigger>
              {ALL_DAYS.map((d) => (
                <TabsTrigger key={`khusus-${d.value}`} value={`khusus-${d.value}`}>
                  Peng. {d.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="dasar" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Atur durasi per JP dan jam mulai KBM. Perubahan akan menyesuaikan waktu JP yang sudah ada.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Durasi per JP (menit)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={120}
                    value={durasiJP}
                    onChange={(e) => setDurasiJP(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jam Mulai KBM</Label>
                  <Input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSavePengaturan}
                  disabled={saving || loading}
                  style={{ backgroundColor: "hsl(142 72% 40%)" }}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Pengaturan
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-0">
              {renderTimelinePanel(timelineHari, false)}
            </TabsContent>

            {ALL_DAYS.map((d) => (
              <TabsContent key={`khusus-${d.value}`} value={`khusus-${d.value}`} className="space-y-0">
                {renderTimelinePanel(d.value, true)}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Insert Activity Dialog */}
        {showInsertForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInsertForm(false)}>
            <div className="bg-background rounded-xl shadow-lg p-5 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-3">
                {insertType === "upacara"
                  ? "Sisip Upacara"
                  : insertType === "pembiasaan"
                    ? "Sisip Pembiasaan"
                    : `Sisip ${TIPE_LABELS[insertType] || insertType}`}
              </h3>

              {insertType === "pembiasaan" && (
                <div className="space-y-1.5 mb-3">
                  <Label className="text-xs">Nama Pembiasaan</Label>
                  <Input
                    value={insertLabel}
                    onChange={(e) => setInsertLabel(e.target.value)}
                    placeholder="Contoh: Literasi Pagi"
                    className="h-8 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Jam Mulai</Label>
                  <Input
                    type="time"
                    value={insertJamMulai}
                    onChange={(e) => setInsertJamMulai(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Jam Selesai</Label>
                  <Input
                    type="time"
                    value={insertJamSelesai}
                    onChange={(e) => setInsertJamSelesai(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowInsertForm(false)
                    setInsertLabel("")
                    setInsertAfterUrutan(null)
                  }}
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
                  style={{ backgroundColor: "hsl(142 72% 40%)" }}
                >
                  {upsertTimeline.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
