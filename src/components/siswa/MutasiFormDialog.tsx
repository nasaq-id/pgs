"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Loader2, Calendar, ClipboardList, Info, Landmark } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"

interface MutasiFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type JenisMutasiType = "Pindah Sekolah" | "Mengundurkan Diri" | "Dikeluarkan" | "Meninggal Dunia"

export default function MutasiFormDialog({ open, onOpenChange, onSuccess }: MutasiFormDialogProps) {
  const [siswaId, setSiswaId] = useState("")
  const [tanggalMutasi, setTanggalMutasi] = useState("")
  const [jenisMutasi, setJenisMutasi] = useState<JenisMutasiType>("Pindah Sekolah")
  const [alasanMutasi, setAlasanMutasi] = useState("")
  const [sekolahTujuan, setSekolahTujuan] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: activeSiswaList = [], isLoading: loadingSiswa } = api.siswa.getAll.useQuery(
    { status: "aktif", limit: 1000 },
    { enabled: open }
  )

  const createMutasiMutation = api.siswa.createMutasi.useMutation()

  // Reset form when dialog is opened/closed
  useEffect(() => {
    if (open) {
      setSiswaId("")
      setTanggalMutasi(new Date().toISOString().split("T")[0])
      setJenisMutasi("Pindah Sekolah")
      setAlasanMutasi("")
      setSekolahTujuan("")
    }
  }, [open])

  const selectedSiswa = useMemo(() => {
    return activeSiswaList.find((s) => s.id === siswaId)
  }, [activeSiswaList, siswaId])

  const selectedSiswaKelas = useMemo(() => {
    if (!selectedSiswa || !kelasList) return "Tanpa Kelas"
    const k = kelasList.find((k) => k.id === selectedSiswa.kelasId)
    return k ? `${k.tingkat ?? ""} - ${k.namaKelas}` : "Tanpa Kelas"
  }, [selectedSiswa, kelasList])

  const studentOptions = useMemo(() => {
    return activeSiswaList.map((s) => {
      const k = kelasList?.find((kl) => kl.id === s.kelasId)
      const kelasLabel = k ? `${k.tingkat ?? ""} - ${k.namaKelas}` : "Tanpa Kelas"
      return {
        value: s.id,
        label: `${s.namaLengkap} (NISN: ${s.nisn || "-"} | ${kelasLabel})`,
      }
    })
  }, [activeSiswaList, kelasList])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!siswaId) {
      toast.error("Nama siswa wajib dipilih")
      return
    }
    if (!tanggalMutasi) {
      toast.error("Tanggal mutasi wajib diisi")
      return
    }
    if (!jenisMutasi) {
      toast.error("Jenis mutasi wajib dipilih")
      return
    }
    if (!alasanMutasi.trim()) {
      toast.error("Alasan mutasi wajib diisi")
      return
    }
    if (jenisMutasi === "Pindah Sekolah" && !sekolahTujuan.trim()) {
      toast.error("Sekolah tujuan wajib diisi untuk jenis mutasi Pindah Sekolah")
      return
    }

    setSaving(true)
    try {
      await createMutasiMutation.mutateAsync({
        siswaId,
        tanggalMutasi: new Date(tanggalMutasi + "T00:00:00"),
        jenisMutasi,
        alasanMutasi,
        sekolahTujuan: jenisMutasi === "Pindah Sekolah" ? sekolahTujuan.trim() : null,
      })
      toast.success("Catatan mutasi berhasil disimpan")
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan catatan mutasi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-teal-605" />
            </div>
            Catat Mutasi Siswa
          </DialogTitle>
          <DialogDescription>
            Catat mutasi siswa keluar dan perbarui status keaktifan siswa secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {/* 1 & 2. Dropdown Nama Siswa dengan Live Search */}
          <div className="space-y-1.5 text-left">
            <Label className="text-sm font-semibold">Nama Siswa / NIS / NISN <span className="text-destructive">*</span></Label>
            <SearchableSelect
              options={studentOptions}
              value={siswaId}
              onValueChange={setSiswaId}
              placeholder="Cari nama atau NIS/NISN siswa..."
              searchPlaceholder="Ketik nama / NIS / NISN..."
              emptyMessage="Siswa aktif tidak ditemukan"
              loading={loadingSiswa}
              className="border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* 3. Otomatisasi Data Pendukung (Read-Only) */}
          {selectedSiswa && (
            <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 space-y-2 shadow-xs text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                <Info className="h-3.5 w-3.5 text-teal-600" />
                <span>Detail Siswa Terpilih</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">Nama Lengkap</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSiswa.namaLengkap}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">Kelas</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSiswaKelas}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">NISN</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSiswa.nisn || "—"}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">NIS Lokal</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedSiswa.nisLokal || "—"}</p>
                </div>
              </div>
            </div>
          )}

          {/* C.1. Tanggal Mutasi */}
          <div className="space-y-1.5 text-left">
            <Label className="text-sm font-semibold">Tanggal Mutasi <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                type="date"
                value={tanggalMutasi}
                onChange={(e) => setTanggalMutasi(e.target.value)}
                className="w-full pl-3 pr-10 border-slate-200 dark:border-slate-800"
                required
              />
            </div>
          </div>

          {/* C.2. Jenis Mutasi */}
          <div className="space-y-1.5 text-left">
            <Label className="text-sm font-semibold">Jenis Mutasi <span className="text-destructive">*</span></Label>
            <Select
              value={jenisMutasi}
              onValueChange={(v) => {
                setJenisMutasi(v as JenisMutasiType)
                if (v !== "Pindah Sekolah") {
                  setSekolahTujuan("")
                }
              }}
            >
              <SelectTrigger className="border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Pilih Jenis Mutasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pindah Sekolah">Pindah Sekolah</SelectItem>
                <SelectItem value="Mengundurkan Diri">Mengundurkan Diri</SelectItem>
                <SelectItem value="Dikeluarkan">Dikeluarkan</SelectItem>
                <SelectItem value="Meninggal Dunia">Meninggal Dunia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* C.4. Sekolah Tujuan / Keterangan Lanjutan (Hanya jika Pindah Sekolah) */}
          {jenisMutasi === "Pindah Sekolah" && (
            <div className="space-y-1.5 text-left animate-fade-in">
              <Label className="text-sm font-semibold">Sekolah Tujuan <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type="text"
                  value={sekolahTujuan}
                  onChange={(e) => setSekolahTujuan(e.target.value)}
                  placeholder="Masukkan nama sekolah tujuan..."
                  className="pl-9 border-slate-200 dark:border-slate-800"
                  required
                />
                <Landmark className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          )}

          {/* C.3. Alasan Mutasi */}
          <div className="space-y-1.5 text-left">
            <Label className="text-sm font-semibold">Alasan Mutasi <span className="text-destructive">*</span></Label>
            <Textarea
              value={alasanMutasi}
              onChange={(e) => setAlasanMutasi(e.target.value)}
              placeholder="Tuliskan alasan mutasi siswa secara jelas..."
              rows={3}
              className="resize-none border-slate-200 dark:border-slate-800"
              required
            />
          </div>

          <DialogFooter className="pt-2 flex-shrink-0 !mx-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-xl border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl cursor-pointer"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Mutasi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
