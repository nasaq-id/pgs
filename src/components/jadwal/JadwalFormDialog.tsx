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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/trpc/client"

export interface JadwalFormData {
  id?: string
  hari: string
  jamMulai?: string
  jamSelesai?: string
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

interface TimelineItemData {
  id: string
  tipe: string
  label: string | null
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

interface PengampuMapel {
  mataPelajaranId: string
  guruId: string
  guruNama: string
  mapelNama: string
  jumlahJam: number
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: JadwalFormData) => Promise<void>
  initial?: JadwalFormData | null
  mapelList: MapelItem[]
  guruList: GuruItem[]
  saving?: boolean
  existingJadwal?: ExistingJadwalItem[]
  timelineItems?: TimelineItemData[]
  contextHari?: string
  kelasId?: string
}

export default function JadwalFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  mapelList,
  saving,
  existingJadwal = [],
  timelineItems = [],
  contextHari,
  kelasId,
}: Props) {
  const [hari, setHari] = useState(contextHari || initial?.hari || "senin")
  const [jpCount, setJpCount] = useState(1)
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [guruId, setGuruId] = useState("")

  const { data: pengampuData } = api.pengampu.getByKelas.useQuery(
    { kelasId: kelasId ?? "" },
    { enabled: open && !!kelasId }
  )

  const { data: sisaJpData } = api.jadwal.getSisaJp.useQuery(
    { kelasId: kelasId ?? "" },
    { enabled: open && !!kelasId }
  )

  const pengampuMap = useMemo(() => {
    const map = new Map<string, PengampuMapel>()
    if (pengampuData) {
      for (const p of pengampuData) {
        map.set(p.mataPelajaranId, p)
      }
    }
    return map
  }, [pengampuData])

  const sisaJpMap = useMemo(() => {
    const map = new Map<string, number>()
    if (sisaJpData) {
      for (const s of sisaJpData) {
        map.set(s.mataPelajaranId, s.sisa)
      }
    }
    return map
  }, [sisaJpData])

  const selectedMapelLabel = useMemo(() => {
    const m = mapelList.find((mpl) => mpl.id === mataPelajaranId)
    return m ? m.namaMapel : ""
  }, [mataPelajaranId, mapelList])

  const selectedGuruLabel = useMemo(() => {
    if (!mataPelajaranId) return ""
    const p = pengampuMap.get(mataPelajaranId)
    return p?.guruNama ?? ""
  }, [mataPelajaranId, pengampuMap])

  const jpSlots = useMemo(() => {
    return timelineItems
      .filter((t) => t.tipe === "jp")
      .sort((a, b) => a.urutan - b.urutan)
  }, [timelineItems])

  const occupiedJpSlots = useMemo(() => {
    const occupied = new Set<number>()
    for (const entry of existingJadwal) {
      if (entry.hari !== hari) continue
      if (entry.id === initial?.id) continue
      if (entry.jpMulai !== null && entry.jpCount !== null) {
        for (let i = 0; i < entry.jpCount; i++) {
          occupied.add(entry.jpMulai + i)
        }
      }
    }
    return occupied
  }, [existingJadwal, hari, initial?.id])

  const availableSlots = useMemo(() => {
    const allJp = jpSlots.map((_, i) => i + 1)
    return allJp.filter((s) => !occupiedJpSlots.has(s))
  }, [jpSlots, occupiedJpSlots])

  const filteredMapel = useMemo(() => {
    if (initial) return mapelList
    return mapelList.filter((m) => {
      if (!kelasId) return true
      const sisa = sisaJpMap.get(m.id)
      if (sisa === undefined) return false
      return sisa > 0
    })
  }, [mapelList, sisaJpMap, kelasId, initial])

  const sisaForSelected = useMemo(() => {
    if (!mataPelajaranId) return 0
    return sisaJpMap.get(mataPelajaranId) ?? 0
  }, [mataPelajaranId, sisaJpMap])

  const maxJpCount = useMemo(() => {
    if (initial) return initial.jpCount ?? 5
    const sisa = sisaForSelected
    const availableCount = availableSlots.length
    return Math.min(sisa, availableCount, 5)
  }, [sisaForSelected, availableSlots, initial])

  useEffect(() => {
    if (!open) return
    if (initial) {
      setHari(initial.hari || contextHari || "senin")
      setJpCount(initial.jpCount || 1)
      setMataPelajaranId(initial.mataPelajaranId || "")
      setGuruId(initial.guruId || "")
    } else {
      setHari(contextHari || "senin")
      setJpCount(1)
      setMataPelajaranId("")
      setGuruId("")
    }
  }, [open, initial, contextHari])

  useEffect(() => {
    if (mataPelajaranId) {
      const p = pengampuMap.get(mataPelajaranId)
      setGuruId(p?.guruId ?? "")
    }
  }, [mataPelajaranId, pengampuMap])

  const isEdit = !!initial?.id

  const handleSubmit = async () => {
    if (!hari || !mataPelajaranId || !guruId || !jpCount) return
    await onSubmit({
      id: initial?.id,
      hari,
      jpMulai: null,
      jpCount,
      mataPelajaranId,
      guruId,
      jamMulai: undefined,
      jamSelesai: undefined,
    })
  }

  const isValid = hari && mataPelajaranId && guruId && jpCount >= 1 && jpCount <= 5

  const jpOptions = useMemo(() => {
    const options: number[] = []
    const max = Math.min(maxJpCount, 5)
    for (let i = 1; i <= max; i++) {
      options.push(i)
    }
    return options
  }, [maxJpCount])

  useEffect(() => {
    if (jpCount > maxJpCount && maxJpCount >= 1) {
      setJpCount(maxJpCount)
    }
  }, [maxJpCount, jpCount])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Mata Pelajaran <span className="text-destructive">*</span>
            </Label>
            <Select value={mataPelajaranId} onValueChange={(v) => v && setMataPelajaranId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih mata pelajaran">{selectedMapelLabel || "Pilih mata pelajaran"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredMapel.map((m) => {
                  const sisa = sisaJpMap.get(m.id)
                  const label = sisa !== undefined
                    ? `${m.namaMapel} ${m.kodeMapel ? `(${m.kodeMapel})` : ""} • Sisa ${sisa} JP`
                    : `${m.namaMapel}${m.kodeMapel ? ` (${m.kodeMapel})` : ""}`
                  return (
                    <SelectItem key={m.id} value={m.id}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {mataPelajaranId && pengampuMap.has(mataPelajaranId) && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-sm font-medium">
                Guru: {selectedGuruLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sisa alokasi: {sisaForSelected} JP
              </p>
            </div>
          )}

          {mataPelajaranId && (
            <div className="space-y-1.5">
              <Label>
                Durasi Alokasi (JP) <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground ml-2">
                  (maks. {maxJpCount} JP)
                </span>
              </Label>
              <Select
                value={String(jpCount)}
                onValueChange={(v) => v && setJpCount(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih durasi">{jpCount} JP</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {jpOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} JP
                      {!isEdit && sisaForSelected > 0 && n < sisaForSelected
                        ? ` (sisa ${sisaForSelected - n} JP)`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!initial && jpCount > availableSlots.length && (
                <p className="text-xs text-destructive mt-1">
                  Slot JP tersedia hanya {availableSlots.length}
                </p>
              )}
            </div>
          )}
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