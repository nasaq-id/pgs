"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Loader2, Plus, X, ChevronDown, Check, Search } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

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
  /** Alokasi JP dari master mapel (generate KMA / impor) — dipakai sebagai default plotting */
  jumlahJam?: number | null
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
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] rounded-2xl bg-popover text-popover-foreground p-2 space-y-2 max-h-60 overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama guru..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-foreground"
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
                      ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-foreground"
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

export default function PengampuDialog({ open, onClose, mataPelajaranId, mataPelajaranNama, jumlahJam: mapelJumlahJam }: Props) {
  const [mounted, setMounted] = useState(false)
  const { data, isLoading } = api.pengampu.getByMapel.useQuery({ mataPelajaranId }, { enabled: open })
  const saveMutation = api.pengampu.save.useMutation()

  const defaultJumlahJam = mapelJumlahJam && mapelJumlahJam > 0 ? mapelJumlahJam : 4

  const [rows, setRows] = useState<AssignmentRow[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

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
      initial.push({ guruId, kelasIds, jumlahJam: existingAssignment?.jumlahJam ?? defaultJumlahJam })
    }
    if (initial.length === 0) {
      initial.push({ guruId: "", kelasIds: [], jumlahJam: defaultJumlahJam })
    }
    setRows(initial)
  }, [data, defaultJumlahJam])

  const allKelas = data?.allKelas ?? []
  const allGuru = data?.allGuru ?? []

  const updateRow = (idx: number, patch: Partial<AssignmentRow>) => {
    setRows((curr) => curr.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRows((curr) => [...curr, { guruId: "", kelasIds: [], jumlahJam: defaultJumlahJam }])
  }

  const removeRow = (idx: number) => {
    setRows((curr) => curr.filter((_, i) => i !== idx))
  }

  const toggleKelas = (rowIndex: number, kelasId: string) => {
    const row = rows[rowIndex]
    const next = row.kelasIds.includes(kelasId)
      ? row.kelasIds.filter((id) => id !== kelasId)
      : [...row.kelasIds, kelasId]
    updateRow(rowIndex, { kelasIds: next })
  }

  const takenClassIds = (excludeRowIndex: number) => {
    const s = new Set<string>()
    rows.forEach((r, i) => {
      if (i !== excludeRowIndex) {
        r.kelasIds.forEach((id) => s.add(id))
      }
    })
    return s
  }

  const toggleAllKelasRow = (rowIndex: number, availableKelas: typeof allKelas) => {
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

  if (!open || !mounted) return null

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/20 p-4 animate-in fade-in duration-200"
    >
      <div className="bg-background rounded-3xl w-full max-w-xl mx-4 relative shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
          <div>
            <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-100">
              Plotting Pengajar — {mataPelajaranNama}
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 font-bold mt-0.5">
              Atur guru pengampu dan plotting kelas untuk mata pelajaran ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-6 pr-1 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((row, i) => {
                const taken = takenClassIds(i)
                const availableKelas = allKelas.filter((k) => !taken.has(k.id) || row.kelasIds.includes(k.id))
                const isAllClassesChecked =
                  availableKelas.length > 0 && availableKelas.every((k) => row.kelasIds.includes(k.id))

                return (
                  <div key={i} className="rounded-2xl border border-slate-150 dark:border-slate-800 p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500">Guru Pengampu</Label>
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
                          className="mt-6 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {row.guruId && (
                      <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">


                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-500">Pilih Kelas</Label>
                            {availableKelas.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleAllKelasRow(i, availableKelas)}
                                className="text-xs font-bold text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 transition-colors cursor-pointer"
                              >
                                {isAllClassesChecked ? "Batal Pilih Semua" : "Pilih Semua Kelas"}
                              </button>
                            )}
                          </div>

                          {availableKelas.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Semua kelas sudah diampu guru lain</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {availableKelas.map((k) => {
                                const checked = row.kelasIds.includes(k.id)
                                return (
                                  <label
                                    key={k.id}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] cursor-pointer transition-colors border select-none ${
                                      checked
                                        ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-400 font-bold"
                                        : "border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleKelas(i, k.id)}
                                      className="accent-teal-600 h-3.5 w-3.5 rounded cursor-pointer"
                                    />
                                    <span className="truncate">{k.tingkat ? `${k.tingkat} ${k.namaKelas}` : k.namaKelas}</span>
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

              <button
                type="button"
                className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer"
                onClick={addRow}
              >
                <Plus className="h-4 w-4" /> Tambah Guru Pengampu
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || isLoading}
            className="flex-1 py-2.5 bg-teal-600 dark:bg-teal-700 hover:bg-teal-700 dark:hover:bg-teal-600 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-teal-500/10"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Simpan</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
