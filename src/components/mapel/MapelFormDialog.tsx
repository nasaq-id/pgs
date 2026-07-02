"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const KELOMPOK_OPTIONS = [
  { value: "A", label: "Mata Pelajaran Wajib" },
  { value: "B", label: "Mata Pelajaran Pilihan" },
  { value: "muatan_lokal", label: "Muatan Lokal" },
]

export interface MapelFormData {
  id?: string
  namaMapel: string
  kodeMapel?: string
  kelompok?: string
  aktif?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: MapelFormData) => Promise<void>
  initial?: MapelFormData | null
  saving?: boolean
}

export default function MapelFormDialog({ open, onClose, onSubmit, initial, saving }: Props) {
  const [namaMapel, setNamaMapel] = useState("")
  const [kodeMapel, setKodeMapel] = useState("")
  const [kelompok, setKelompok] = useState("")
  const [aktif, setAktif] = useState("Aktif")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setNamaMapel(initial.namaMapel ?? "")
      setKodeMapel(initial.kodeMapel ?? "")
      setKelompok(initial.kelompok ?? "")
      setAktif(initial.aktif !== false ? "Aktif" : "Tidak Aktif")
    } else {
      setNamaMapel("")
      setKodeMapel("")
      setKelompok("")
      setAktif("Aktif")
    }
  }, [open, initial])

  const handleSubmit = async () => {
    if (!namaMapel.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        id: initial?.id,
        namaMapel: namaMapel.trim(),
        kodeMapel: kodeMapel.trim() || undefined,
        kelompok: kelompok || undefined,
        aktif: aktif === "Aktif",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Form Mata Pelajaran</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Nama</Label>
            <Input
              placeholder="Nama"
              value={namaMapel}
              onChange={(e) => setNamaMapel(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Kode</Label>
            <Input
              placeholder="Kode Mata Pelajaran"
              value={kodeMapel}
              onChange={(e) => setKodeMapel(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Kelompok</Label>
            <Select value={kelompok} onValueChange={(v) => setKelompok(v ?? "")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih Kelompok" />
              </SelectTrigger>
              <SelectContent>
                {KELOMPOK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Status</Label>
            <Select value={aktif} onValueChange={(v) => setAktif(v ?? "Aktif")}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aktif">Aktif</SelectItem>
                <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !namaMapel.trim()}>
            {isLoading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
