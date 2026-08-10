"use client"

import { useMemo, useState } from "react"
import { api } from "@/lib/trpc/client"
import { Sparkles, Search, X, BookOpen, Users, Loader2, Info } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  generatePreviewKurikulum,
  getJenjangDisplayName,
  matchClassesForGrades,
  normalizeJenjang,
  kategoriKeKelompok,
  type ExistingMapelLike,
  type Jenjang,
} from "@/data/kurikulumKMA1503"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KelasLike {
  id: string
  namaKelas: string
  tingkat: string | null
}

export default function GenerateKurikulumDialog({
  open,
  onOpenChange,
  sekolahLevel,
  sekolahNama,
  kelasList,
  existingMapel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolahLevel?: string | null
  sekolahNama?: string | null
  kelasList: KelasLike[]
  existingMapel: ExistingMapelLike[]
}) {
  const [selectedJenjangKey, setSelectedJenjangKey] = useState<Jenjang>("mts")
  const [presetSearchQuery, setPresetSearchQuery] = useState("")
  const [selectedTargetClassId, setSelectedTargetClassId] = useState("all")
  const [selectedPresetMapelCodes, setSelectedPresetMapelCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const previewItems = useMemo(
    () => generatePreviewKurikulum(sekolahLevel || "", [], existingMapel, sekolahNama || undefined),
    [sekolahLevel, sekolahNama, existingMapel]
  )

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (isOpen) {
      const norm = normalizeJenjang(sekolahLevel || "")
      setSelectedJenjangKey(norm)
      setPresetSearchQuery("")
      setSelectedTargetClassId("all")
      const items = generatePreviewKurikulum(sekolahLevel || "", [], existingMapel, sekolahNama || undefined)
      setSelectedPresetMapelCodes(items.filter((i) => i.selected).map((i) => i.kode))
    }
  }

  const togglePresetMapel = (kode: string) => {
    setSelectedPresetMapelCodes((prev) =>
      prev.includes(kode) ? prev.filter((c) => c !== kode) : [...prev, kode]
    )
  }

  const toggleSelectAll = () => {
    const totalCount = previewItems.length
    if (selectedPresetMapelCodes.length === totalCount) {
      setSelectedPresetMapelCodes([])
    } else {
      setSelectedPresetMapelCodes(previewItems.map((i) => i.kode))
    }
  }

  const utils = api.useUtils()

  const generateMutation = api.mapel.generateFromKMA.useMutation({
    onSuccess: (res) => {
      toast.success(`Generate kurikulum selesai: ${res.added} mapel baru, ${res.updated} diperbarui`)
      utils.mapel.getAll.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message || "Gagal generate kurikulum"),
  })

  const selectedCount = selectedPresetMapelCodes.length
  const totalCount = previewItems.length
  const hasValidJenjang = !!sekolahLevel && sekolahLevel.trim().length > 0
  const displayName = getJenjangDisplayName(selectedJenjangKey, sekolahLevel || undefined)

  const q = presetSearchQuery.toLowerCase().trim()
  const filteredPreviewItems = previewItems.filter((m) => {
    if (!q) return true
    return (
      m.nama.toLowerCase().includes(q) ||
      m.kode.toLowerCase().includes(q) ||
      m.kategori.toLowerCase().includes(q) ||
      (m.catatan && m.catatan.toLowerCase().includes(q))
    )
  })

  const kelasOptions = [
    { value: "all", label: "⚡ Otomatis Distribusi ke Kelas Terdaftar Sesuai Tingkat Regulasi" },
    ...kelasList.map((c) => ({
      value: c.id,
      label: `${c.namaKelas}${c.tingkat ? ` (Tingkat ${c.tingkat})` : ""}`,
    })),
  ]

  const getMatchedClassNames = (m: { kelas: number[] }): string[] => {
    if (selectedTargetClassId !== "all") {
      const fc = kelasList.find((c) => c.id === selectedTargetClassId)
      return fc ? [fc.namaKelas] : []
    }
    return kelasList
      .filter((c) => {
        const matched = matchClassesForGrades(m.kelas, [c])
        return matched.length > 0 && matched[0] !== "all"
      })
      .map((c) => c.namaKelas)
  }

  const handleSave = async () => {
    const selected = previewItems.filter((m) => selectedPresetMapelCodes.includes(m.kode))
    if (selected.length === 0) {
      toast.error("Pilih setidaknya satu mata pelajaran untuk di-generate")
      return
    }
    setLoading(true)
    try {
      await generateMutation.mutateAsync({
        items: selected.map((it) => ({
          kode: it.kode,
          nama: it.nama,
          kelompok: it.isPeminatan
            ? "C"
            : it.kategori === "Mapel Pilihan"
              ? "B"
              : kategoriKeKelompok(it.kategori),
          jumlahJam: it.jpPerMinggu,
        })),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden"
      >
        <div
          className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar animate-fade-in"
        >
          <DialogHeader className="text-left mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
                    Generate Mapel Kurikulum Resmi
                  </DialogTitle>
                  <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                    Preset terintegrasi Permendikdasmen No. 13/2025 &amp; KMA 1503/2025 (Kemenag).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          {!hasValidJenjang ? (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Info className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 max-w-sm">
                Lengkapi jenjang lembaga terlebih dahulu
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Atur jenjang sekolah di menu <strong>Lembaga</strong> (mis. MI, MTs, MA, SD, SMP, SMA, SMK) agar daftar mapel standar dapat dibuat otomatis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Automatic Jenjang Info matching Lembaga */}
              <div className="neumo-inset bg-background rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Jenjang Terdaftar (Menu Lembaga)
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {sekolahLevel || getJenjangDisplayName(selectedJenjangKey, sekolahLevel || undefined)}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-2 py-0.5 rounded-md">
                      Otomatis Disesuaikan
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-300 block">
                    {sekolahNama || "Lembaga Pendidikan"}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Kurikulum Standar {selectedJenjangKey}
                  </span>
                </div>
              </div>

              {previewItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <BookOpen className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-400">
                    Tidak ada preset mapel untuk jenjang ini.
                  </p>
                </div>
              ) : (
                <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 p-3.5 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                        Permendikdasmen 13/2025 / KMA 1503
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                      {selectedCount} dari {totalCount} Terpilih
                    </span>
                  </div>

                  {/* Target Kelas Selection Dropdown */}
                  <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 p-2.5 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        Target Kelas Distribusi Mapel
                      </label>
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                        {kelasList.length} Kelas Terdaftar
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <Select
                        options={kelasOptions}
                        value={selectedTargetClassId}
                        onValueChange={(v) => setSelectedTargetClassId(v || "all")}
                      >
                        <SelectTrigger className="w-full !h-9 text-xs font-semibold !rounded-lg">
                          <SelectValue placeholder="Pilih target kelas" />
                        </SelectTrigger>
                        <SelectContent>
                          {kelasOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Input & Select All Row */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={presetSearchQuery}
                        onChange={(e) => setPresetSearchQuery(e.target.value)}
                        placeholder="Cari mata pelajaran (mis. Fikih, Matematika, Kode, Pilihan)..."
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none transition-all shadow-sm"
                      />
                      {presetSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPresetSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-pointer"
                          title="Hapus pencarian"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 hover:border-indigo-300 px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      {selectedCount === totalCount ? "Batalkan Semua" : "Pilih Semua"}
                    </button>
                  </div>

                  {/* Subject List Items */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                    {filteredPreviewItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl">
                        <Search className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Tidak ada mata pelajaran yang cocok dengan &quot;{presetSearchQuery}&quot;
                        </p>
                        <button
                          type="button"
                          onClick={() => setPresetSearchQuery("")}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-2 hover:underline cursor-pointer"
                        >
                          Hapus kata kunci pencarian
                        </button>
                      </div>
                    ) : (
                      filteredPreviewItems.map((m) => {
                        const checked = selectedPresetMapelCodes.includes(m.kode)
                        const isAlreadyInDB = m.status === "sudah_ada"
                        const matchedClassNames = getMatchedClassNames(m)

                        return (
                          <label
                            key={m.tempId}
                            className={`flex items-start justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              checked
                                ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-slate-800 dark:text-slate-200"
                                : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60"
                            }`}
                          >
                            <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePresetMapel(m.kode)}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.nama}</span>
                                  <span className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-1.5 py-0.5 rounded">
                                    {m.kode}
                                  </span>
                                  {isAlreadyInDB && (
                                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded">
                                      Sudah Ada di Sistem
                                    </span>
                                  )}
                                  {m.isPeminatan && (
                                    <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900 px-1.5 py-0.5 rounded">
                                      Peminatan
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                                    Tingkat Regulasi: Kelas {m.kelas.join(", ")}
                                  </span>
                                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-1.5 py-0.5 rounded">
                                    {matchedClassNames.length > 0
                                      ? `Target Kelas: ${matchedClassNames.join(", ")}`
                                      : "Target Kelas: Semua Kelas"}
                                  </span>
                                </div>
                                {m.catatan && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{m.catatan}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0 text-right">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  m.kategori === "Mapel Wajib"
                                    ? "bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900"
                                    : m.kategori === "Mapel Pilihan"
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900"
                                      : "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                                }`}
                              >
                                {m.kategori}
                              </span>
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                {m.jpPerMinggu} JP
                              </span>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-5 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer transform active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || selectedCount === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Generate ({selectedCount} Mapel)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
