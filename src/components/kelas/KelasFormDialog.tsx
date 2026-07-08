"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Search, UserPlus } from "lucide-react"
import { api } from "@/lib/trpc/client"

const TINGKAT_OPTIONS = [
  { value: "Kelas 1", label: "I" },
  { value: "Kelas 2", label: "II" },
  { value: "Kelas 3", label: "III" },
  { value: "Kelas 4", label: "IV" },
  { value: "Kelas 5", label: "V" },
  { value: "Kelas 6", label: "VI" },
  { value: "Kelas 7", label: "VII" },
  { value: "Kelas 8", label: "VIII" },
  { value: "Kelas 9", label: "IX" },
  { value: "Kelas 10", label: "X" },
  { value: "Kelas 11", label: "XI" },
  { value: "Kelas 12", label: "XII" },
]

export interface KelasFormData {
  id?: string
  namaKelas: string
  tingkat: string
  waliKelasId?: string
  kapasitas?: number
  siswaIds: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: KelasFormData) => Promise<void>
  initial?: KelasFormData | null
  guruList: { id: string; namaLengkap: string }[]
  saving?: boolean
}

interface SiswaItem {
  id: string
  namaLengkap: string
  nisn: string
}

export default function KelasFormDialog({ open, onClose, onSubmit, initial, guruList, saving }: Props) {
  const [tingkat, setTingkat] = useState("")
  const [namaKelas, setNamaKelas] = useState("")
  const [waliKelasId, setWaliKelasId] = useState("")
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaItem[]>([])
  const [availableSiswa, setAvailableSiswa] = useState<SiswaItem[]>([])
  const [kapasitas, setKapasitas] = useState<number | undefined>(undefined)
  const [siswaSearch, setSiswaSearch] = useState("")
  const [loadingSiswa, setLoadingSiswa] = useState(false)

  const { data: allSiswa } = api.siswa.getAll.useQuery({})

  useEffect(() => {
    if (!open) return
    setTingkat(initial?.tingkat || "")
    setNamaKelas(initial?.namaKelas || "")
    setWaliKelasId(initial?.waliKelasId || "")
    setKapasitas(initial?.kapasitas ?? undefined)
    setSelectedSiswa([])
    setSiswaSearch("")

    if (allSiswa) {
      setLoadingSiswa(true)
      const kelasId = initial?.id
      const inClass = allSiswa
        .filter((s: any) => s.kelasId === kelasId)
        .map((s: any) => ({ id: s.id, namaLengkap: s.namaLengkap, nisn: s.nisn || "" }))
      const available = allSiswa
        .filter((s: any) => !s.kelasId)
        .map((s: any) => ({ id: s.id, namaLengkap: s.namaLengkap, nisn: s.nisn || "" }))
      setSelectedSiswa(inClass)
      setAvailableSiswa(available)
      setLoadingSiswa(false)
    }
  }, [open, initial, allSiswa])

  const filteredSiswa = useMemo(() => {
    if (!siswaSearch) return availableSiswa
    const q = siswaSearch.toLowerCase()
    return availableSiswa.filter((s) =>
      s.namaLengkap.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q)
    )
  }, [availableSiswa, siswaSearch])

  const addSiswa = (s: SiswaItem) => {
    setSelectedSiswa((prev) => [...prev, s])
    setAvailableSiswa((prev) => prev.filter((x) => x.id !== s.id))
  }

  const removeSiswa = (s: SiswaItem) => {
    setSelectedSiswa((prev) => prev.filter((x) => x.id !== s.id))
    setAvailableSiswa((prev) => [...prev, s].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap)))
  }

  const handleSubmit = async () => {
    if (!tingkat || !namaKelas.trim()) return
    try {
      await onSubmit({
        id: initial?.id,
        namaKelas: namaKelas.trim(),
        tingkat,
        waliKelasId: waliKelasId || undefined,
        kapasitas: kapasitas,
        siswaIds: selectedSiswa.map((s) => s.id),
      })
      onClose()
    } catch {
      // Error toast handled by parent
    }
  }

  const isEdit = !!initial?.id
  const isSaving = saving

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Ruang Kelas" : "Tambah Ruang Kelas"}</DialogTitle>
        </DialogHeader>

        {loadingSiswa ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tingkat <span className="text-destructive">*</span></Label>
              <Select value={tingkat} onValueChange={(v) => v && setTingkat(v)}>
                <SelectTrigger><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                <SelectContent>
                  {TINGKAT_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Kelas <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Contoh: A, B, Unggulan..."
                value={namaKelas}
                onChange={(e) => setNamaKelas(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kapasitas</Label>
              <Input
                type="number"
                min={0}
                placeholder="Contoh: 30"
                value={kapasitas ?? ""}
                onChange={(e) => setKapasitas(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Wali Kelas</Label>
              <Select value={waliKelasId} onValueChange={(v) => v && setWaliKelasId(v)}>
                <SelectTrigger><SelectValue placeholder="Pilih wali kelas">{guruList.find((g) => g.id === waliKelasId)?.namaLengkap || "Pilih wali kelas"}</SelectValue></SelectTrigger>
                <SelectContent>
                  {guruList.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Tambah Siswa
              </Label>

              {selectedSiswa.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/50 border border-border">
                  {selectedSiswa.map((s) => (
                    <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                      {s.namaLengkap}
                      <button onClick={() => removeSiswa(s)} className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari siswa yang belum punya kelas..."
                  className="pl-8"
                  value={siswaSearch}
                  onChange={(e) => setSiswaSearch(e.target.value)}
                />
              </div>

              {filteredSiswa.length > 0 ? (
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {filteredSiswa.slice(0, 50).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSiswa(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span className="font-medium">{s.namaLengkap}</span>
                      <span className="text-xs text-muted-foreground">{s.nisn}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {availableSiswa.length === 0 ? "Semua siswa sudah memiliki kelas" : "Tidak ditemukan"}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !tingkat || !namaKelas.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
