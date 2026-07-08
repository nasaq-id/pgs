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
import { Loader2 } from "lucide-react"

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
  /** Hari konteks (dari klik kolom hari di grid). Jika tidak disediakan, fallback ke initial.hari atau "senin". */
  contextHari?: string
}

export default function JadwalFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  mapelList,
  guruList,
  saving,
  existingJadwal = [],
  timelineItems = [],
  contextHari,
}: Props) {
  const [hari, setHari] = useState(contextHari || initial?.hari || "senin")
  const [jpCount, setJpCount] = useState(1)
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [guruId, setGuruId] = useState("")

  const selectedMapelLabel = useMemo(() => {
    const m = mapelList.find((mpl) => mpl.id === mataPelajaranId)
    return m ? m.namaMapel : ""
  }, [mataPelajaranId, mapelList])

  const selectedGuruLabel = useMemo(() => {
    const g = guruList.find((gr) => gr.id === guruId)
    return g ? g.namaLengkap : ""
  }, [guruId, guruList])

  const jpSlots = useMemo(() => {
    return timelineItems
      .filter((t) => t.tipe === "jp")
      .sort((a, b) => a.urutan - b.urutan)
  }, [timelineItems])

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

  const availableSlots = useMemo(() => {
    const allJp = jpSlots.map((_, i) => i + 1)
    return allJp.filter((s) => !occupiedJpSlots.has(s))
  }, [jpSlots, occupiedJpSlots])

  const canAutoMap = useMemo(() => {
    for (let start = 1; start <= jpSlots.length - jpCount + 1; start++) {
      let ok = true
      for (let offset = 0; offset < jpCount; offset++) {
        if (occupiedJpSlots.has(start + offset)) {
          ok = false
          break
        }
      }
      if (ok) return true
    }
    return false
  }, [jpSlots, jpCount, occupiedJpSlots])

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

  const isEdit = !!initial?.id

  const handleSubmit = async () => {
    if (!hari || !mataPelajaranId || !guruId || !jpCount) return
    if (jpCount < 1 || jpCount > 5) return
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            {!canAutoMap && !isEdit && (
              <p className="text-xs text-destructive mt-1">
                Slot JP tidak mencukupi untuk {jpCount} JP. Tersedia: {availableSlots.length} slot.
              </p>
            )}
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
