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

  const durasiJP = pengaturan?.durasiJP ?? 40
  const startMinutes = pengaturan?.jamMulai ? timeToMinutes(pengaturan.jamMulai) : 420

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
    const hariAgenda = agendaKhusus.filter((a) => a.hari === hari)
    for (const agenda of hariAgenda) {
      const startJp = Math.floor((timeToMinutes(agenda.jamMulai) - startMinutes) / durasiJP) + 1
      const endJp = Math.floor((timeToMinutes(agenda.jamSelesai) - startMinutes - 1) / durasiJP) + 1
      for (let i = startJp; i <= endJp; i++) {
        if (i > 0) occupied.add(i)
      }
    }
    return occupied
  }, [existingJadwal, agendaKhusus, hari, durasiJP, startMinutes, initial?.id])

  const suggestedJpMulai = useMemo(() => {
    const fromInitial = initial?.jpMulai ?? null
    if (fromInitial && !occupiedJpSlots.has(fromInitial)) return fromInitial
    let slot = 1
    while (occupiedJpSlots.has(slot)) {
      slot++
    }
    return slot
  }, [occupiedJpSlots, initial])

  const autoJpMulai = suggestedJpMulai

  const computedJamMulai = minutesToTime(startMinutes + (autoJpMulai - 1) * durasiJP)
  const computedJamSelesai = minutesToTime(startMinutes + (autoJpMulai - 1 + jpCount) * durasiJP)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setHari(initial.hari || "senin")
      setJpCount(initial.jpCount || 1)
      setMataPelajaranId(initial.mataPelajaranId || "")
      setGuruId(initial.guruId || "")
    } else {
      setHari("senin")
      setJpCount(1)
      setMataPelajaranId("")
      setGuruId("")
    }
  }, [open, initial])

  const isEdit = !!initial?.id

  const handleSubmit = async () => {
    if (!hari || !mataPelajaranId || !guruId || !jpCount) return
    if (jpCount < 1 || jpCount > 5) return
    await onSubmit({
      id: initial?.id,
      hari,
      jamMulai: computedJamMulai,
      jamSelesai: computedJamSelesai,
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

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Posisi JP:</span>
              <Badge variant="secondary" className="font-mono">
                JP ke-{autoJpMulai}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Waktu:</span>
              <span className="font-mono text-xs">
                {computedJamMulai} - {computedJamSelesai}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Mata Pelajaran <span className="text-destructive">*</span>
            </Label>
            <Select value={mataPelajaranId} onValueChange={(v) => v && setMataPelajaranId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih mata pelajaran" />
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
                <SelectValue placeholder="Pilih guru" />
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
