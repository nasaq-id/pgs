"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Wand2, Loader2, CheckSquare, Square, X, Info, Sparkles, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import {
  generatePreviewKurikulum,
  getJenjangDisplayName,
  getKelasListByJenjang,
  formatKelasLabel,
  kategoriKeKelompok,
  normalizeJenjang,
  type GeneratePreviewItem,
} from "@/data/kurikulumKMA1503"

interface ExistingMapelLike {
  kodeMapel?: string | null
  namaMapel: string
}

export default function GenerateKurikulumDialog({
  open,
  onOpenChange,
  sekolahLevel,
  existingMapel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolahLevel?: string | null
  existingMapel: ExistingMapelLike[]
}) {
  const jenjang = useMemo(() => normalizeJenjang(sekolahLevel || ""), [sekolahLevel])
  const kelasList = useMemo(() => getKelasListByJenjang(jenjang), [jenjang])
  const [kelasFilter, setKelasFilter] = useState<number[]>([])
  const [items, setItems] = useState<GeneratePreviewItem[]>([])
  const [loading, setLoading] = useState(false)

  const regenerate = (filter: number[]) => {
    const preview = generatePreviewKurikulum(sekolahLevel || "", filter, existingMapel)
    setItems(preview)
  }

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (isOpen) {
      setKelasFilter([])
      regenerate([])
    }
  }

  const toggleKelasFilter = (n: number) => {
    const next = kelasFilter.includes(n) ? kelasFilter.filter((k) => k !== n) : [...kelasFilter, n]
    setKelasFilter(next)
    regenerate(next)
  }

  const toggleItem = (tempId: string) => {
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, selected: !it.selected } : it)))
  }

  const toggleSelectAll = () => {
    const allSelected = items.length > 0 && items.every((it) => it.selected)
    setItems((prev) => prev.map((it) => ({ ...it, selected: !allSelected })))
  }

  const updateJp = (tempId: string, jp: number) => {
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, jpPerMinggu: Math.max(1, jp || 1) } : it)))
  }

  const generateMutation = api.mapel.generateFromKMA.useMutation({
    onSuccess: (res) => {
      toast.success(`Generate kurikulum selesai: ${res.added} mapel baru, ${res.updated} diperbarui`)
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message || "Gagal generate kurikulum"),
  })

  const selectedCount = items.filter((it) => it.selected).length
  const totalJp = items.filter((it) => it.selected).reduce((sum, it) => sum + it.jpPerMinggu, 0)
  const hasValidJenjang = !!sekolahLevel && sekolahLevel.trim().length > 0

  const handleSave = async () => {
    const selected = items.filter((it) => it.selected)
    if (selected.length === 0) {
      toast.error("Pilih setidaknya 1 mata pelajaran untuk disimpan")
      return
    }
    setLoading(true)
    try {
      await generateMutation.mutateAsync({
        items: selected.map((it) => ({
          kode: it.kode,
          nama: it.nama,
          kelompok: kategoriKeKelompok(it.kategori),
          jumlahJam: it.jpPerMinggu,
        })),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="p-6 max-h-[85vh] overflow-y-auto"
        >
          <DialogHeader className="text-left mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
                    Generate Mapel Kurikulum
                  </DialogTitle>
                  <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">
                    Standar KMA 1503/2025 & Permendikdasmen 13/2025
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
              {/* Info jenjang + filter kelas */}
              <div className="neumo-inset bg-background rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                    Jenjang:{" "}
                    <span className="text-teal-650 dark:text-teal-400 font-extrabold">
                      {getJenjangDisplayName(jenjang, sekolahLevel || undefined)}
                    </span>
                  </span>
                  <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">
                    Filter Kelas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {kelasList.map((n) => {
                      const active = kelasFilter.includes(n)
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleKelasFilter(n)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all cursor-pointer active:scale-95 ${
                            active
                              ? "bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-500/25"
                              : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {formatKelasLabel([n], jenjang).replace("Kelas ", "")}
                        </button>
                      )
                    })}
                    {kelasFilter.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setKelasFilter([])
                          regenerate([])
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer active:scale-95"
                      >
                        <X className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview table */}
              <div className="neumo-card bg-background rounded-2xl overflow-hidden">
                <div className="p-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {items.every((it) => it.selected) && items.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      Pilih Semua
                    </button>
                    <span className="text-[10px] font-bold text-slate-400">
                      {items.length} mapel standar
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                    <span>
                      Dipilih: <strong className="text-teal-650">{selectedCount}</strong>
                    </span>
                    <span>
                      Total JP: <strong className="text-teal-650">{totalJp}</strong>
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="w-8 py-2.5 px-3"></th>
                        <th className="py-2.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="py-2.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode</th>
                        <th className="py-2.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</th>
                        <th className="py-2.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                        <th className="py-2.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                        <th className="py-2.5 px-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">JP/Minggu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr
                          key={it.tempId}
                          className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${
                            it.selected ? "bg-white dark:bg-slate-900/40" : "bg-slate-50/50 dark:bg-slate-900/20 opacity-60"
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={it.selected}
                              onChange={() => toggleItem(it.tempId)}
                              className="w-4 h-4 accent-teal-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3">
                            {it.status === "baru" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                                Baru
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                                title="Kode/nama sudah ada — akan diperbarui"
                              >
                                Sudah Ada
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-xs text-slate-700 dark:text-slate-300">{it.kode}</td>
                          <td className="py-2 px-3 font-bold text-xs text-slate-800 dark:text-slate-200">
                            {it.nama}
                            {it.isPeminatan && (
                              <span className="ml-1.5 text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200/60 dark:border-purple-900">
                                Peminatan
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs font-semibold text-slate-500 whitespace-nowrap">
                            {formatKelasLabel(it.kelas, jenjang)}
                          </td>
                          <td className="py-2 px-3 text-xs font-semibold text-slate-500">{it.kategori}</td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={it.jpPerMinggu}
                              onChange={(e) => updateJp(it.tempId, parseInt(e.target.value || "1", 10))}
                              className="w-16 h-8 px-2 rounded-lg text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                            />
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-xs font-semibold text-slate-400">
                            Tidak ada mapel untuk filter kelas yang dipilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  Mapel dengan kode/nama sama akan diperbarui, sisanya ditambahkan baru.
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || selectedCount === 0}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transform active:scale-95"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Simpan {selectedCount} Mapel
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
