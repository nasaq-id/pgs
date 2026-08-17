"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  initialJp?: number | null
  mapelList: MapelItem[]
  guruList: GuruItem[]
  saving?: boolean
  existingJadwal?: ExistingJadwalItem[]
  timelineItems?: TimelineItemData[]
  contextHari?: string
  kelasId?: string
  onOpenPengaturan: () => void
}

export default function JadwalFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  initialJp,
  mapelList,
  saving,
  existingJadwal = [],
  contextHari,
  kelasId,
  onOpenPengaturan,
}: Props) {
  const [hari, setHari] = useState(contextHari || initial?.hari || "senin")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [guruId, setGuruId] = useState("")
  const [selectedJpMulai, setSelectedJpMulai] = useState<number | null>(null)

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

  const [jpCount, setJpCount] = useState<number>(1)
  const computedJpCount = jpCount

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

  const filteredMapel = useMemo(() => {
    return mapelList.filter((m) => {
      // If editing, always allow the currently selected mapel
      if (initial && initial.mataPelajaranId === m.id) return true
      const adaGuru = pengampuMap.has(m.id)
      return adaGuru
    })
  }, [mapelList, pengampuMap, initial])

  const hasGuru = mataPelajaranId && pengampuMap.has(mataPelajaranId)

  const sisaForSelected = useMemo(() => {
    if (!mataPelajaranId) return 0
    return sisaJpMap.get(mataPelajaranId) ?? 0
  }, [mataPelajaranId, sisaJpMap])

  const maxJpCount = useMemo(() => {
    const sisa = sisaForSelected
    // If editing, add back currently allocated JP
    const baseSisa = initial && initial.mataPelajaranId === mataPelajaranId
      ? sisa + (initial.jpCount ?? 0)
      : sisa
    return Math.max(10, baseSisa)
  }, [sisaForSelected, initial, mataPelajaranId])

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
      const initJpCount = initial.jpCount || 1
      setJpCount(initJpCount)
    } else {
      setHari(contextHari || "senin")
      setMataPelajaranId("")
      setGuruId("")
      setSelectedJpMulai(initialJp ?? null)
      setJpCount(1)
    }
  }, [open, initial, contextHari, durasiJP, initialJp])

  useEffect(() => {
    if (mataPelajaranId) {
      const p = pengampuMap.get(mataPelajaranId)
      setGuruId(p?.guruId ?? "")
      
      const sisa = sisaJpMap.get(mataPelajaranId) ?? 0
      const baseSisa = initial && initial.mataPelajaranId === mataPelajaranId
        ? sisa + (initial.jpCount ?? 0)
        : sisa
      const maxJp = Math.max(10, baseSisa)
      if (jpCount > maxJp) {
        setJpCount(1)
      }
    }
  }, [mataPelajaranId, pengampuMap, sisaJpMap, initial, durasiJP, jpCount])

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
    return null
  }, [selectedJpMulai, computedJpCount, occupiedJpSlots, mataPelajaranId, pengampuMap])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
              {isEdit ? "Edit Jadwal" : "Tambah Jadwal"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pr-1">
            <div className="space-y-1.5">
              <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">
                Mata Pelajaran <span className="text-destructive">*</span>
              </Label>
              <Select value={mataPelajaranId} onValueChange={(v) => v && setMataPelajaranId(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Pilih mata pelajaran">{selectedMapelLabel || "Pilih mata pelajaran"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredMapel.map((m) => {
                    const sisa = sisaJpMap.get(m.id) ?? 0
                    const total = pengampuMap.get(m.id)?.jumlahJam ?? 0
                    const label = `${m.namaMapel} (${m.kodeMapel || m.namaMapel}) • Sisa ${sisa} JP / ${total} JP`
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
              <div className="rounded-2xl border border-teal-100 bg-teal-50/30 px-4 py-3">
                <p className="text-xs font-bold text-teal-800">
                  Guru: {selectedGuruLabel}
                </p>
                <p className="text-[10px] text-teal-650 font-semibold mt-0.5">
                  Sisa alokasi: {sisaForSelected} JP ({sisaForSelected * durasiJP} menit)
                </p>
              </div>
            )}

            {mataPelajaranId && !pengampuMap.has(mataPelajaranId) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
                <p className="text-xs font-bold text-amber-700">
                  Guru belum diplotting
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  Silakan atur Plotting Pengajar terlebih dahulu
                </p>
              </div>
            )}

            {mataPelajaranId && (
              <div className="space-y-1.5">
                <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">
                  Durasi Alokasi (JP) <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(jpCount)}
                  onValueChange={(v) => {
                    if (v) {
                      const num = parseInt(v)
                      if (!isNaN(num)) {
                        setJpCount(num)
                      }
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Pilih durasi..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxJpCount }, (_, i) => i + 1).map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt} JP ({opt * durasiJP} menit)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  Maksimal alokasi yang tersedia untuk mata pelajaran ini adalah {maxJpCount} JP.
                </p>
              </div>
            )}

            {mataPelajaranId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">
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
                  onOpenPengaturan={onOpenPengaturan}
                />
                {validationError && (
                  <p className="text-xs text-destructive font-bold">{validationError}</p>
                )}
                {!validationError && selectedJpMulai && computedJpCount >= 1 && hasGuru && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-bold">
                    Akan ditempatkan di JP {selectedJpMulai}–{selectedJpMulai + computedJpCount - 1}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !isValid || !!validationError}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{isEdit ? "Simpan" : "Tambah"}</span>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
