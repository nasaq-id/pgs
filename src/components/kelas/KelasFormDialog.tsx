"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, X, Search, UserPlus, Plus } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { TINGKAT_OPTIONS } from "@/components/jadwal/constants"

const JENJANG_TINGKAT_MAP: Record<string, { min: number; max: number }> = {
  sd: { min: 1, max: 6 },
  mi: { min: 1, max: 6 },
  smp: { min: 7, max: 9 },
  mts: { min: 7, max: 9 },
  sma: { min: 10, max: 12 },
  ma: { min: 10, max: 12 },
  smk: { min: 10, max: 12 },
}

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

  const { data: allSiswa } = api.siswa.getAll.useQuery({ status: "aktif_tanpa_rombel", limit: 1000, sortBy: "namaLengkap" })
  const { data: sekolah } = api.lembaga.getSekolah.useQuery()

  useEffect(() => {
    if (!open) return
    setTingkat(initial?.tingkat || "")
    
    // Auto-strip tingkat prefix if it matches
    const rawNamaKelas = initial?.namaKelas || ""
    const cleanTingkat = (initial?.tingkat || "").replace(/^(tingkat_|kelas_|kls_)/i, "").trim()
    if (cleanTingkat && rawNamaKelas.toLowerCase().startsWith(cleanTingkat.toLowerCase())) {
      setNamaKelas(rawNamaKelas.slice(cleanTingkat.length))
    } else {
      setNamaKelas(rawNamaKelas)
    }

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

  const filteredTingkat = useMemo(() => {
    if (!sekolah?.jenjang) return TINGKAT_OPTIONS
    const range = JENJANG_TINGKAT_MAP[sekolah.jenjang]
    if (!range) return TINGKAT_OPTIONS
    return TINGKAT_OPTIONS.slice(range.min - 1, range.max)
  }, [sekolah])

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
      const cleanTingkat = tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "").trim()
      let finalNamaKelas = namaKelas.trim()
      
      // Auto-prefix with cleanTingkat if user only typed the suffix (e.g., "A" -> "7A")
      if (cleanTingkat && !finalNamaKelas.toLowerCase().startsWith(cleanTingkat.toLowerCase())) {
        finalNamaKelas = `${cleanTingkat}${finalNamaKelas}`
      }

      await onSubmit({
        id: initial?.id,
        namaKelas: finalNamaKelas,
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
              <Select value={tingkat} onValueChange={(v) => v && setTingkat(v)} options={filteredTingkat}>
                <SelectTrigger><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                <SelectContent>
                  {filteredTingkat.map((t) => (
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
              <p className="text-xs text-muted-foreground">
                Tulis nama kelas saja tanpa angka tingkat. Contoh: <strong>A</strong>, <strong>B</strong>, <strong>Unggulan</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Select value={waliKelasId} onValueChange={(v) => v && setWaliKelasId(v)} options={guruList.map((g) => ({ value: g.id, label: g.namaLengkap }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih wali kelas" /></SelectTrigger>
                  <SelectContent>
                    {guruList.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Tambah Siswa
                {selectedSiswa.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({selectedSiswa.length} dipilih)</span>
                )}
              </Label>

              {selectedSiswa.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/50 border border-border">
                  {selectedSiswa.map((s) => (
                    <Badge key={s.id} variant="secondary" className="gap-1 pr-1 text-xs">
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
                  placeholder="Cari siswa..."
                  className="pl-8"
                  value={siswaSearch}
                  onChange={(e) => setSiswaSearch(e.target.value)}
                />
              </div>

              {filteredSiswa.length > 0 ? (
                <div className="max-h-52 overflow-y-auto border border-border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>NISN</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSiswa.slice(0, 100).map((s, i) => (
                        <TableRow key={s.id} className="hover:bg-muted/50">
                          <TableCell className="text-xs text-muted-foreground py-2">{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs py-2">{s.nisn}</TableCell>
                          <TableCell className="py-2">{s.namaLengkap}</TableCell>
                          <TableCell className="py-2">
                            <button
                              onClick={() => addSiswa(s)}
                              className="w-7 h-7 rounded-md border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary flex items-center justify-center transition-colors cursor-pointer"
                              title="Tambah siswa"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                  <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {availableSiswa.length === 0
                      ? "Semua siswa sudah memiliki kelas"
                      : "Tidak ditemukan"}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Menampilkan {filteredSiswa.length} siswa yang belum memiliki rombongan belajar
              </p>
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
