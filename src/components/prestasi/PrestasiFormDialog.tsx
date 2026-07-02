"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const TINGKAT_OPTIONS = [
  { value: "sekolah", label: "Sekolah" },
  { value: "kecamatan", label: "Kecamatan" },
  { value: "kabupaten", label: "Kabupaten" },
  { value: "provinsi", label: "Provinsi" },
  { value: "nasional", label: "Nasional" },
  { value: "internasional", label: "Internasional" },
]

interface SiswaOption {
  id: string
  namaLengkap: string
}

export interface PrestasiFormData {
  id?: string
  siswaId: string
  namaPrestasi: string
  tingkat?: string | null
  juara?: string | null
  tanggal?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: PrestasiFormData) => Promise<void>
  initial?: PrestasiFormData | null
  saving?: boolean
  siswaList: SiswaOption[]
}

export default function PrestasiFormDialog({ open, onClose, onSubmit, initial, saving, siswaList }: Props) {
  const [namaPrestasi, setNamaPrestasi] = useState("")
  const [siswaId, setSiswaId] = useState("")
  const [tingkat, setTingkat] = useState("")
  const [juara, setJuara] = useState("")
  const [tanggal, setTanggal] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setNamaPrestasi(initial.namaPrestasi ?? "")
      setSiswaId(initial.siswaId ?? "")
      setTingkat(initial.tingkat ?? "")
      setJuara(initial.juara ?? "")
      setTanggal(initial.tanggal ?? "")
    } else {
      setNamaPrestasi("")
      setSiswaId("")
      setTingkat("")
      setJuara("")
      setTanggal("")
    }
  }, [open, initial])

  const handleSubmit = async () => {
    if (!namaPrestasi.trim() || !siswaId) return
    setSubmitting(true)
    try {
      await onSubmit({
        id: initial?.id,
        siswaId,
        namaPrestasi: namaPrestasi.trim(),
        tingkat: tingkat || null,
        juara: juara.trim() || null,
        tanggal: tanggal || null,
      })
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const isLoading = saving || submitting

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay">
      <div className="glass-dialog rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="font-semibold text-foreground">Form Prestasi</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <Label className="w-24 text-right flex-shrink-0">Nama Prestasi</Label>
            <Input
              placeholder="Nama Prestasi"
              value={namaPrestasi}
              onChange={(e) => setNamaPrestasi(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-24 text-right flex-shrink-0">Siswa</Label>
            <Select value={siswaId} onValueChange={(v) => setSiswaId(v ?? "")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih Siswa" />
              </SelectTrigger>
              <SelectContent>
                {siswaList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.namaLengkap}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-24 text-right flex-shrink-0">Tingkat</Label>
            <Select value={tingkat} onValueChange={(v) => setTingkat(v ?? "")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih Tingkat" />
              </SelectTrigger>
              <SelectContent>
                {TINGKAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-24 text-right flex-shrink-0">Juara</Label>
            <Input
              placeholder="Juara (opsional)"
              value={juara}
              onChange={(e) => setJuara(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-24 text-right flex-shrink-0">Tanggal</Label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !namaPrestasi.trim() || !siswaId}>
            {isLoading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
