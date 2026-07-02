"use client"

import { useState, useEffect } from "react"
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
  jamMulai: string
  jamSelesai: string
  mataPelajaranId: string
  guruId: string
}

const DAY_OPTIONS = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
]

interface MapelItem {
  id: string
  namaMapel: string
  kodeMapel?: string | null
}

interface GuruItem {
  id: string
  namaLengkap: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: JadwalFormData) => Promise<void>
  initial?: JadwalFormData | null
  mapelList: MapelItem[]
  guruList: GuruItem[]
  saving?: boolean
}

export default function JadwalFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  mapelList,
  guruList,
  saving,
}: Props) {
  const [hari, setHari] = useState("senin")
  const [jamMulai, setJamMulai] = useState("")
  const [jamSelesai, setJamSelesai] = useState("")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [guruId, setGuruId] = useState("")

  useEffect(() => {
    if (!open) return
    if (initial) {
      setHari(initial.hari || "senin")
      setJamMulai(initial.jamMulai || "")
      setJamSelesai(initial.jamSelesai || "")
      setMataPelajaranId(initial.mataPelajaranId || "")
      setGuruId(initial.guruId || "")
    } else {
      setHari("senin")
      setJamMulai("")
      setJamSelesai("")
      setMataPelajaranId("")
      setGuruId("")
    }
  }, [open, initial])

  const handleSubmit = async () => {
    if (!hari || !mataPelajaranId || !guruId || !jamMulai || !jamSelesai) return
    await onSubmit({
      id: initial?.id,
      hari,
      jamMulai,
      jamSelesai,
      mataPelajaranId,
      guruId,
    })
  }

  const isEdit = !!initial?.id
  const isValid = hari && mataPelajaranId && guruId && jamMulai && jamSelesai

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Jam Mulai <span className="text-destructive">*</span>
              </Label>
              <Input
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Jam Selesai <span className="text-destructive">*</span>
              </Label>
              <Input
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
              />
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
