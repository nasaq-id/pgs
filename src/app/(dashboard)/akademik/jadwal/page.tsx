"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Settings,
  Printer,
  Clock,
  Flag,
  Sun,
  Moon,
  BookOpen,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { Card } from "@/components/ui/card"
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
import { DAYS, DAY_LABEL, toTimeInputValue, timeStringToDate, timeToMinutes, minutesToTime } from "@/components/jadwal/constants"

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
  hariAktif: string
  jamMulai: string
  jamPulang: string
}

interface AgendaRecord {
  id: string
  sekolahId: string
  hari: string
  nama: string
  icon: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
}

const AGENDA_ICONS: Record<string, React.ElementType> = {
  clock: Clock,
  flag: Flag,
  sun: Sun,
  moon: Moon,
  "book-open": BookOpen,
}

export default function JadwalPage() {
  const [kelasId, setKelasId] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<JadwalFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pengaturanOpen, setPengaturanOpen] = useState(false)
  const [cetakOpen, setCetakOpen] = useState(false)
  const [aiGenerateOpen, setAiGenerateOpen] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({})
  const kelasRecords = useMemo(() => (kelasList ?? []) as KelasRecord[], [kelasList])

  useEffect(() => {
    if (!kelasId && kelasRecords.length > 0) {
      setKelasId(kelasRecords[0].id)
    }
  }, [kelasId, kelasRecords])

  const { data: mapelList } = api.mapel.getAll.useQuery({})
  const { data: guruList } = api.guru.getAll.useQuery({})
  const { data: jadwalList, isLoading } = api.jadwal.getAll.useQuery(
    { kelasId: kelasId || undefined },
    { enabled: !!kelasId }
  )
  const { data: pengaturan } = api.pengaturanJadwal.get.useQuery({})
  const { data: agendaList } = api.pengaturanJadwal.getAgenda.useQuery({})

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
  const agendaRecords = useMemo(() => (agendaList ?? []) as AgendaRecord[], [agendaList])

  const mapelMap = useMemo(
    () => new Map(mapelRecords.map((m) => [m.id, m])),
    [mapelRecords]
  )

  const guruMap = useMemo(
    () => new Map(guruRecords.map((g) => [g.id, g])),
    [guruRecords]
  )

  const durasiJP = pengaturanData?.durasiJP ?? 40
  const startMinutes = pengaturanData?.jamMulai ? timeToMinutes(pengaturanData.jamMulai) : 420
  const endMinutes = pengaturanData?.jamPulang ? timeToMinutes(pengaturanData.jamPulang) : 900
  const totalJpSlots = Math.floor((endMinutes - startMinutes) / durasiJP)

  const aktifDays = useMemo(() => {
    if (!pengaturanData?.hariAktif) return DAYS
    try {
      const parsed = JSON.parse(pengaturanData.hariAktif)
      return Array.isArray(parsed) ? parsed : DAYS
    } catch {
      return DAYS
    }
  }, [pengaturanData])

  const handleSubmit = async (data: JadwalFormData) => {
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          kelasId: kelasId,
          mataPelajaranId: data.mataPelajaranId,
          guruId: data.guruId,
          hari: data.hari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu",
          jamMulai: data.jamMulai ? timeStringToDate(data.jamMulai) : null,
          jamSelesai: data.jamSelesai ? timeStringToDate(data.jamSelesai) : null,
          jpMulai: data.jpMulai ?? null,
          jpCount: data.jpCount ?? null,
        },
      })
    } else {
      await createMutation.mutateAsync({
        kelasId: kelasId,
        mataPelajaranId: data.mataPelajaranId,
        guruId: data.guruId,
        hari: data.hari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu",
        jamMulai: data.jamMulai ? timeStringToDate(data.jamMulai) : null,
        jamSelesai: data.jamSelesai ? timeStringToDate(data.jamSelesai) : null,
        jpMulai: data.jpMulai ?? null,
        jpCount: data.jpCount ?? null,
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const openAdd = () => {
    setEditEntry({
      hari: aktifDays[0] || "senin",
      jamMulai: "",
      jamSelesai: "",
      mataPelajaranId: "",
      guruId: "",
      jpMulai: null,
      jpCount: 1,
    })
    setFormOpen(true)
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
    setFormOpen(true)
  }

  const jpGrid = useMemo(() => {
    const slots: { jp: number; timeStart: string; timeEnd: string }[] = []
    for (let i = 0; i < totalJpSlots; i++) {
      slots.push({
        jp: i + 1,
        timeStart: minutesToTime(startMinutes + i * durasiJP),
        timeEnd: minutesToTime(startMinutes + (i + 1) * durasiJP),
      })
    }
    return slots
  }, [totalJpSlots, startMinutes, durasiJP])

  const academicJpMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const day of aktifDays) {
      let counter = 1
      for (let jp = 1; jp <= totalJpSlots; jp++) {
        const slotStart = startMinutes + (jp - 1) * durasiJP
        const slotEnd = startMinutes + jp * durasiJP

        const isAgenda = agendaRecords.some((a) => {
          if (a.hari !== day) return false
          const agendaStart = timeToMinutes(a.jamMulai)
          const agendaEnd = timeToMinutes(a.jamSelesai)
          return slotStart < agendaEnd && slotEnd > agendaStart
        })

        if (isAgenda) {
          map.set(`${day}-${jp}`, null)
        } else {
          map.set(`${day}-${jp}`, counter++)
        }
      }
    }
    return map
  }, [aktifDays, totalJpSlots, startMinutes, durasiJP, agendaRecords])

  const getEntryAtSlot = (day: string, jpSlot: number): JadwalRecord | null => {
    const academicJp = academicJpMap.get(`${day}-${jpSlot}`)
    if (academicJp === null || academicJp === undefined) return null

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

  const getAgendaAtSlot = (day: string, jpSlot: number): AgendaRecord | null => {
    const hariAgenda = agendaRecords.filter((a) => a.hari === day)
    for (const agenda of hariAgenda) {
      const startJp = Math.floor((timeToMinutes(agenda.jamMulai) - startMinutes) / durasiJP) + 1
      const endJp = Math.floor((timeToMinutes(agenda.jamSelesai) - startMinutes - 1) / durasiJP) + 1
      if (jpSlot >= startJp && jpSlot <= endJp) return agenda
    }
    return null
  }

  const hasData = jadwalRecords.length > 0

  if (kelasRecords.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-1">Belum Ada Kelas</h3>
            <p className="text-sm text-muted-foreground">
              Tambahkan kelas terlebih dahulu sebelum mengatur jadwal pelajaran.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Kelas:
            </span>
            <Select value={kelasId} onValueChange={(v) => v && setKelasId(v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Pilih kelas" />
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
            <Button
              className="gap-2"
              style={{ backgroundColor: "hsl(142 72% 40%)" }}
              disabled={!kelasId}
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" /> Tambah Jadwal
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
                      {DAY_LABEL[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jpGrid.map((slot) => (
                  <tr key={slot.jp}>
                    <td className="border border-border px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>JP {slot.jp}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {slot.timeStart} - {slot.timeEnd}
                        </span>
                      </div>
                    </td>
                    {aktifDays.map((day) => {
                      const agenda = getAgendaAtSlot(day, slot.jp)
                      const entry = agenda ? null : getEntryAtSlot(day, slot.jp)
                      return (
                        <td key={day} className="border border-border px-2 py-1.5 align-top">
                          {agenda ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-1.5">
                              <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                {(() => {
                                  const Icon = AGENDA_ICONS[agenda.icon || "clock"] || Clock
                                  return <Icon className="h-3 w-3" />
                                })()}
                                <span>{agenda.nama}</span>
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
      </Card>

      <JadwalFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditEntry(null)
        }}
        onSubmit={handleSubmit}
        initial={editEntry}
        mapelList={mapelRecords}
        guruList={guruRecords}
        saving={createMutation.isPending || updateMutation.isPending}
        pengaturan={pengaturanData}
        existingJadwal={jadwalRecords as any}
        agendaKhusus={agendaRecords as any}
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
