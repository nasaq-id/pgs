"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Loader2, FileText, Video, ImageIcon, Link2, Upload, ImagePlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/imageUtils"
import { useSession } from "next-auth/react"

export interface EMateriFormData {
  id?: string
  mataPelajaranId: string
  kelasId?: string | null
  tingkat?: string | null
  judul: string
  bab?: string | null
  deskripsi?: string | null
  tipeMateri: "dokumen" | "video" | "gambar" | "link"
  url?: string | null
  coverUrl?: string | null
  guruId?: string | null
  status: "terbit" | "draf" | "arsip"
}

interface MapelOption {
  id: string
  namaMapel: string
  kodeMapel?: string | null
  tingkat?: string | null
  kategori?: string | null
}

interface KelasOption {
  id: string
  namaKelas: string
  tingkat: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: EMateriFormData) => Promise<void>
  initial?: EMateriFormData | null
  saving?: boolean
  /** Mapel yang sedang dibuka (dari layar detail mapel) — terkunci otomatis */
  contextMapelId?: string | null
  /** Daftar mapel yang diploting ke guru yang sedang login */
  assignedMapel?: MapelOption[] | null
}

export function formatTingkatLabel(tingkat?: string | null): string {
  if (!tingkat || tingkat === "semua" || tingkat === "all") return "Semua Tingkat"
  const clean = tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "").trim()
  if (!clean) return "Umum"
  if (/^(kelas|sd|smp|sma|smk|madrasah)/i.test(clean)) return clean
  return `Kelas ${clean}`
}

const TIPE_OPTIONS = [
  { type: "dokumen" as const, label: "Dokumen", sub: "PDF, Word, PPT", icon: FileText },
  { type: "video" as const, label: "Video", sub: "YouTube / MP4", icon: Video },
  { type: "gambar" as const, label: "Gambar", sub: "Bagan / Infografis", icon: ImageIcon },
  { type: "link" as const, label: "Link", sub: "Web / Drive", icon: Link2 },
]

export default function EMateriFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
  contextMapelId,
  assignedMapel,
}: Props) {
  const { data: session } = useSession()
  const userRole = session?.user?.role

  const [mataPelajaranId, setMataPelajaranId] = useState(contextMapelId || "")
  const [kelasId, setKelasId] = useState("")
  const [judul, setJudul] = useState("")
  const [bab, setBab] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [tipeMateri, setTipeMateri] = useState<EMateriFormData["tipeMateri"]>("dokumen")
  const [url, setUrl] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [status, setStatus] = useState<"terbit" | "draf" | "arsip">("terbit")
  const [submitting, setSubmitting] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 100 }, { enabled: open })
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 }, { enabled: open })

  const mapelRecords = useMemo(() => (mapelList ?? []) as MapelOption[], [mapelList])
  const kelasRecords = useMemo(() => (kelasList ?? []) as KelasOption[], [kelasList])

  // Mapel yang tersedia untuk dipilih — guru dibatasi ke ploting tugasnya
  const availableMapel = useMemo(() => {
    const isAdmin = userRole === "super_admin" || userRole === "admin_sekolah" || userRole === "tu"
    if (isAdmin) return mapelRecords
    if (assignedMapel && assignedMapel.length > 0) return assignedMapel
    return mapelRecords
  }, [userRole, assignedMapel, mapelRecords])

  // Pilih mapel default saat form dibuka
  useEffect(() => {
    if (!open) return
    if (initial) {
      setMataPelajaranId(initial.mataPelajaranId ?? "")
      setKelasId(initial.kelasId || "")
      setJudul(initial.judul ?? "")
      setBab(initial.bab ?? "")
      setDeskripsi(initial.deskripsi ?? "")
      setTipeMateri(initial.tipeMateri ?? "dokumen")
      setUrl(initial.url ?? "")
      setCoverUrl(initial.coverUrl ?? "")
      setStatus(initial.status ?? "terbit")
    } else {
      setMataPelajaranId(contextMapelId || "")
      setKelasId("")
      setJudul("")
      setBab("")
      setDeskripsi("")
      setTipeMateri("dokumen")
      setUrl("")
      setCoverUrl("")
      setStatus("terbit")
    }
  }, [open, initial, contextMapelId])

  const isMapelLocked = !!contextMapelId

  // Mapel tunggal untuk guru — terkunci otomatis
  useEffect(() => {
    if (!open || initial || isMapelLocked) return
    if (userRole === "guru" && availableMapel.length === 1 && !mataPelajaranId) {
      setMataPelajaranId(availableMapel[0].id)
    }
  }, [open, initial, isMapelLocked, userRole, availableMapel, mataPelajaranId])

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file, 500, 500, 0.65)
      setCoverUrl(compressed)
    } catch {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setCoverUrl(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mataPelajaranId || !judul.trim()) return
    // Kelas penerima wajib dipilih — materi tidak boleh global tanpa target
    if (!kelasId) return

    const selectedKelasObj = kelasRecords.find((k) => k.id === kelasId)
    const tingkat = selectedKelasObj?.tingkat ?? (kelasId !== "all" ? kelasId : null)

    setSubmitting(true)
    try {
      await onSubmit({
        id: initial?.id,
        mataPelajaranId,
        kelasId: kelasId === "all" ? null : (kelasId || null),
        tingkat,
        judul,
        bab: bab || null,
        deskripsi: deskripsi || null,
        tipeMateri,
        url: url.trim() || null,
        coverUrl: coverUrl.trim() || null,
        status,
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedMapelObj = mapelRecords.find((m) => m.id === mataPelajaranId)
  const urlRequired = tipeMateri !== "gambar"

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <DialogTitle className="text-xl font-extrabold tracking-tight">
              {initial ? "Ubah Materi Pembelajaran" : "Unggah Materi Baru"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedMapelObj
                ? `MAPEL: ${selectedMapelObj.namaMapel}${selectedMapelObj.tingkat ? ` (${formatTingkatLabel(selectedMapelObj.tingkat)})` : ""}`
                : "Lengkapi informasi materi digital untuk diakses oleh siswa"}
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmitForm} className="space-y-5 pt-3">
          {/* Mata Pelajaran */}
          <div className="space-y-1.5">
            {isMapelLocked || (userRole === "guru" && availableMapel.length === 1) ? (
              <div className="bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider block">Mata Pelajaran Target</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {selectedMapelObj?.namaMapel || "Mata Pelajaran"}{" "}
                    {selectedMapelObj?.tingkat ? `(${formatTingkatLabel(selectedMapelObj.tingkat)})` : ""}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-teal-700 bg-teal-100/80 dark:bg-teal-900/60 px-2.5 py-1 rounded-lg">
                  {selectedMapelObj?.kategori || "Mapel"}
                </span>
              </div>
            ) : (
              <>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                 {userRole === "guru" && <span className="text-teal-600 font-bold normal-case"> (Mapel Ploting Tugas Anda)</span>}
                 {(userRole === "admin_sekolah" || userRole === "kepsek") && <span className="text-teal-600 font-bold normal-case"> (Akses Admin — Semua Mapel)</span>}
                </Label>
                <SearchableSelect
                  options={availableMapel.map((m) => ({
                    value: m.id,
                    label: `${m.namaMapel}${m.kodeMapel ? ` (${m.kodeMapel})` : ""}${m.tingkat ? ` • ${formatTingkatLabel(m.tingkat)}` : ""}`,
                  }))}
                  value={mataPelajaranId}
                  onValueChange={(v) => setMataPelajaranId(v)}
                  placeholder="-- Pilih Mata Pelajaran --"
                  searchPlaceholder="Cari mata pelajaran..."
                  className="rounded-2xl h-10"
                />
              </>
            )}
          </div>

          {/* Judul & Bab */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Judul Materi <span className="text-rose-500">*</span>
              </Label>
              <Input
                required
                placeholder="Contoh: Konsep Dasar Trigonometri & Sudut Istimewa"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className="rounded-2xl h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Bab / Modul <span className="text-slate-400 font-normal">(Opsional)</span>
              </Label>
              <Input
                placeholder="Bab 1 / Modul 2"
                value={bab}
                onChange={(e) => setBab(e.target.value)}
                className="rounded-2xl h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ringkasan / Pengantar Materi
            </Label>
            <Textarea
              rows={2}
              placeholder="Berikan ringkasan singkat mengenai materi ini..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm"
            />
          </div>

          {/* Tipe Materi */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Jenis Materi <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TIPE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = tipeMateri === opt.type
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setTipeMateri(opt.type)}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2",
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 shadow-sm ring-1 ring-teal-500/30"
                        : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isSelected ? "bg-teal-500 text-white" : "bg-slate-200/70 dark:bg-slate-800 text-slate-500")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs leading-tight">{opt.label}</h5>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Target Kelas — wajib dipilih */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kelas Penerima / Target <span className="text-rose-500">*</span>
            </Label>
            <Select value={kelasId} onValueChange={(v) => setKelasId(v ?? "")}>
              <SelectTrigger className="rounded-2xl h-10">
                <SelectValue placeholder="Pilih Kelas / Tingkat..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" label="Semua Tingkat">Semua Tingkat</SelectItem>
                {kelasRecords.map((k) => {
                  const labelStr = `${k.namaKelas}${k.tingkat ? ` (${formatTingkatLabel(k.tingkat)})` : ""}`
                  return (
                    <SelectItem key={k.id} value={k.id} label={labelStr}>
                      {labelStr}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {!kelasId && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 pl-1">
                Pilih kelas penerima untuk materi ini (misal: Kelas 7-A). Pilih &quot;Semua Tingkat&quot; hanya jika memang berlaku lintas kelas.
              </p>
            )}
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tautan Materi (URL / Drive / Video){" "}
              {!urlRequired && <span className="text-amber-500 font-bold lowercase text-[9px]">(opsional)</span>}
            </Label>
            <Input
              required={urlRequired}
              placeholder={
                tipeMateri === "gambar"
                  ? "https://... (Kosongkan untuk tampilan visual buku)"
                  : tipeMateri === "video"
                    ? "https://youtube.com/watch?v=... atau https://...mp4"
                    : "https://drive.google.com/... atau https://..."
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-2xl h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
            />
          </div>

          {/* Cover Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cover Materi <span className="text-slate-400 font-normal">(Opsional)</span>
              </Label>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl("")}
                  className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={11} />
                  Hapus Cover
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {coverUrl ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-xs flex-shrink-0 bg-slate-100 group">
                  <img src={coverUrl} alt="Preview Cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors flex-shrink-0 text-slate-400 hover:text-teal-600"
                >
                  <ImagePlus size={22} />
                  <span className="text-[9px] font-bold">Unggah</span>
                </div>
              )}

              <div className="flex-1 space-y-1.5 w-full">
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverUpload}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => coverInputRef.current?.click()}
                  className="rounded-xl text-xs font-bold h-9"
                >
                  <Upload size={13} className="mr-1.5" />
                  {coverUrl ? "Ganti File Gambar" : "Pilih Gambar Cover"}
                </Button>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Mendukung format PNG, JPG, atau WEBP (dikompres otomatis). Cover ini akan ditampilkan di daftar e-materi.
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Publikasi</Label>
              <p className="text-[11px] text-muted-foreground">Materi yang diterbitkan akan langsung dapat diakses siswa</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("draf")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  status === "draf"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                Simpan Draf
              </button>
              <button
                type="button"
                onClick={() => setStatus("terbit")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  status === "terbit"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                Terbitkan Langsung
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl font-bold text-xs uppercase cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting || saving || !mataPelajaranId || !judul.trim() || !kelasId || (urlRequired && !url.trim())}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl px-6 cursor-pointer"
            >
              {(submitting || saving) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                initial ? "Simpan Perubahan" : "Tambah Materi"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
