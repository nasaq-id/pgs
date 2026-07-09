"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, X } from "lucide-react"
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
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
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

              return (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <Label>Guru</Label>
                      <Select
                        value={row.guruId}
                        onValueChange={(v) => updateRow(i, { guruId: v || "", kelasIds: row.guruId !== v ? [] : row.kelasIds })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih guru" />
                        </SelectTrigger>
                        <SelectContent>
                          {allGuru.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="mt-6 h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {row.guruId && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Jumlah JP per Kelas</Label>
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
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Pilih Kelas</Label>
                        {availableKelas.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Semua kelas sudah diampu guru lain</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {availableKelas.map((k) => {
                              const checked = row.kelasIds.includes(k.id)
                              return (
                                <label
                                  key={k.id}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                                    checked
                                      ? "bg-primary/10 text-primary font-medium"
                                      : "hover:bg-muted text-foreground"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleKelas(i, k.id)}
                                    className="accent-primary h-3.5 w-3.5"
                                  />
                                  {k.tingkat ? `${k.tingkat} ${k.namaKelas}` : k.namaKelas}
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="w-full gap-2" onClick={addRow}>
                    <Plus className="h-4 w-4" /> Tambah Guru
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button
            onClick={handleSave}
            disabled={isPending || isLoading}
            className="gap-2"
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
