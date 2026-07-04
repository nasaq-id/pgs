"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Clock } from "lucide-react"
import { DAY_OPTIONS, timeToMinutes, minutesToTime } from "./constants"
import { Badge } from "@/components/ui/badge"

export interface JadwalFormData {
  id?: string
  hari: string
  jamMulai: string
  jamSelesai: string
  mataPelajaranId: string
  guruId: string
  jpMulai?: number | null
  jpCount?: number | null
}

interface MapelItem {
  id: string
  namaMapel: string
  kodeMapel?: string | null
}

interface GuruItem {
  id: string
  namaLengkap: string
}

interface PengaturanData {
  durasiJP: number
  jamMulai: string
  jamPulang: string
  hariAktif: string
}

interface AgendaData {
  id: string
  hari: string
  nama: string
  icon: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
}

interface ExistingJadwalItem {
  id: string
  hari: string
  jpMulai: number | null
  jpCount: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: JadwalFormData) => Promise<void>
  initial?: JadwalFormData | null
  mapelList: MapelItem[]
  guruList: GuruItem[]
  saving?: boolean
  pengaturan?: PengaturanData | null
  existingJadwal?: ExistingJadwalItem[]
  agendaKhusus?: AgendaData[]
}

export default function JadwalFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  mapelList,
  guruList,
  saving,
  pengaturan,
  existingJadwal = [],
  agendaKhusus = [],
}: Props) {
  const [hari, setHari] = useState("senin")
  const [jpCount, setJpCount] = useState(1)
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [guruId, setGuruId] = useState("")
  const [jpMulaiState, setJpMulaiState] = useState<number>(1)

  // Memos for selected dropdown labels to fix Radix/Base UI select trigger value display bugs
  const selectedMapelLabel = useMemo(() => {
    const m = mapelList.find((mpl) => mpl.id === mataPelajaranId)
    return m ? m.namaMapel : ""
  }, [mataPelajaranId, mapelList])

  const selectedGuruLabel = useMemo(() => {
    const g = guruList.find((gr) => gr.id === guruId)
    return g ? g.namaLengkap : ""
  }, [guruId, guruList])

  const selectedJpMulaiLabel = useMemo(() => {
    return jpMulaiState ? `JP ${jpMulaiState}` : ""
  }, [jpMulaiState])

  const durasiJP = pengaturan?.durasiJP ?? 40
  const startMinutes = pengaturan?.jamMulai ? timeToMinutes(pengaturan.jamMulai) : 420
  const endMinutes = pengaturan?.jamPulang ? timeToMinutes(pengaturan.jamPulang) : 900
  const totalJpSlots = Math.floor((endMinutes - startMinutes) / durasiJP)

  const academicJpMap = useMemo(() => {
    const map: { absoluteJp: number; academicJp: number | null }[] = []
    let academicCounter = 1

    for (let jp = 1; jp <= totalJpSlots; jp++) {
      const slotStart = startMinutes + (jp - 1) * durasiJP
      const slotEnd = startMinutes + jp * durasiJP

      const isAgenda = agendaKhusus.some((a) => {
        if (a.hari !== hari) return false
        const agendaStart = timeToMinutes(a.jamMulai)
        const agendaEnd = timeToMinutes(a.jamSelesai)
        return slotStart < agendaEnd && slotEnd > agendaStart
      })

      if (isAgenda) {
        map.push({ absoluteJp: jp, academicJp: null })
      } else {
        map.push({ absoluteJp: jp, academicJp: academicCounter++ })
      }
    }
    return map
  }, [hari, agendaKhusus, totalJpSlots, startMinutes, durasiJP])

  const academicSlots = useMemo(() => {
    return academicJpMap.filter((s) => s.academicJp !== null)
  }, [academicJpMap])

  const occupiedJpSlots = useMemo(() => {
    const occupied = new Set<number>()
    const hariEntries = existingJadwal.filter(
      (e) => e.hari === hari && e.jpMulai !== null && e.jpCount !== null
    )
    for (const entry of hariEntries) {
      if (entry.id === initial?.id) continue
      for (let i = 0; i < entry.jpCount!; i++) {
        occupied.add(entry.jpMulai! + i)
      }
    }
    return occupied
  }, [existingJadwal, hari, initial?.id])

  const suggestedJpMulai = useMemo(() => {
    const fromInitial = initial?.jpMulai ?? null
    if (fromInitial && !occupiedJpSlots.has(fromInitial)) return fromInitial
    let slot = 1
    // Find first empty academic JP slot
    while (occupiedJpSlots.has(slot)) {
      slot++
    }
    return slot
  }, [occupiedJpSlots, initial])

  useEffect(() => {
    if (!open) return
    if (initial) {
      setHari(initial.hari || "senin")
      setJpCount(initial.jpCount || 1)
      setMataPelajaranId(initial.mataPelajaranId || "")
      setGuruId(initial.guruId || "")
      setJpMulaiState(initial.jpMulai || 1)
    } else {
      setHari("senin")
      setJpCount(1)
      setMataPelajaranId("")
      setGuruId("")
      setJpMulaiState(suggestedJpMulai)
    }
  }, [open, initial, suggestedJpMulai])

  const autoJpMulai = jpMulaiState

  const computedTimes = useMemo(() => {
    const startSlot = academicSlots.find((s) => s.academicJp === autoJpMulai)
    const endSlot = academicSlots.find((s) => s.academicJp === autoJpMulai + jpCount - 1)

    const startAbs = startSlot ? startSlot.absoluteJp : autoJpMulai
    const endAbs = endSlot ? endSlot.absoluteJp : autoJpMulai + jpCount - 1

    const slotStartMin = startMinutes + (startAbs - 1) * durasiJP
    const slotEndMin = startMinutes + endAbs * durasiJP

    return {
      start: minutesToTime(slotStartMin),
      end: minutesToTime(slotEndMin),
    }
  }, [academicSlots, autoJpMulai, jpCount, startMinutes, durasiJP])

  const isEdit = !!initial?.id

  const handleSubmit = async () => {
    if (!hari || !mataPelajaranId || !guruId || !jpCount) return
    if (jpCount < 1 || jpCount > 5) return
    await onSubmit({
      id: initial?.id,
      hari,
      jamMulai: computedTimes.start,
      jamSelesai: computedTimes.end,
      mataPelajaranId,
      guruId,
      jpMulai: autoJpMulai,
      jpCount,
    })
  }

  const isValid = hari && mataPelajaranId && guruId && jpCount >= 1 && jpCount <= 5

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Hari <span className="text-destructive">*</span>
            </Label>
            <Select value={hari} onValueChange={(v) => v && setHari(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Jumlah JP <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-2">(maks. 5 JP)</span>
            </Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={jpCount}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (v >= 1 && v <= 5) setJpCount(v)
                else if (e.target.value === "") setJpCount(1)
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              JP Mulai (Jam Ke-) <span className="text-destructive">*</span>
            </Label>
            <Select value={String(jpMulaiState)} onValueChange={(v) => setJpMulaiState(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih JP Mulai">{selectedJpMulaiLabel || "Pilih JP Mulai"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {academicSlots.map((s) => (
                  <SelectItem key={s.academicJp} value={String(s.academicJp)}>
                    JP ke-{s.academicJp} (Slot {s.absoluteJp})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Posisi JP:</span>
              <Badge variant="secondary" className="font-mono">
                JP ke-{autoJpMulai} sampai {autoJpMulai + jpCount - 1}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estimasi Waktu:</span>
              <span className="font-mono text-xs font-semibold text-green-600 dark:text-green-400">
                {computedTimes.start} - {computedTimes.end}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Mata Pelajaran <span className="text-destructive">*</span>
            </Label>
            <Select value={mataPelajaranId} onValueChange={(v) => v && setMataPelajaranId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih mata pelajaran">{selectedMapelLabel || "Pilih mata pelajaran"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mapelList.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.namaMapel}
                    {m.kodeMapel ? ` (${m.kodeMapel})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Guru Pengampu <span className="text-destructive">*</span>
            </Label>
            <Select value={guruId} onValueChange={(v) => v && setGuruId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih guru">{selectedGuruLabel || "Pilih guru"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {guruList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.namaLengkap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !isValid}
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
