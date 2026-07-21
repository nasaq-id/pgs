"use client"

import { useState, useEffect } from "react"
import { X, Loader2, FileText, Video, Link2, BookOpen, Upload, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

export interface EMateriFormData {
  id?: string
  mataPelajaranId: string
  kelasId?: string | null
  tingkat?: string | null
  judul: string
  bab?: string | null
  deskripsi?: string | null
  tipeMateri: "dokumen" | "video" | "link_eksternal" | "teks_artikel"
  fileUrl?: string | null
  fileName?: string | null
  fileSize?: string | null
  videoUrl?: string | null
  linkUrl?: string | null
  kontenTeks?: string | null
  status: "terbit" | "draf" | "arsip"
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: EMateriFormData) => Promise<void>
  initial?: EMateriFormData | null
  saving?: boolean
}

export function formatTingkatLabel(tingkat?: string | null): string {
  if (!tingkat || tingkat === "semua" || tingkat === "all") return "Semua Tingkat"
  const clean = tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "").trim()
  if (!clean) return "Umum"
  if (/^(kelas|sd|smp|sma|smk|madrasah)/i.test(clean)) return clean
  return `Kelas ${clean}`
}

export default function EMateriFormDialog({ open, onClose, onSubmit, initial, saving }: Props) {
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [judul, setJudul] = useState("")
  const [bab, setBab] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [tipeMateri, setTipeMateri] = useState<"dokumen" | "video" | "link_eksternal" | "teks_artikel">("dokumen")
  const [fileUrl, setFileUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [kontenTeks, setKontenTeks] = useState("")
  const [status, setStatus] = useState<"terbit" | "draf" | "arsip">("terbit")
  const [submitting, setSubmitting] = useState(false)

  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 100 }, { enabled: open })
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 }, { enabled: open })

  const mapelOptions = (mapelList ?? []).map((m) => ({
    value: m.id,
    label: `${m.namaMapel}${m.kodeMapel ? ` (${m.kodeMapel})` : ""}`,
  }))

  const kelasOptions = [
    { value: "all", label: "Semua Kelas (Umum)" },
    ...(kelasList ?? []).map((k) => ({
      value: k.id,
      label: `${k.namaKelas}${k.tingkat ? ` (${formatTingkatLabel(k.tingkat)})` : ""}`,
    })),
  ]

  useEffect(() => {
    if (!open) return
    if (initial) {
      setMataPelajaranId(initial.mataPelajaranId ?? "")
      setKelasId(initial.kelasId || "all")
      setJudul(initial.judul ?? "")
      setBab(initial.bab ?? "")
      setDeskripsi(initial.deskripsi ?? "")
      setTipeMateri(initial.tipeMateri ?? "dokumen")
      setFileUrl(initial.fileUrl ?? "")
      setFileName(initial.fileName ?? "")
      setVideoUrl(initial.videoUrl ?? "")
      setLinkUrl(initial.linkUrl ?? "")
      setKontenTeks(initial.kontenTeks ?? "")
      setStatus(initial.status ?? "terbit")
    } else {
      setMataPelajaranId("")
      setKelasId("all")
      setJudul("")
      setBab("")
      setDeskripsi("")
      setTipeMateri("dokumen")
      setFileUrl("")
      setFileName("")
      setVideoUrl("")
      setLinkUrl("")
      setKontenTeks("")
      setStatus("terbit")
    }
  }, [open, initial])

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mataPelajaranId || !judul.trim()) return

    const selectedKelasObj = kelasList?.find((k) => k.id === kelasId)
    const tingkat = selectedKelasObj?.tingkat ?? null

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
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        videoUrl: videoUrl || null,
        linkUrl: linkUrl || null,
        kontenTeks: kontenTeks || null,
        status,
      })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const TIPE_MATERI_OPTIONS = [
    { type: "dokumen", label: "Dokumen / File", icon: FileText, desc: "PDF, Word, PPT, Excel" },
    { type: "video", label: "Video", icon: Video, desc: "Link YouTube / Embed MP4" },
    { type: "link_eksternal", label: "Link Web", icon: Link2, desc: "Tautan Web / Drive" },
    { type: "teks_artikel", label: "Catatan Teks", icon: BookOpen, desc: "Artikel / Rangkuman" },
  ] as const

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <DialogTitle className="text-xl font-extrabold tracking-tight">
              {initial ? "Edit e-Materi Pembelajaran" : "Tambah e-Materi Pembelajaran"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lengkapi informasi materi digital untuk diakses oleh siswa
            </p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmitForm} className="space-y-5 pt-3">
          {/* Row 1: Mata Pelajaran & Target Kelas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mata Pelajaran <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={mataPelajaranId}
                onValueChange={(v) => setMataPelajaranId(v ?? "")}
                options={mapelOptions}
              >
                <SelectTrigger className="rounded-2xl h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <SelectValue placeholder="Pilih Mata Pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {(mapelList ?? []).map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      label={`${m.namaMapel}${m.kodeMapel ? ` (${m.kodeMapel})` : ""}`}
                    >
                      {m.namaMapel} {m.kodeMapel ? `(${m.kodeMapel})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Target Kelas / Tingkat <span className="text-slate-400 font-normal">(Opsional)</span>
              </Label>
              <Select
                value={kelasId}
                onValueChange={(v) => setKelasId(v ?? "all")}
                options={kelasOptions}
              >
                <SelectTrigger className="rounded-2xl h-10 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <SelectValue placeholder="Semua Kelas (Umum)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" label="Semua Kelas (Umum)">Semua Kelas (Umum)</SelectItem>
                  {(kelasList ?? []).map((k) => {
                    const labelStr = `${k.namaKelas}${k.tingkat ? ` (${formatTingkatLabel(k.tingkat)})` : ""}`
                    return (
                      <SelectItem key={k.id} value={k.id} label={labelStr}>
                        {labelStr}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Judul Materi & Bab */}
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

          {/* Row 3: Deskripsi Singkat */}
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

          {/* Row 4: Tipe Materi (Interactive Cards) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Format / Tipe Konten <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TIPE_MATERI_OPTIONS.map((opt) => {
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
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dynamic Content Inputs based on Tipe Materi */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-4">
            {tipeMateri === "dokumen" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">URL File / Dokumen (PDF, PPT, DOCX)</Label>
                  <div className="relative">
                    <Upload className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="https://drive.google.com/... atau URL file dokumen"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      className="pl-10 rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Tampilan File <span className="text-slate-400 font-normal">(Opsional)</span></Label>
                  <Input
                    placeholder="Contoh: Modul_Trigonometri_Kelas_10.pdf"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            )}

            {tipeMateri === "video" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Link Video Learning (YouTube / Embed URL)</Label>
                <div className="relative">
                  <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="https://www.youtube.com/watch?v=... atau link mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="pl-10 rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
                <p className="text-[10px] text-slate-400 pl-1">Siswa dapat langsung menonton video pembelajaran ini di dalam aplikasi.</p>
              </div>
            )}

            {tipeMateri === "link_eksternal" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tautan Web / Sumber Eksternal</Label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="https://kemdikbud.go.id/... atau link artikel"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="pl-10 rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            )}

            {tipeMateri === "teks_artikel" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Isi Catatan / Rangkuman Pembelajaran</Label>
                <Textarea
                  rows={6}
                  placeholder="Tuliskan materi pembelajaran lengkap di sini..."
                  value={kontenTeks}
                  onChange={(e) => setKontenTeks(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-sans leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Row 5: Status Publikasi */}
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
              disabled={submitting || saving || !mataPelajaranId || !judul.trim()}
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
