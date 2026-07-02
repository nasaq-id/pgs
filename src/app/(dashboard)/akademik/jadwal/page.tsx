"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface JadwalRecord {
  id: string
  kelasId: string
  mataPelajaranId: string
  guruId: string
  hari: string
  jamMulai: string | null
  jamSelesai: string | null
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

const DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]

const DAY_LABEL: Record<string, string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
  minggu: "Minggu",
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  } catch {
    return dateStr.slice(0, 5)
  }
}

function toTimeInputValue(dateStr: string | null) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  } catch {
    return dateStr.slice(0, 5)
  }
}

function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number)
  const d = new Date(1970, 0, 1, h, m, 0)
  return d
}

export default function JadwalPage() {
  const [kelasId, setKelasId] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<JadwalFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const mapelMap = useMemo(
    () => new Map(mapelRecords.map((m) => [m.id, m])),
    [mapelRecords]
  )

  const guruMap = useMemo(
    () => new Map(guruRecords.map((g) => [g.id, g])),
    [guruRecords]
  )

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
      hari: "senin",
      jamMulai: "",
      jamSelesai: "",
      mataPelajaranId: "",
      guruId: "",
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
    })
    setFormOpen(true)
  }

  const entriesByDay = useMemo(() => {
    const map: Record<string, JadwalRecord[]> = {}
    for (const day of DAYS) {
      map[day] = []
    }
    for (const entry of jadwalRecords) {
      const day = entry.hari
      if (map[day]) {
        map[day].push(entry)
      }
    }
    for (const day of DAYS) {
      map[day].sort((a, b) => {
        const ta = a.jamMulai ? new Date(a.jamMulai).getTime() : 0
        const tb = b.jamMulai ? new Date(b.jamMulai).getTime() : 0
        return ta - tb
      })
    }
    return map
  }, [jadwalRecords])

  const hasData = Object.values(entriesByDay).some((arr) => arr.length > 0)

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
          <Button
            className="gap-2"
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
            disabled={!kelasId}
            onClick={openAdd}
          >
            <Plus className="h-4 w-4" /> Tambah
          </Button>
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
                    Jam
                  </th>
                  {DAYS.map((day) => (
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
                {(() => {
                  const allTimes = new Set<string>()
                  for (const entry of jadwalRecords) {
                    const key = `${formatTime(entry.jamMulai)} - ${formatTime(entry.jamSelesai)}`
                    allTimes.add(key)
                  }
                  const sortedTimes = Array.from(allTimes).sort()
                  if (sortedTimes.length === 0) {
                    return (
                      <tr>
                        <td
                          colSpan={DAYS.length + 1}
                          className="border border-border px-3 py-8 text-center text-muted-foreground"
                        >
                          Tidak ada jadwal
                        </td>
                      </tr>
                    )
                  }
                  return sortedTimes.map((timeSlot) => (
                    <tr key={timeSlot}>
                      <td className="border border-border px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {timeSlot}
                      </td>
                      {DAYS.map((day) => {
                        const entries = entriesByDay[day] ?? []
                        const match = entries.filter(
                          (e) => `${formatTime(e.jamMulai)} - ${formatTime(e.jamSelesai)}` === timeSlot
                        )
                        return (
                          <td key={day} className="border border-border px-2 py-1.5 align-top">
                            {match.length > 0 ? (
                              <div className="space-y-1">
                                {match.map((e) => {
                                  const mapel = mapelMap.get(e.mataPelajaranId)
                                  const guru = guruMap.get(e.guruId)
                                  return (
                                    <div
                                      key={e.id}
                                      className="group relative rounded-lg border border-[hsl(142_30%_80%)] bg-[hsl(142_50%_95%)] p-2 dark:border-[hsl(142_30%_30%)] dark:bg-[hsl(142_30%_15%)]"
                                    >
                                      <div className="text-xs font-medium leading-tight">
                                        {mapel?.namaMapel ?? "-"}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                        {guru?.namaLengkap ?? "-"}
                                      </div>
                                      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                                        <button
                                          onClick={() => openEdit(e)}
                                          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => setDeleteId(e.id)}
                                          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        )}

        {hasData && !isLoading && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
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
