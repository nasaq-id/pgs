"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, X, ChevronDown, Check, Search } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"

interface AssignmentRow {
  guruId: string
  kelasIds: string[]
  jumlahJam: number
}

interface Props {
  open: boolean
  onClose: () => void
  mataPelajaranId: string
  mataPelajaranNama: string
}

function SearchableGuruSelect({
  value,
  onChange,
  guruList,
}: {
  value: string
  onChange: (value: string) => void
  guruList: Array<{ id: string; namaLengkap: string; nip?: string | null }>
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedGuru = guruList.find((g) => g.id === value)

  const filteredGuru = guruList.filter(
    (g) =>
      g.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      (g.nip && g.nip.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="relative flex-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex h-9 items-center justify-between gap-1.5 px-3 py-2 text-sm rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 text-foreground transition-all outline-none select-none cursor-pointer focus-visible:ring-3 focus-visible:ring-teal-500/15"
      >
        <span className="truncate font-medium">{selectedGuru ? selectedGuru.namaLengkap : "Pilih guru..."}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] rounded-2xl glass text-popover-foreground p-2 space-y-2 max-h-60 overflow-y-auto shadow-2xl animate-in fade-in-50 zoom-in-95 border border-border/40">
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama guru..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background/80 border border-border focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-foreground"
              autoFocus
            />
          </div>

          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {filteredGuru.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2 text-center">Guru tidak ditemukan</p>
            ) : (
              filteredGuru.map((g) => (
                <div
                  key={g.id}
                  onClick={() => {
                    onChange(g.id)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer font-medium transition-colors ${
                    g.id === value
                      ? "bg-teal-50 dark:bg-teal-950/40 text-teal-650 dark:text-teal-400 font-bold"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <span>{g.namaLengkap}</span>
                  {g.id === value && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PengampuDialog({ open, onClose, mataPelajaranId, mataPelajaranNama }: Props) {
  const { data, isLoading } = api.pengampu.getByMapel.useQuery({ mataPelajaranId }, { enabled: open })
  const saveMutation = api.pengampu.save.useMutation()

  const [rows, setRows] = useState<AssignmentRow[]>([])

  useEffect(() => {
    if (!data) return
    const grouped = new Map<string, string[]>()
    for (const a of data.assignments) {
      if (!grouped.has(a.guruId)) grouped.set(a.guruId, [])
      grouped.get(a.guruId)!.push(a.kelasId)
    }
    const initial: AssignmentRow[] = []
    for (const [guruId, kelasIds] of grouped) {
      const existingAssignment = data.assignments.find((a) => a.guruId === guruId)
      initial.push({ guruId, kelasIds, jumlahJam: existingAssignment?.jumlahJam ?? 4 })
    }
    if (initial.length === 0) {
      initial.push({ guruId: "", kelasIds: [], jumlahJam: 4 })
    }
    setRows(initial)
  }, [data])

  const allKelas = data?.allKelas ?? []
  const allGuru = data?.allGuru ?? []

  const takenClassIds = (exceptRowIndex: number): Set<string> => {
    const taken = new Set<string>()
    for (let i = 0; i < rows.length; i++) {
      if (i === exceptRowIndex) continue
      for (const kid of rows[i].kelasIds) taken.add(kid)
    }
    return taken
  }

  const updateRow = (index: number, patch: Partial<AssignmentRow>) => {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      setRows([{ guruId: "", kelasIds: [], jumlahJam: 4 }])
      return
    }
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    setRows((prev) => [...prev, { guruId: "", kelasIds: [], jumlahJam: 4 }])
  }

  const toggleKelas = (rowIndex: number, kelasId: string) => {
    const row = rows[rowIndex]
    const has = row.kelasIds.includes(kelasId)
    updateRow(rowIndex, {
      kelasIds: has ? row.kelasIds.filter((k) => k !== kelasId) : [...row.kelasIds, kelasId],
    })
  }

  const toggleAllKelasRow = (rowIndex: number, availableKelas: Array<{ id: string }>) => {
    const currentIds = rows[rowIndex].kelasIds
    const availIds = availableKelas.map((k) => k.id)
    const allChecked = availIds.length > 0 && availIds.every((id) => currentIds.includes(id))

    if (allChecked) {
      const nextIds = currentIds.filter((id) => !availIds.includes(id))
      updateRow(rowIndex, { kelasIds: nextIds })
    } else {
      const nextSet = new Set([...currentIds, ...availIds])
      updateRow(rowIndex, { kelasIds: Array.from(nextSet) })
    }
  }

  const handleSave = async () => {
    const valid = rows.filter((r) => r.guruId && r.kelasIds.length > 0)
    if (valid.length === 0) {
      toast.error("Pilih minimal satu guru dan kelas")
      return
    }
    try {
      await saveMutation.mutateAsync({
        mataPelajaranId,
        assignments: valid.map((r) => ({ guruId: r.guruId, kelasIds: r.kelasIds, jumlahJam: r.jumlahJam })),
      })
      toast.success("Plotting pengajar berhasil disimpan")
      onClose()
    } catch {
      toast.error("Gagal menyimpan plotting pengajar")
    }
  }

  const isPending = saveMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto relative overflow-visible">
        <DialogHeader>
          <DialogTitle>Plotting Pengajar — {mataPelajaranNama}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, i) => {
              const taken = takenClassIds(i)
              const availableKelas = allKelas.filter((k) => !taken.has(k.id) || row.kelasIds.includes(k.id))
              const isAllClassesChecked =
                availableKelas.length > 0 && availableKelas.every((k) => row.kelasIds.includes(k.id))

              return (
                <div key={i} className="rounded-2xl border border-border/80 p-4 space-y-3 bg-card/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Guru Pengampu</Label>
                      <SearchableGuruSelect
                        value={row.guruId}
                        onChange={(v) =>
                          updateRow(i, { guruId: v, kelasIds: row.guruId !== v ? [] : row.kelasIds })
                        }
                        guruList={allGuru}
                      />
                    </div>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="mt-6 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {row.guruId && (
                    <div className="space-y-3 pt-1 border-t border-border/50">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Jumlah JP per Kelas</Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={row.jumlahJam}
                          onChange={(e) => {
                            const v = parseInt(e.target.value)
                            if (v >= 1 && v <= 20) updateRow(i, { jumlahJam: v })
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground">Pilih Kelas</Label>
                          {availableKelas.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleAllKelasRow(i, availableKelas)}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors cursor-pointer"
                            >
                              {isAllClassesChecked ? "Batal Pilih Semua" : "Pilih Semua Kelas"}
                            </button>
                          )}
                        </div>

                        {availableKelas.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Semua kelas sudah diampu guru lain</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {availableKelas.map((k) => {
                              const checked = row.kelasIds.includes(k.id)
                              return (
                                <label
                                  key={k.id}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors border select-none ${
                                    checked
                                      ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/60 text-teal-650 dark:text-teal-400 font-bold"
                                      : "border-border/60 hover:bg-accent text-foreground"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleKelas(i, k.id)}
                                    className="accent-teal-600 h-3.5 w-3.5 rounded"
                                  />
                                  <span>{k.tingkat ? `${k.tingkat} ${k.namaKelas}` : k.namaKelas}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={addRow}>
              <Plus className="h-4 w-4" /> Tambah Guru Pengampu
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || isLoading}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
