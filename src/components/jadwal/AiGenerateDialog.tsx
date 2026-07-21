"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Loader2, Sparkles, Plus, Trash2, CalendarOff, UserX, Clock, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
}

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
}

interface GuruRecord {
  id: string
  namaLengkap: string
}

interface JadwalRecord {
  id: string
  kelasId: string
  mataPelajaranId: string
  guruId: string
  hari: string
  jpMulai: number | null
  jpCount: number | null
}

interface Constraint {
  guruId: string
  guruNama: string
  hari: "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"
  isFullDay: boolean
  jpMulai: number
  jpSelesai: number
}

interface Props {
  open: boolean
  onClose: () => void
  kelasRecords: KelasRecord[]
  mapelRecords: MapelRecord[]
  guruRecords: GuruRecord[]
  existingJadwal: JadwalRecord[]
}

const HARI_LIST = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
  { value: "minggu", label: "Minggu" },
] as const

export default function AiGenerateDialog({
  open,
  onClose,
  kelasRecords,
  mapelRecords,
  guruRecords,
}: Props) {
  const [targetKelasId, setTargetKelasId] = useState<string>("all")
  const [hariLibur, setHariLibur] = useState<string[]>(["sabtu", "minggu"])
  const [constraints, setConstraints] = useState<Constraint[]>([])

  // Form state for adding new teacher unavailability constraint
  const [selectedGuruId, setSelectedGuruId] = useState<string>("")
  const [selectedHari, setSelectedHari] = useState<"senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu">("senin")
  const [isFullDay, setIsFullDay] = useState<boolean>(true)
  const [jpMulaiInput, setJpMulaiInput] = useState<number>(1)
  const [jpSelesaiInput, setJpSelesaiInput] = useState<number>(3)

  // Fetch Plotting Pengajar (Pengampu)
  const { data: pengampuList, isLoading: isLoadingPengampu } = api.pengampu.getAll.useQuery(undefined, {
    enabled: open,
  })

  // Fetch Timeline items for max JP
  const { data: timelineList } = api.pengaturanJadwal.getTimeline.useQuery({}, {
    enabled: open,
  })

  const maxJpPerDay = useMemo(() => {
    const map = new Map<string, number>()
    if (!timelineList) return map
    for (const item of timelineList) {
      if (item.tipe === "jp") {
        map.set(item.hari, (map.get(item.hari) || 0) + 1)
      }
    }
    return map
  }, [timelineList])

  useEffect(() => {
    if (!open) return
    setTargetKelasId("all")
    setHariLibur(["sabtu", "minggu"])
    setConstraints([])
    if (guruRecords.length > 0) setSelectedGuruId(guruRecords[0].id)
  }, [open, guruRecords])

  // Filter plotting pengajar based on selected target kelas
  const filteredPengampu = useMemo(() => {
    if (!pengampuList) return []
    if (targetKelasId === "all") return pengampuList
    return pengampuList.filter((p) => p.kelasId === targetKelasId)
  }, [pengampuList, targetKelasId])

  const totalBebanJP = useMemo(() => {
    return filteredPengampu.reduce((acc, p) => acc + (p.jumlahJam || 0), 0)
  }, [filteredPengampu])

  const utils = api.useUtils()
  const generateMutation = api.jadwal.autoGenerate.useMutation({
    onSuccess: async () => {
      toast.success("Jadwal pelajaran berhasil digenerate otomatis oleh AI!")
      await utils.jadwal.getAll.invalidate()
      onClose()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal menggenerate jadwal")
    },
  })

  const handleToggleHariLibur = (dayValue: string) => {
    if (hariLibur.includes(dayValue)) {
      setHariLibur(hariLibur.filter((d) => d !== dayValue))
    } else {
      setHariLibur([...hariLibur, dayValue])
    }
  }

  const handleAddConstraint = () => {
    if (!selectedGuruId) {
      toast.error("Silakan pilih guru terlebih dahulu")
      return
    }

    const guruObj = guruRecords.find((g) => g.id === selectedGuruId)
    const guruNama = guruObj ? guruObj.namaLengkap : "Guru"

    if (!isFullDay && jpMulaiInput > jpSelesaiInput) {
      toast.error("JP Mulai tidak boleh lebih besar dari JP Selesai")
      return
    }

    // Check duplicate
    const exists = constraints.some(
      (c) => c.guruId === selectedGuruId && c.hari === selectedHari && c.isFullDay === isFullDay && (isFullDay || (c.jpMulai === jpMulaiInput && c.jpSelesai === jpSelesaiInput))
    )
    if (exists) {
      toast.error("Aturan ketidakhadiran untuk guru dan hari ini sudah ada")
      return
    }

    setConstraints([
      ...constraints,
      {
        guruId: selectedGuruId,
        guruNama,
        hari: selectedHari,
        isFullDay,
        jpMulai: isFullDay ? 1 : jpMulaiInput,
        jpSelesai: isFullDay ? (maxJpPerDay.get(selectedHari) || 10) : jpSelesaiInput,
      },
    ])
    toast.success("Aturan berhalangan mengajar berhasil ditambahkan")
  }

  const handleRemoveConstraint = (index: number) => {
    setConstraints(constraints.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (filteredPengampu.length === 0) {
      toast.error("Belum ada data Plotting Pengajar (Pengampu) di database untuk kelas yang dipilih.")
      return
    }

    await generateMutation.mutateAsync({
      kelasId: targetKelasId === "all" ? undefined : targetKelasId,
      hariLibur: hariLibur as any[],
      constraints: constraints.map((c) => ({
        guruId: c.guruId,
        hari: c.hari,
        jpMulai: c.jpMulai,
        jpSelesai: c.jpSelesai,
        isFullDay: c.isFullDay,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !generateMutation.isPending && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-800 dark:text-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            AI Auto-Generate Jadwal Pelajaran
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sistem akan secara otomatis menyusun jadwal berdasarkan alokasi <strong>Plotting Pengajar (Pengampu)</strong>.
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Section 1: Target Kelas & Info Plotting Pengajar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Generasi Jadwal</Label>
                <p className="text-[11px] text-muted-foreground">Pilih kelas yang akan di-generate jadwalnya</p>
              </div>
              <select
                value={targetKelasId}
                onChange={(e) => setTargetKelasId(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Semua Kelas ({kelasRecords.length} Rombel)</option>
                {kelasRecords.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.tingkat ? `Kelas ${k.tingkat} - ` : ""}{k.namaKelas}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Plotting Summary Card */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {isLoadingPengampu ? "Memuat data plotting..." : `${filteredPengampu.length} Kombinasi Plotting Pengajar Active`}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Total Beban: <strong className="text-teal-600">{totalBebanJP} JP/Minggu</strong> (Diambil otomatis dari Plotting Pengajar)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/50 shrink-0">
                Auto Loaded
              </span>
            </div>
          </div>

          {/* Section 2: Hari Libur Sekolah */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-amber-500" />
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Pilih Hari Libur Sekolah
              </Label>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Hari yang ditandai libur tidak akan diisi jam pelajaran sama sekali oleh AI.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {HARI_LIST.map((h) => {
                const isLibur = hariLibur.includes(h.value)
                return (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => handleToggleHariLibur(h.value)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                      isLibur
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/50 shadow-sm"
                        : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
                    )}
                  >
                    <span>{h.label}</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase bg-white/60 dark:bg-black/30">
                      {isLibur ? "Libur" : "Masuk"}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 3: Keterbatasan / Jam Berhalangan Guru */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-rose-500" />
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Jam Berhalangan / Ketidakhadiran Guru
                </Label>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Atur jika ada guru tertentu yang tidak bisa mengajar di hari tertentu atau pada JP tertentu.
            </p>

            {/* Input Form for Constraint */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Select Guru */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Pilih Guru</Label>
                  <select
                    value={selectedGuruId}
                    onChange={(e) => setSelectedGuruId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    {guruRecords.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.namaLengkap}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Hari */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Hari Berhalangan</Label>
                  <select
                    value={selectedHari}
                    onChange={(e) => setSelectedHari(e.target.value as any)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    {HARI_LIST.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opsi Tipe Berhalangan */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Waktu Berhalangan</Label>
                  <select
                    value={isFullDay ? "full" : "jp"}
                    onChange={(e) => setIsFullDay(e.target.value === "full")}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="full">Sehari Penuh (Tidak Bisa Hadir)</option>
                    <option value="jp">JP Tertentu (Pilih Jam)</option>
                  </select>
                </div>
              </div>

              {/* If JP Tertentu selected */}
              {!isFullDay && (
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span>JP Mulai:</span>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={jpMulaiInput}
                      onChange={(e) => setJpMulaiInput(Number(e.target.value))}
                      className="w-20 h-8 text-center text-xs font-bold rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span>s/d JP Selesai:</span>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={jpSelesaiInput}
                      onChange={(e) => setJpSelesaiInput(Number(e.target.value))}
                      className="w-20 h-8 text-center text-xs font-bold rounded-xl"
                    />
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleAddConstraint}
                className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl h-9 cursor-pointer gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tambah Aturan Berhalangan
              </Button>
            </div>

            {/* List of Added Constraints */}
            {constraints.length > 0 && (
              <div className="space-y-2 pt-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Aturan Berhalangan Guru ({constraints.length})
                </Label>
                <div className="space-y-2">
                  {constraints.map((c, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{c.guruNama}</span>
                        <span className="text-slate-400">•</span>
                        <span className="capitalize font-bold text-slate-600 dark:text-slate-400">Hari {c.hari}</span>
                        <span className="text-slate-400">•</span>
                        <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-extrabold text-[10px]">
                          {c.isFullDay ? "Libur Sehari Penuh" : `Tidak Bisa JP ${c.jpMulai} - ${c.jpSelesai}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveConstraint(index)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Hapus Aturan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons Footer */}
        <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={generateMutation.isPending}
            className="rounded-xl font-bold text-xs uppercase cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || filteredPengampu.length === 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl px-6 cursor-pointer shadow-md shadow-emerald-500/10"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengeksekusi AI Solver...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Jadwal Pelajaran (AI)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
