"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const HARI_OPTIONS = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
  { value: "minggu", label: "Minggu" },
]

interface GuruOption {
  id: string
  namaLengkap: string
}

export interface EkstrakurikulerFormData {
  id?: string
  namaEkskul: string
  pembinaId?: string | null
  deskripsi?: string | null
  hari?: string | null
  jam?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: EkstrakurikulerFormData) => Promise<void>
  initial?: EkstrakurikulerFormData | null
  saving?: boolean
  guruList: GuruOption[]
}

export default function EkstrakurikulerFormDialog({ open, onClose, onSubmit, initial, saving, guruList }: Props) {
  const [namaEkskul, setNamaEkskul] = useState("")
  const [pembinaId, setPembinaId] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [hari, setHari] = useState("")
  const [jam, setJam] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setNamaEkskul(initial.namaEkskul ?? "")
      setPembinaId(initial.pembinaId ?? "")
      setDeskripsi(initial.deskripsi ?? "")
      setHari(initial.hari ?? "")
      setJam(initial.jam ?? "")
    } else {
      setNamaEkskul("")
      setPembinaId("")
      setDeskripsi("")
      setHari("")
      setJam("")
    }
  }, [open, initial])

  const handleSubmit = async () => {
    if (!namaEkskul.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        id: initial?.id,
        namaEkskul: namaEkskul.trim(),
        pembinaId: pembinaId || null,
        deskripsi: deskripsi.trim() || null,
        hari: hari || null,
        jam: jam.trim() || null,
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
          <h3 className="font-semibold text-foreground">Form Ekstrakurikuler</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] rounded-lg h-7 w-7 flex items-center justify-center transition-all duration-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Nama Ekskul</Label>
            <Input
              placeholder="Nama Ekstrakurikuler"
              value={namaEkskul}
              onChange={(e) => setNamaEkskul(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Pembina</Label>
            <Select value={pembinaId} onValueChange={(v) => setPembinaId(v ?? "")} options={guruList.map((g) => ({ value: g.id, label: g.namaLengkap }))}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih Pembina" />
              </SelectTrigger>
              <SelectContent>
                {guruList.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Hari</Label>
            <Select value={hari} onValueChange={(v) => setHari(v ?? "")} options={HARI_OPTIONS}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih Hari" />
              </SelectTrigger>
              <SelectContent>
                {HARI_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Jam</Label>
            <Input
              placeholder="Contoh: 14:00 - 16:00"
              value={jam}
              onChange={(e) => setJam(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-start gap-4">
            <Label className="w-20 text-right flex-shrink-0 mt-2">Deskripsi</Label>
            <Textarea
              placeholder="Deskripsi ekstrakurikuler (opsional)"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="flex-1 min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer">
          <button 
            type="button"
            onClick={onClose} 
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-80"
          >
            Batal
          </button>
          <button 
            type="button"
            onClick={handleSubmit} 
            disabled={isLoading || !namaEkskul.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95"
          >
            {isLoading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  )
}
