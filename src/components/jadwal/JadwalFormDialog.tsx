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
import { api } from "@/lib/trpc/client"
import TimelineView from "./TimelineView"

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
  contextHari,
  kelasId,
}: Props) {
  const [hari, setHari] = useState(contextHari || initial?.hari || "senin")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [guruId, setGuruId] = useState("")
  const [selectedJpMulai, setSelectedJpMulai] = useState<number | null>(null)
  const [durasiMenit, setDurasiMenit] = useState(40)

  const { data: pengampuData } = api.pengampu.getByKelas.useQuery(
    { kelasId: kelasId ?? "" },
    { enabled: open && !!kelasId }
  )

  const { data: sisaJpData } = api.jadwal.getSisaJp.useQuery(
    { kelasId: kelasId ?? "" },
    { enabled: open && !!kelasId }
  )

  const { data: timelineData, isLoading: timelineLoading } = api.jadwal.getTimelineWithJadwal.useQuery(
    { kelasId: kelasId ?? "", hari: hari as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu" },
    { enabled: open && !!kelasId && !!hari }
  )

  const durasiJP = timelineData?.durasiJP ?? 40

  const computedJpCount = useMemo(() => {
    if (!durasiMenit || durasiMenit < 1) return 0
    return Math.ceil(durasiMenit / durasiJP)
  }, [durasiMenit, durasiJP])

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

  const filteredMapel = mapelList

  const hasGuru = mataPelajaranId && pengampuMap.has(mataPelajaranId)

  const sisaForSelected = useMemo(() => {
    if (!mataPelajaranId) return 0
    return sisaJpMap.get(mataPelajaranId) ?? 0
  }, [mataPelajaranId, sisaJpMap])

  const maxJpCount = useMemo(() => {
    if (initial) return initial.jpCount ?? 5
    if (sisaForSelected > 0) return Math.min(sisaForSelected, 5)
    return 1
  }, [sisaForSelected, initial])

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

  useEffect(() => {
    if (!open) return
    if (initial) {
      setHari(initial.hari || contextHari || "senin")
      setMataPelajaranId(initial.mataPelajaranId || "")
      setGuruId(initial.guruId || "")
      setSelectedJpMulai(initial.jpMulai ?? null)
      if (initial.jpCount) {
        setDurasiMenit(initial.jpCount * durasiJP)
      } else {
        setDurasiMenit(40)
      }
    } else {
      setHari(contextHari || "senin")
      setMataPelajaranId("")
      setGuruId("")
      setSelectedJpMulai(null)
      setDurasiMenit(40)
    }
  }, [open, initial, contextHari, durasiJP])

  useEffect(() => {
    if (mataPelajaranId) {
      const p = pengampuMap.get(mataPelajaranId)
      setGuruId(p?.guruId ?? "")
    }
  }, [mataPelajaranId, pengampuMap])

  useEffect(() => {
    if (computedJpCount > maxJpCount && maxJpCount >= 1) {
      setDurasiMenit(maxJpCount * durasiJP)
    }
  }, [computedJpCount, maxJpCount, durasiJP])

  const isEdit = !!initial?.id

  const handleTimelineSelect = (jpMulai: number | null) => {
    setSelectedJpMulai(jpMulai)
  }

  const handleSubmit = async () => {
    if (!hari || !mataPelajaranId || !guruId || computedJpCount < 1) return
    await onSubmit({
      id: initial?.id,
      hari,
      jpMulai: selectedJpMulai,
      jpCount: computedJpCount,
      mataPelajaranId,
      guruId,
      jamMulai: undefined,
      jamSelesai: undefined,
    })
  }

  const isValid = hari && mataPelajaranId && guruId && computedJpCount >= 1 && selectedJpMulai !== null

  const validationError = useMemo(() => {
    if (!mataPelajaranId || !selectedJpMulai || !computedJpCount) return null
    if (!pengampuMap.has(mataPelajaranId)) {
      return "Guru belum diplotting, tidak bisa menyimpan jadwal"
    }
    for (let i = 0; i < computedJpCount; i++) {
      if (occupiedJpSlots.has(selectedJpMulai + i)) {
        return "Slot yang dipilih bertabrakan dengan jadwal lain"
      }
    }
    if (computedJpCount > maxJpCount) {
      return `Melebihi sisa alokasi (maks ${maxJpCount} JP)`
    }
    return null
  }, [selectedJpMulai, computedJpCount, occupiedJpSlots, maxJpCount, mataPelajaranId, pengampuMap])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
                  const adaGuru = pengampuMap.has(m.id)
                  const label = adaGuru && sisa !== undefined
                    ? `${m.namaMapel} ${m.kodeMapel ? `(${m.kodeMapel})` : ""} • Sisa ${sisa} JP • ${pengampuMap.get(m.id)?.guruNama}`
                    : `${m.namaMapel}${m.kodeMapel ? ` (${m.kodeMapel})` : ""} • Belum diplot`
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
                Sisa alokasi: {sisaForSelected} JP ({sisaForSelected * durasiJP} menit)
              </p>
            </div>
          )}

          {mataPelajaranId && !pengampuMap.has(mataPelajaranId) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10 px-3 py-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Guru belum diplotting
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                Silakan atur Plotting Pengajar terlebih dahulu
              </p>
            </div>
          )}

          {mataPelajaranId && (
            <div className="space-y-1.5">
              <Label>
                Durasi (menit) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={durasiJP}
                max={maxJpCount * durasiJP}
                step={5}
                value={durasiMenit}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v >= 1) setDurasiMenit(v)
                }}
              />
              <p className="text-xs text-muted-foreground">
                {computedJpCount >= 1
                  ? `= ${computedJpCount} JP (${computedJpCount * durasiJP} menit)`
                  : "Masukkan durasi dalam menit"}
                {computedJpCount > maxJpCount && sisaForSelected > 0 && (
                  <span className="text-destructive ml-2">
                    · melebihi sisa alokasi (maks {maxJpCount} JP / {maxJpCount * durasiJP} menit)
                  </span>
                )}
              </p>
            </div>
          )}

          {mataPelajaranId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Pilih Slot JP <span className="text-destructive">*</span>
                </Label>
                {timelineLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <TimelineView
                timelineItems={timelineData?.timelineItems ?? []}
                existingJadwal={timelineData?.jadwalList ?? existingJadwal}
                selectedJpMulai={selectedJpMulai}
                selectedJpCount={computedJpCount}
                onSelect={handleTimelineSelect}
                excludeId={initial?.id}
              />
              {validationError && (
                <p className="text-xs text-destructive">{validationError}</p>
              )}
              {!validationError && selectedJpMulai && computedJpCount >= 1 && hasGuru && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Akan ditempatkan di JP {selectedJpMulai}–{selectedJpMulai + computedJpCount - 1}
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
            disabled={saving || !isValid || !!validationError}
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
