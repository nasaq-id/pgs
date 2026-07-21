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
import { DAYS, DAY_LABEL, toTimeInputValue, timeToMinutes, formatKelasLabel } from "@/components/jadwal/constants"

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
    return cls ? formatKelasLabel(cls) : ""
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
    return DAYS
  }, [])

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
      <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 md:p-6 mb-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
              Kelas:
            </span>
            <Select value={kelasId} onValueChange={(v) => v && setKelasId(v)}>
              <SelectTrigger className="w-52 !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40">
                <SelectValue placeholder="Pilih kelas">{selectedKelasMain || "Pilih kelas"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {kelasRecords.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {formatKelasLabel(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider gap-2 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 cursor-pointer"
              onClick={() => setCetakOpen(true)}
              disabled={!kelasId || !hasData}
            >
              <Printer className="h-4 w-4 text-slate-500" /> Cetak
            </Button>
            <ExportExcelJadwal />
            <Button
              className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider gap-2 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 cursor-pointer"
              variant="outline"
              onClick={() => setAiGenerateOpen(true)}
            >
              <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" /> AI Generate
            </Button>
            <Button
              className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider gap-2 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 cursor-pointer"
              variant="outline"
              onClick={() => setPengaturanOpen(true)}
            >
              <Settings className="h-4 w-4 text-slate-500" /> Pengaturan Jadwal
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
        ) : maxJpSlots === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Settings className="h-10 w-10 text-muted-foreground/45 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Jam Pelajaran Belum Diatur</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Silakan atur Jam Pelajaran (JP) terlebih dahulu melalui tombol <strong>Pengaturan Jadwal</strong>.
            </p>
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="border-r border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 px-3 py-3.5 text-center text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider w-24">
                    JP
                  </th>
                  {aktifDays.map((day) => (
                    <th
                      key={day}
                      className="border-r border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 px-4 py-3.5 text-left text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider min-w-[150px] last:border-r-0"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{DAY_LABEL[day]}</span>
                        <button
                          onClick={() => openAdd(day)}
                          className="rounded-lg p-1 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-500 transition-all cursor-pointer shadow-sm border border-teal-100 dark:border-teal-900/20"
                          title={`Tambah jadwal ${DAY_LABEL[day]}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {Array.from({ length: maxJpSlots }, (_, slotIdx) => (
                  <tr key={slotIdx} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/5">
                    <td className="border-r border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 px-3 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>JP {slotIdx + 1}</span>
                        {(() => {
                          const slotWithTime = jpGridByDay.find((g) => g.jpSlots[slotIdx])?.jpSlots[slotIdx]
                          if (slotWithTime) {
                            return (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-tight mt-0.5">
                                {slotWithTime.timeStart} - {slotWithTime.timeEnd}
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </td>
                    {aktifDays.map((day) => {
                      const agenda = getAgendaAtSlot(day, slotIdx)
                      const entry = agenda ? null : getEntryAtSlot(day, slotIdx)
                      const daySlots = jpGridByDay.find((g) => g.day === day)?.jpSlots
                      const hasSlot = daySlots && slotIdx < daySlots.length
                      if (!hasSlot) {
                        return (
                          <td key={day} className="border-r border-slate-150 dark:border-slate-800 px-3 py-3 align-middle text-center last:border-r-0">
                            <span className="text-slate-350 dark:text-slate-650">—</span>
                          </td>
                        )
                      }
                      return (
                        <td key={day} className="border-r border-slate-150 dark:border-slate-800 px-3 py-3 align-top last:border-r-0">
                          {agenda ? (
                            <div className="rounded-xl border border-amber-250 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 shadow-xs">
                              <div className="flex items-center gap-1 text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                                {agenda.label || agenda.tipe}
                              </div>
                            </div>
                          ) : entry ? (
                            <div className="group relative rounded-xl border border-teal-150 dark:border-teal-900/30 bg-teal-50/40 dark:bg-teal-950/10 p-2.5 shadow-sm hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all text-left">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                {mapelMap.get(entry.mataPelajaranId)?.namaMapel ?? "-"}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-450 font-semibold leading-tight mt-1 truncate">
                                {guruMap.get(entry.guruId)?.namaLengkap ?? "-"}
                              </div>
                              <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 rounded-lg p-0.5 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <Tooltip>
                                  <TooltipTrigger
                                    onClick={() => openEdit(entry)}
                                    className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-500 dark:text-slate-400"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
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
                                    className="rounded-md p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-550 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
                            <span className="text-slate-300 dark:text-slate-650 block text-center py-2">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile schedule view */}
          <div className="md:hidden space-y-3">
            {aktifDays.map((day) => {
              const dayEntryList = jadwalRecords.filter((e) => e.hari === day)
              const daySlots = jpGridByDay.find((g) => g.day === day)?.jpSlots || []
              return (
                <div key={day} className="glass-card rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{DAY_LABEL[day]}</span>
                    <button
                      onClick={() => openAdd(day)}
                      className="rounded-lg p-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 hover:bg-teal-600 hover:text-white transition-all cursor-pointer border border-teal-100 dark:border-teal-900/20"
                      title={`Tambah jadwal ${DAY_LABEL[day]}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {dayEntryList.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-slate-400">Tidak ada jadwal</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {dayEntryList.map((entry) => {
                        const jpStartTime = daySlots[entry.jpMulai ? entry.jpMulai - 1 : 0]
                        return (
                          <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-shrink-0 w-14 text-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">JP {entry.jpMulai}</span>
                              {jpStartTime && (
                                <span className="text-[8px] text-slate-400">{jpStartTime.timeStart}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{mapelMap.get(entry.mataPelajaranId)?.namaMapel ?? "-"}</p>
                              <p className="text-[11px] text-slate-500 font-semibold truncate">{guruMap.get(entry.guruId)?.namaLengkap ?? "-"}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(entry)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setDeleteId(entry.id)} className="rounded-lg p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-400 hover:text-rose-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>)}

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
        kelasId={kelasId}
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
