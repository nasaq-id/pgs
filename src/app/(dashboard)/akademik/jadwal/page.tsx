"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Pencil,
  Trash2,
  Loader2,
  Settings,
  Printer,
  Sparkles,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
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
import JadwalFormDialog, { type JadwalFormData } from "@/components/jadwal/JadwalFormDialog"
import PengaturanJadwalDialog from "@/components/jadwal/PengaturanJadwalDialog"
import CetakJadwal from "@/components/jadwal/CetakJadwal"
import ExportExcelJadwal from "@/components/jadwal/ExportExcelJadwal"
import AiGenerateDialog from "@/components/jadwal/AiGenerateDialog"
import { DAYS, DAY_LABEL, toTimeInputValue, timeToMinutes } from "@/components/jadwal/constants"

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

export default function JadwalPage() {
  const [kelasId, setKelasId] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<JadwalFormData | null>(null)
  const [addForHari, setAddForHari] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pengaturanOpen, setPengaturanOpen] = useState(false)
  const [cetakOpen, setCetakOpen] = useState(false)
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const kelasRecords = useMemo(() => (kelasList ?? []) as KelasRecord[], [kelasList])

  const selectedKelasMain = useMemo(() => {
    const cls = kelasRecords.find((k) => k.id === kelasId)
    return cls ? `${cls.tingkat ?? ""} - ${cls.namaKelas}` : ""
  }, [kelasId, kelasRecords])

  useEffect(() => {
    if (!kelasId && kelasRecords.length > 0) {
      setKelasId(kelasRecords[0].id)
    }
  }, [kelasId, kelasRecords])

  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 500 })
  const { data: jadwalList, isLoading } = api.jadwal.getAll.useQuery(
    { kelasId: kelasId || undefined },
    { enabled: !!kelasId }
  )
  const { data: pengaturan } = api.pengaturanJadwal.get.useQuery({})
  const { data: timelineList } = api.pengaturanJadwal.getTimeline.useQuery({})

  const utils = api.useUtils()

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
    onSuccess: () => {
      utils.jadwal.getAll.invalidate()
    },
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

  // Get active days from timeline items
  const aktifDays = useMemo(() => {
    const days = new Set<string>()
    for (const t of timelineRecords) {
      if (t.tipe === "jp") days.add(t.hari)
    }
    if (days.size === 0) return DAYS
    return DAYS.filter((d) => days.has(d))
  }, [timelineRecords])

  // Build timeline-based academic JP mapping
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
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          mataPelajaranId: data.mataPelajaranId,
          guruId: data.guruId,
          hari: data.hari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu",
          jpCount: data.jpCount,
        },
      })
    } else {
      await createMutation.mutateAsync({
        kelasId: kelasId,
        mataPelajaranId: data.mataPelajaranId,
        guruId: data.guruId,
        hari: data.hari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu",
        jpCount: data.jpCount,
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const openEdit = (entry: JadwalRecord) => {
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

  const openAdd = (hari: string) => {
    setEditEntry(null)
    setAddForHari(hari)
    setFormOpen(true)
  }

  // Get non-JP timeline items (agenda-like) for a slot
  const getAgendaAtSlot = (day: string, jpSlotIndex: number): TimelineRecord | null => {
    const dayItems = timelineByDay.get(day) ?? []
    // jpSlotIndex is 0-based into jp-only array
    // We need to find the actual timeline item at this absolute position
    const jpItems = dayItems.filter((t) => t.tipe === "jp")
    const targetJpItem = jpItems[jpSlotIndex]
    if (!targetJpItem) return null

    // Find non-JP items that overlap with this JP's time range
    const jpStart = timeToMinutes(targetJpItem.jamMulai)
    const jpEnd = timeToMinutes(targetJpItem.jamSelesai)

    for (const item of dayItems) {
      if (item.tipe === "jp") continue
      const itemStart = timeToMinutes(item.jamMulai)
      const itemEnd = timeToMinutes(item.jamSelesai)
      if (jpStart < itemEnd && jpEnd > itemStart) return item
    }
    return null
  }

  // Get entry at a specific JP slot
  const getEntryAtSlot = (day: string, jpSlotIndex: number): JadwalRecord | null => {
    const jpItems = (timelineByDay.get(day) ?? []).filter((t) => t.tipe === "jp")
    const targetJpItem = jpItems[jpSlotIndex]
    if (!targetJpItem) return null

    // Check if this JP slot is blocked by a non-JP item
    const isBlocked = getAgendaAtSlot(day, jpSlotIndex) !== null
    if (isBlocked) return null

    // Academic JP = 1-based index into jpItems
    const academicJp = jpSlotIndex + 1
    const entries = jadwalRecords.filter(
      (e) => e.hari === day && e.jpMulai !== null && e.jpCount !== null
    )
    for (const entry of entries) {
      const start = entry.jpMulai!
      const end = start + entry.jpCount!
      if (academicJp >= start && academicJp < end) return entry
    }
    return null
  }

  // Build JP grid: for each active day, list all JP items
  const jpGridByDay = useMemo(() => {
    const grid: { day: string; jpSlots: { jpNumber: number; timeStart: string; timeEnd: string }[] }[] = []
    for (const day of aktifDays) {
      const jpItems = (timelineByDay.get(day) ?? []).filter((t) => t.tipe === "jp")
      const slots = jpItems.map((item, idx) => ({
        jpNumber: idx + 1,
        timeStart: item.jamMulai,
        timeEnd: item.jamSelesai,
      }))
      grid.push({ day, jpSlots: slots })
    }
    return grid
  }, [timelineByDay, aktifDays])

  // Derive total JpSlots count for display (use max across days for uniform grid)
  const maxJpSlots = useMemo(() => {
    let max = 0
    for (const { jpSlots } of jpGridByDay) {
      if (jpSlots.length > max) max = jpSlots.length
    }
    return max
  }, [jpGridByDay])

  const hasData = jadwalRecords.length > 0

  if (kelasRecords.length === 0) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
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
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Kelas:
            </span>
            <Select value={kelasId} onValueChange={(v) => v && setKelasId(v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Pilih kelas">{selectedKelasMain || "Pilih kelas"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {kelasRecords.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.tingkat ?? ""} - {k.namaKelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCetakOpen(true)}
              disabled={!kelasId || !hasData}
            >
              <Printer className="h-4 w-4" /> Cetak
            </Button>
            <ExportExcelJadwal />
            <Button
              className="gap-2"
              variant="outline"
              onClick={() => setAiGenerateOpen(true)}
            >
              <Sparkles className="h-4 w-4 text-[hsl(142_72%_40%)]" /> AI Generate
            </Button>
            <Button
              className="gap-2"
              variant="outline"
              onClick={() => setPengaturanOpen(true)}
            >
              <Settings className="h-4 w-4" /> Pengaturan Jadwal
            </Button>

          </div>
        </div>

        {!kelasId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Pilih kelas untuk melihat jadwal</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(142_72%_40%)]" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">Belum ada jadwal untuk kelas ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground w-24">
                    JP
                  </th>
                  {aktifDays.map((day) => (
                    <th
                      key={day}
                      className="border border-border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground min-w-[120px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{DAY_LABEL[day]}</span>
                        <button
                          onClick={() => openAdd(day)}
                          className="rounded p-0.5 hover:bg-[hsl(142_72%_40%)] hover:text-white transition-colors"
                          title={`Tambah jadwal ${DAY_LABEL[day]}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxJpSlots }, (_, slotIdx) => (
                  <tr key={slotIdx}>
                    <td className="border border-border px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>JP {slotIdx + 1}</span>
                        {jpGridByDay[0]?.jpSlots[slotIdx] && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {jpGridByDay[0].jpSlots[slotIdx].timeStart} - {jpGridByDay[0].jpSlots[slotIdx].timeEnd}
                          </span>
                        )}
                      </div>
                    </td>
                    {aktifDays.map((day) => {
                      const agenda = getAgendaAtSlot(day, slotIdx)
                      const entry = agenda ? null : getEntryAtSlot(day, slotIdx)
                      const daySlots = jpGridByDay.find((g) => g.day === day)?.jpSlots
                      const hasSlot = daySlots && slotIdx < daySlots.length
                      if (!hasSlot) {
                        return (
                          <td key={day} className="border border-border px-2 py-1.5 align-top">
                            <span className="text-[10px] text-muted-foreground">&mdash;</span>
                          </td>
                        )
                      }
                      return (
                        <td key={day} className="border border-border px-2 py-1.5 align-top">
                          {agenda ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-1.5">
                              <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                {agenda.label || agenda.tipe}
                              </div>
                            </div>
                          ) : entry ? (
                            <div className="group relative rounded-lg border border-[hsl(142_30%_80%)] bg-[hsl(142_50%_95%)] p-2 dark:border-[hsl(142_30%_30%)] dark:bg-[hsl(142_30%_15%)]">
                              <div className="text-xs font-medium leading-tight">
                                {mapelMap.get(entry.mataPelajaranId)?.namaMapel ?? "-"}
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                {guruMap.get(entry.guruId)?.namaLengkap ?? "-"}
                              </div>
                              <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger
                                    onClick={() => openEdit(entry)}
                                    className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipPortal>
                                    <TooltipPositioner>
                                      <TooltipPopup>Edit</TooltipPopup>
                                    </TooltipPositioner>
                                  </TooltipPortal>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger
                                    onClick={() => setDeleteId(entry.id)}
                                    className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </TooltipTrigger>
                                  <TooltipPortal>
                                    <TooltipPositioner>
                                      <TooltipPopup>Hapus</TooltipPopup>
                                    </TooltipPositioner>
                                  </TooltipPortal>
                                </Tooltip>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">&mdash;</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasData && !isLoading && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>
              <strong className="text-foreground">{jadwalRecords.length}</strong> jadwal
            </span>
            <span>
              <strong className="text-foreground">
                {new Set(jadwalRecords.map((j) => j.hari)).size}
              </strong>{" "}
              hari
            </span>
            <span>
              <strong className="text-foreground">
                {new Set(jadwalRecords.map((j) => j.mataPelajaranId)).size}
              </strong>{" "}
              mapel
            </span>
            {pengaturanData && (
              <span>
                1 JP = <strong className="text-foreground">{pengaturanData.durasiJP}</strong> menit
              </span>
            )}
          </div>
        )}
      </div>

      <JadwalFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditEntry(null)
          setAddForHari(null)
        }}
        onSubmit={handleSubmit}
        initial={editEntry}
        mapelList={mapelRecords}
        guruList={guruRecords}
        saving={createMutation.isPending || updateMutation.isPending}
        existingJadwal={jadwalRecords as any}
        timelineItems={timelineRecords as any}
        contextHari={addForHari ?? undefined}
      />

      <PengaturanJadwalDialog
        open={pengaturanOpen}
        onClose={() => setPengaturanOpen(false)}
      />

      <CetakJadwal
        open={cetakOpen}
        onClose={() => setCetakOpen(false)}
      />

      <AiGenerateDialog
        open={aiGenerateOpen}
        onClose={() => setAiGenerateOpen(false)}
        kelasRecords={kelasRecords}
        mapelRecords={mapelRecords}
        guruRecords={guruRecords}
        existingJadwal={jadwalRecords as any}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan.
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
    </div>
  )
}
