"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Loader2, Plus, Pencil, Trash2, Copy, Clock, BookOpen, Flag, Coffee, Sparkles } from "lucide-react"
import { api } from "@/lib/trpc/client"

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
  hari: string
  tipe: string
  label: string
  jamMulai: string
  jamSelesai: string
  urutan: number
  warna?: string
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

  // Timeline form state
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<TimelineFormData | null>(null)
  const [tfTipe, setTfTipe] = useState("lainnya")
  const [tfLabel, setTfLabel] = useState("")
  const [tfJamMulai, setTfJamMulai] = useState("07:00")
  const [tfJamSelesai, setTfJamSelesai] = useState("07:40")
  const [tfUrutan, setTfUrutan] = useState(1)
  const [tfWarna, setTfWarna] = useState("")

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

  const currentDayItems = useMemo(() => itemsByDay.get(timelineHari) ?? [], [itemsByDay, timelineHari])

  const handleSavePengaturan = async () => {
    setSaving(true)
    try {
      await upsertPengaturan.mutateAsync({
        durasiJP,
        jamMulai,
      })
    } finally {
      setSaving(false)
    }
  }

  const openAddItem = () => {
    setEditItem(null)
    setTfTipe("lainnya")
    setTfLabel("")
    setTfJamMulai("07:00")
    setTfJamSelesai("07:40")
    setTfUrutan(currentDayItems.length + 1)
    setTfWarna("")
    setFormOpen(true)
  }

  const openEditItem = (item: TimelineFormData) => {
    setEditItem(item)
    setTfTipe(item.tipe)
    setTfLabel(item.label)
    setTfJamMulai(item.jamMulai)
    setTfJamSelesai(item.jamSelesai)
    setTfUrutan(item.urutan)
    setTfWarna(item.warna || "")
    setFormOpen(true)
  }

  const handleSaveTimeline = async () => {
    if (!tfJamMulai || !tfJamSelesai) return
    await upsertTimeline.mutateAsync({
      id: editItem?.id,
      hari: timelineHari as any,
      tipe: tfTipe as any,
      label: tfTipe === "jp" ? undefined : tfLabel,
      jamMulai: tfJamMulai,
      jamSelesai: tfJamSelesai,
      urutan: tfUrutan,
      warna: tfWarna || undefined,
    })
    setFormOpen(false)
  }

  const handleDeleteTimeline = async (id: string) => {
    await deleteTimeline.mutateAsync({ id })
  }

  const handleCopyToDays = async (targetDays: string[]) => {
    if (targetDays.length === 0) return
    await applyTemplate.mutateAsync({
      sourceHari: timelineHari as any,
      targetHari: targetDays as any,
    })
  }

  const handleClose = () => {
    if (upsertPengaturan.isPending) return
    onClose()
  }

  const loading = loadPengaturan || loadTimeline

  const activeDays = useMemo(() => {
    const days = new Set<string>()
    for (const item of timelineItems) {
      if (item.tipe === "jp") days.add(item.hari)
    }
    return days
  }, [timelineItems])

  return (
    <>
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
              <TabsList className="mb-4">
                <TabsTrigger value="dasar">Dasar</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="dasar" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Durasi per JP dan jam mulai akan digunakan untuk menggenerate JP 1-10 secara otomatis.
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
                    <Label>Jam Mulai</Label>
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

              <TabsContent value="timeline">
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="whitespace-nowrap">Hari:</Label>
                      <Select value={timelineHari} onValueChange={(v) => v && setTimelineHari(v)}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_DAYS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label} {activeDays.has(d.value) ? "(aktif)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          const others = ALL_DAYS.map(d => d.value).filter(d => d !== timelineHari)
                          handleCopyToDays(others)
                        }}
                        disabled={applyTemplate.isPending}
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy ke semua hari
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={openAddItem}
                      >
                        <Plus className="h-3.5 w-3.5" /> Tambah Item
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {currentDayItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        Belum ada item timeline untuk {ALL_DAYS.find(d => d.value === timelineHari)?.label}.
                        Simpan pengaturan dasar terlebih dahulu untuk menggenerate JP default.
                      </p>
                    ) : (
                      currentDayItems.map((item) => {
                        const Icon = TIPE_ICONS[item.tipe] || Clock
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                            style={item.warna ? { borderLeftColor: item.warna, borderLeftWidth: 3 } : undefined}
                          >
                            <div className="flex items-center gap-3 text-sm">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground text-xs font-mono w-24 shrink-0">
                                {item.jamMulai} - {item.jamSelesai}
                              </span>
                              <span className="font-medium">
                                {item.tipe === "jp" ? `JP ke-${item.urutan}` : (item.label || TIPE_LABELS[item.tipe])}
                              </span>
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {TIPE_LABELS[item.tipe]}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                onClick={() => openEditItem(item)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => item.id && handleDeleteTimeline(item.id)}
                                disabled={deleteTimeline.isPending}
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
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item Timeline" : "Tambah Item Timeline"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Select value={tfTipe} onValueChange={(v) => v && setTfTipe(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jp">JP (Jam Pelajaran)</SelectItem>
                  <SelectItem value="pembiasaan">Pembiasaan</SelectItem>
                  <SelectItem value="upacara">Upacara</SelectItem>
                  <SelectItem value="istirahat">Istirahat</SelectItem>
                  <SelectItem value="sholat">Sholat</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tfTipe !== "jp" && (
              <div className="space-y-1.5">
                <Label>Label / Nama Kegiatan</Label>
                <Input
                  value={tfLabel}
                  onChange={(e) => setTfLabel(e.target.value)}
                  placeholder={tfTipe === "pembiasaan" ? "Contoh: Literasi Pagi" : "Nama kegiatan"}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jam Mulai</Label>
                <Input
                  type="time"
                  value={tfJamMulai}
                  onChange={(e) => setTfJamMulai(e.target.value)}
                  disabled={tfTipe === "jp"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jam Selesai</Label>
                <Input
                  type="time"
                  value={tfJamSelesai}
                  onChange={(e) => setTfJamSelesai(e.target.value)}
                  disabled={tfTipe === "jp"}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Urutan</Label>
              <Input
                type="number"
                min={0}
                value={tfUrutan}
                onChange={(e) => setTfUrutan(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Warna (opsional)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  className="w-10 h-8 p-0.5"
                  value={tfWarna || "#000000"}
                  onChange={(e) => setTfWarna(e.target.value)}
                />
                {tfWarna && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setTfWarna("")}
                  >
                    Hapus warna
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={upsertTimeline.isPending}>
              Batal
            </Button>
            <Button
              onClick={handleSaveTimeline}
              disabled={upsertTimeline.isPending || (tfTipe !== "jp" && !tfLabel)}
              style={{ backgroundColor: "hsl(142 72% 40%)" }}
            >
              {upsertTimeline.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editItem ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
