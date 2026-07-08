"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Loader2, Sparkles, Plus, Trash2, AlertCircle } from "lucide-react"

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

interface Allocation {
  kelasId: string
  mataPelajaranId: string
  guruId: string
  jpCount: number
}

interface Constraint {
  guruId: string
  hari: "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"
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

const HARI_OPTIONS = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
]

export default function AiGenerateDialog({
  open,
  onClose,
  kelasRecords,
  mapelRecords,
  guruRecords,
  existingJadwal,
}: Props) {
  const [targetKelasId, setTargetKelasId] = useState<string>("all")
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [activeTab, setActiveTab] = useState("allocations")

  // For adding new allocation manually
  const [newKelasId, setNewKelasId] = useState("")
  const [newMapelId, setNewMapelId] = useState("")
  const [newGuruId, setNewGuruId] = useState("")
  const [newJpCount, setNewJpCount] = useState(2)

  // Memos for selected dropdown labels to fix Radix/Base UI select trigger value display bugs
  const selectedKelasLabel = useMemo(() => {
    const cls = kelasRecords.find((k) => k.id === newKelasId)
    return cls ? `${cls.tingkat ? `${cls.tingkat}-` : ""}${cls.namaKelas}` : ""
  }, [newKelasId, kelasRecords])

  const selectedMapelLabel = useMemo(() => {
    const mpl = mapelRecords.find((m) => m.id === newMapelId)
    return mpl ? mpl.namaMapel : ""
  }, [newMapelId, mapelRecords])

  const selectedGuruLabel = useMemo(() => {
    const gr = guruRecords.find((g) => g.id === newGuruId)
    return gr ? gr.namaLengkap : ""
  }, [newGuruId, guruRecords])

  const utils = api.useUtils()
  const generateMutation = api.jadwal.autoGenerate.useMutation({
    onSuccess: async () => {
      toast.success("Jadwal berhasil digenerate otomatis oleh AI!")
      await utils.jadwal.getAll.invalidate()
      onClose()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal menggenerate jadwal")
    },
  })

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

  // Initialize allocations from existing jadwal if any
  useEffect(() => {
    if (!open) return

    // Group existing jadwal to pre-populate allocations
    const initialAlloc: Allocation[] = []
    const seen = new Set<string>()

    for (const entry of existingJadwal) {
      if (!entry.kelasId || !entry.mataPelajaranId || !entry.guruId || !entry.jpCount) continue
      const key = `${entry.kelasId}-${entry.mataPelajaranId}-${entry.guruId}`
      if (seen.has(key)) {
        // Sum up jpCount
        const existing = initialAlloc.find(
          (a) =>
            a.kelasId === entry.kelasId &&
            a.mataPelajaranId === entry.mataPelajaranId &&
            a.guruId === entry.guruId
        )
        if (existing) {
          existing.jpCount += entry.jpCount
        }
      } else {
        seen.add(key)
        initialAlloc.push({
          kelasId: entry.kelasId,
          mataPelajaranId: entry.mataPelajaranId,
          guruId: entry.guruId,
          jpCount: entry.jpCount,
        })
      }
    }

    setAllocations(initialAlloc)
    setConstraints([])
    setTargetKelasId("all")
    setActiveTab("allocations")

    if (kelasRecords.length > 0) setNewKelasId(kelasRecords[0].id)
    if (mapelRecords.length > 0) setNewMapelId(mapelRecords[0].id)
    if (guruRecords.length > 0) setNewGuruId(guruRecords[0].id)
  }, [open, existingJadwal, kelasRecords, mapelRecords, guruRecords])

  const handleAddAllocation = () => {
    if (!newKelasId || !newMapelId || !newGuruId || !newJpCount) {
      toast.error("Mohon lengkapi semua field alokasi")
      return
    }

    // Check if duplicate
    const exists = allocations.some(
      (a) =>
        a.kelasId === newKelasId &&
        a.mataPelajaranId === newMapelId &&
        a.guruId === newGuruId
    )
    if (exists) {
      toast.error("Alokasi untuk Kombinasi Kelas, Mapel, dan Guru ini sudah ada")
      return
    }

    setAllocations([
      ...allocations,
      {
        kelasId: newKelasId,
        mataPelajaranId: newMapelId,
        guruId: newGuruId,
        jpCount: newJpCount,
      },
    ])
    toast.success("Alokasi berhasil ditambahkan")
  }

  const handleRemoveAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index))
  }

  const handleAddConstraint = (guruId: string, day: string) => {
    const alreadyExists = constraints.some((c) => c.guruId === guruId && c.hari === day)
    if (alreadyExists) return
    const max = maxJpPerDay.get(day) ?? 10
    setConstraints([
      ...constraints,
      {
        guruId,
        hari: day as any,
        jpMulai: 1,
        jpSelesai: Math.max(1, max),
      },
    ])
  }

  const handleRemoveConstraint = (guruId: string, day: string) => {
    setConstraints(constraints.filter((c) => !(c.guruId === guruId && c.hari === day)))
  }

  const handleJpMulaiChange = (guruId: string, day: string, value: number) => {
    setConstraints(
      constraints.map((c) => {
        if (c.guruId === guruId && c.hari === day) {
          const max = maxJpPerDay.get(day) ?? 10
          return { ...c, jpMulai: Math.max(1, Math.min(value, c.jpSelesai)) }
        }
        return c
      })
    )
  }

  const handleJpSelesaiChange = (guruId: string, day: string, value: number) => {
    setConstraints(
      constraints.map((c) => {
        if (c.guruId === guruId && c.hari === day) {
          const max = maxJpPerDay.get(day) ?? 10
          return { ...c, jpSelesai: Math.max(c.jpMulai, Math.min(value, max)) }
        }
        return c
      })
    )
  }

  const handleGenerate = async () => {
    if (allocations.length === 0) {
      toast.error("Belum ada alokasi mata pelajaran yang dikonfigurasi")
      return
    }

    const filteredAllocations =
      targetKelasId === "all"
        ? allocations
        : allocations.filter((a) => a.kelasId === targetKelasId)

    if (filteredAllocations.length === 0) {
      toast.error("Tidak ada alokasi untuk kelas yang dipilih")
      return
    }

    await generateMutation.mutateAsync({
      kelasId: targetKelasId === "all" ? undefined : targetKelasId,
      allocations: filteredAllocations,
      constraints,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !generateMutation.isPending && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-green-600 animate-pulse" />
            AI Auto-Generate Jadwal Pelajaran
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/40">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-green-950 dark:text-green-200">Target Generasi Jadwal</Label>
              <p className="text-xs text-green-700/80 dark:text-green-400/80">
                Pilih apakah ingin menggenerate jadwal untuk seluruh kelas atau satu kelas tertentu.
              </p>
            </div>
            <select
              value={targetKelasId}
              onChange={(e) => setTargetKelasId(e.target.value)}
              className="flex h-9 rounded-lg border border-green-200 bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
            >
              <option value="all">Semua Kelas</option>
              {kelasRecords.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.tingkat ? `${k.tingkat}-` : ""}{k.namaKelas}
                </option>
              ))}
            </select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="allocations">1. Alokasi Jam Pelajaran (JP)</TabsTrigger>
              <TabsTrigger value="constraints">2. Pengecualian Hari Mengajar Guru</TabsTrigger>
            </TabsList>

            <TabsContent value="allocations" className="space-y-4 pt-4">
              <div className="grid grid-cols-4 gap-2.5 items-end p-3.5 rounded-xl border border-border bg-muted/40">
                <div className="space-y-1.5">
                  <Label>Kelas</Label>
                  <Select value={newKelasId} onValueChange={(v) => v && setNewKelasId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kelas">{selectedKelasLabel || "Pilih Kelas"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {kelasRecords.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.tingkat ? `${k.tingkat}-` : ""}{k.namaKelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mata Pelajaran</Label>
                  <Select value={newMapelId} onValueChange={(v) => v && setNewMapelId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mapel">{selectedMapelLabel || "Pilih Mapel"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {mapelRecords.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.namaMapel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Guru Pengampu</Label>
                  <Select value={newGuruId} onValueChange={(v) => v && setNewGuruId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Guru">{selectedGuruLabel || "Pilih Guru"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {guruRecords.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.namaLengkap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="space-y-1.5 flex-1">
                    <Label>JP</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={newJpCount}
                      onChange={(e) => setNewJpCount(Number(e.target.value))}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddAllocation}
                    style={{ backgroundColor: "hsl(142 72% 40%)" }}
                    className="h-10 text-white gap-1 px-3 mt-auto cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Tambah
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground border-b border-border font-medium">
                      <th className="py-2.5 px-4 text-left">Kelas</th>
                      <th className="py-2.5 px-4 text-left">Mata Pelajaran</th>
                      <th className="py-2.5 px-4 text-left">Guru Pengampu</th>
                      <th className="py-2.5 px-4 text-center w-24">Jumlah JP</th>
                      <th className="py-2.5 px-4 text-right w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          Belum ada alokasi JP. Gunakan form di atas untuk menambahkan.
                        </td>
                      </tr>
                    ) : (
                      allocations
                        .filter((a) => targetKelasId === "all" || a.kelasId === targetKelasId)
                        .map((alloc, idx) => {
                          const cls = kelasRecords.find((k) => k.id === alloc.kelasId)
                          const mpl = mapelRecords.find((m) => m.id === alloc.mataPelajaranId)
                          const gr = guruRecords.find((g) => g.id === alloc.guruId)
                          return (
                            <tr key={idx} className="border-b border-border hover:bg-muted/30">
                              <td className="py-2 px-4 font-semibold">
                                {cls ? `${cls.tingkat ? `${cls.tingkat}-` : ""}${cls.namaKelas}` : "-"}
                              </td>
                              <td className="py-2 px-4">{mpl?.namaMapel || "-"}</td>
                              <td className="py-2 px-4">{gr?.namaLengkap || "-"}</td>
                              <td className="py-2 px-4 text-center font-mono font-bold">
                                {alloc.jpCount} JP
                              </td>
                              <td className="py-2 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveAllocation(idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="constraints" className="space-y-4 pt-4">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Pemberitahuan:</p>
                  <p>
                    Klik tombol <strong>+</strong> pada hari untuk menambah pengecualian jadwal guru.
                    Atur rentang JP yang dikecualikan secara manual.
                    AI akan menghindari pengisian jadwal pada hari dan rentang JP tersebut.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground border-b border-border font-medium">
                      <th className="py-2.5 px-4 text-left">Nama Guru</th>
                      {HARI_OPTIONS.map((h) => (
                        <th key={h.value} className="py-2.5 px-4 text-center" style={{ minWidth: 148 }}>
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guruRecords.map((guru) => (
                      <tr key={guru.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium whitespace-nowrap">{guru.namaLengkap}</td>
                        {HARI_OPTIONS.map((h) => {
                          const constraint = constraints.find(
                            (c) => c.guruId === guru.id && c.hari === h.value
                          )
                          const max = maxJpPerDay.get(h.value) ?? 0
                          const isPending = generateMutation.isPending
                          return (
                            <td key={h.value} className="py-2.5 px-4 text-center">
                              {max === 0 ? (
                                <span className="text-xs text-muted-foreground">&mdash;</span>
                              ) : constraint ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-muted-foreground">JP</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={constraint.jpSelesai}
                                    value={constraint.jpMulai}
                                    onChange={(e) => handleJpMulaiChange(guru.id, h.value, Number(e.target.value))}
                                    disabled={isPending}
                                    className="w-11 h-7 rounded border border-border bg-background text-center text-xs font-mono tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50"
                                  />
                                  <span className="text-xs text-muted-foreground">&ndash;</span>
                                  <input
                                    type="number"
                                    min={constraint.jpMulai}
                                    max={max}
                                    value={constraint.jpSelesai}
                                    onChange={(e) => handleJpSelesaiChange(guru.id, h.value, Number(e.target.value))}
                                    disabled={isPending}
                                    className="w-11 h-7 rounded border border-border bg-background text-center text-xs font-mono tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50"
                                  />
                                  <button
                                    onClick={() => handleRemoveConstraint(guru.id, h.value)}
                                    disabled={isPending}
                                    className="ml-0.5 inline-flex items-center justify-center rounded-full size-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors cursor-pointer"
                                    title="Hapus pengecualian"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddConstraint(guru.id, h.value)}
                                  disabled={isPending}
                                  className="inline-flex items-center justify-center rounded-full size-7 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
                                  title="Tambah pengecualian"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={generateMutation.isPending}>
            Batal
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || allocations.length === 0}
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
            className="text-white gap-2 cursor-pointer"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sedang Mengoptimasi...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Jadwal AI
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
