"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Calendar, ClipboardList, Info, Landmark } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { parseLocalDate } from "@/lib/utils"

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
  const { data: activeSiswaList = [], isLoading: loadingSiswa } = api.siswa.getLookup.useQuery(
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
        tanggalMutasi: parseLocalDate(tanggalMutasi),
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
      <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800 tracking-tight uppercase">
              <div className="h-8 w-8 rounded-lg bg-teal-550/10 flex items-center justify-center text-teal-650">
                <ClipboardList className="h-4 w-4" />
              </div>
              <span>Catat Mutasi Siswa</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Catat mutasi siswa keluar dan perbarui status keaktifan siswa secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* 1 & 2. Dropdown Nama Siswa dengan Live Search */}
            <div className="space-y-1.5 text-left">
              <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Nama Siswa / NIS / NISN <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={studentOptions}
                value={siswaId}
                onValueChange={setSiswaId}
                placeholder="Cari nama atau NIS/NISN siswa..."
                searchPlaceholder="Ketik nama / NIS / NISN..."
                emptyMessage="Siswa aktif tidak ditemukan"
                loading={loadingSiswa}
                className="rounded-xl"
              />
            </div>

            {/* 3. Otomatisasi Data Pendukung (Read-Only) */}
            {selectedSiswa && (
              <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-2.5 shadow-xs text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                  <Info className="h-3.5 w-3.5 text-teal-600" />
                  <span>Detail Siswa Terpilih</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">Nama Lengkap</span>
                    <p className="font-bold text-slate-850 mt-0.5">{selectedSiswa.namaLengkap}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">Kelas</span>
                    <p className="font-bold text-slate-850 mt-0.5">{selectedSiswaKelas}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">NISN</span>
                    <p className="font-bold text-slate-850 mt-0.5">{selectedSiswa.nisn || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">NIS Lokal</span>
                    <p className="font-bold text-slate-850 mt-0.5">{selectedSiswa.nisLokal || "—"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* C.1. Tanggal Mutasi */}
            <div className="space-y-1.5 text-left">
              <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Tanggal Mutasi <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={tanggalMutasi}
                  onChange={(e) => setTanggalMutasi(e.target.value)}
                  className="pl-10 w-full"
                  required
                />
              </div>
            </div>

            {/* C.2. Jenis Mutasi */}
            <div className="space-y-1.5 text-left">
              <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Jenis Mutasi <span className="text-destructive">*</span></Label>
              <Select
                value={jenisMutasi}
                onValueChange={(v) => {
                  setJenisMutasi(v as JenisMutasiType)
                  if (v !== "Pindah Sekolah") {
                    setSekolahTujuan("")
                  }
                }}
              >
                <SelectTrigger className="rounded-xl">
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
                <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Sekolah Tujuan <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Landmark size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    value={sekolahTujuan}
                    onChange={(e) => setSekolahTujuan(e.target.value)}
                    placeholder="Masukkan nama sekolah tujuan..."
                    className="pl-10 w-full"
                    required
                  />
                </div>
              </div>
            )}

            {/* C.3. Alasan Mutasi */}
            <div className="space-y-1.5 text-left">
              <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Alasan Mutasi <span className="text-destructive">*</span></Label>
              <Textarea
                value={alasanMutasi}
                onChange={(e) => setAlasanMutasi(e.target.value)}
                placeholder="Tuliskan alasan mutasi siswa secara jelas..."
                rows={3}
                className="resize-none"
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Simpan Mutasi</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
