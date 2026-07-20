"use client"

import { useState, useEffect, useRef } from "react"
import { X, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/trpc/client"

const KELOMPOK_OPTIONS = [
  { value: "A", label: "Mata Pelajaran Wajib" },
  { value: "B", label: "Mata Pelajaran Pilihan" },
  { value: "C", label: "Mata Pelajaran Peminatan" },
  { value: "muatan_lokal", label: "Muatan Lokal" },
]

export interface MapelFormData {
  id?: string
  namaMapel: string
  kodeMapel?: string
  kelompok?: string
  aktif?: boolean
  selectedKelasIds?: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: MapelFormData) => Promise<void>
  initial?: MapelFormData | null
  saving?: boolean
}

export default function MapelFormDialog({ open, onClose, onSubmit, initial, saving }: Props) {
  const [namaMapel, setNamaMapel] = useState("")
  const [kodeMapel, setKodeMapel] = useState("")
  const [kelompok, setKelompok] = useState("")
  const [aktif, setAktif] = useState("Aktif")
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([])
  const [kelasDropdownOpen, setKelasDropdownOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 }, { enabled: open })
  const { data: existingPengampu } = api.pengampu.getByMapel.useQuery(
    { mataPelajaranId: initial?.id ?? "" },
    { enabled: open && !!initial?.id }
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setKelasDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    if (initial) {
      setNamaMapel(initial.namaMapel ?? "")
      setKodeMapel(initial.kodeMapel ?? "")
      setKelompok(initial.kelompok ?? "")
      setAktif(initial.aktif !== false ? "Aktif" : "Tidak Aktif")

      if (initial.selectedKelasIds) {
        setSelectedKelasIds(initial.selectedKelasIds)
      } else if (existingPengampu?.assignments) {
        const kIds = Array.from(new Set(existingPengampu.assignments.map((a) => a.kelasId)))
        setSelectedKelasIds(kIds)
      } else {
        setSelectedKelasIds([])
      }
    } else {
      setNamaMapel("")
      setKodeMapel("")
      setKelompok("")
      setAktif("Aktif")
      setSelectedKelasIds([])
    }
  }, [open, initial, existingPengampu])

  const isSemuaSelected = (kelasList?.length ?? 0) > 0 && selectedKelasIds.length === kelasList!.length

  const toggleSemuaKelas = () => {
    if (!kelasList) return
    if (isSemuaSelected) {
      setSelectedKelasIds([])
    } else {
      setSelectedKelasIds(kelasList.map((k) => k.id))
    }
  }

  const toggleKelas = (id: string) => {
    if (selectedKelasIds.includes(id)) {
      setSelectedKelasIds(selectedKelasIds.filter((kId) => kId !== id))
    } else {
      setSelectedKelasIds([...selectedKelasIds, id])
    }
  }

  const getKelasLabel = () => {
    if (!kelasList || kelasList.length === 0) return "Memuat kelas..."
    if (selectedKelasIds.length === 0) return "Pilih Kelas..."
    if (isSemuaSelected) return `Semua Kelas (${kelasList.length} Kelas)`
    if (selectedKelasIds.length === 1) {
      const found = kelasList.find((k) => k.id === selectedKelasIds[0])
      return found ? found.namaKelas : "1 Kelas"
    }
    if (selectedKelasIds.length <= 3) {
      const names = selectedKelasIds
        .map((id) => kelasList.find((k) => k.id === id)?.namaKelas)
        .filter(Boolean)
        .join(", ")
      return names || `${selectedKelasIds.length} Kelas`
    }
    return `${selectedKelasIds.length} Kelas Terpilih`
  }

  const handleSubmit = async () => {
    if (!namaMapel.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        id: initial?.id,
        namaMapel: namaMapel.trim(),
        kodeMapel: kodeMapel.trim() || undefined,
        kelompok: kelompok || undefined,
        aktif: aktif === "Aktif",
        selectedKelasIds,
      })
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const isLoading = saving || submitting

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay">
      <div className="glass-dialog rounded-2xl w-full max-w-md mx-4 relative overflow-visible">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="font-semibold text-foreground">Form Mata Pelajaran</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Nama</Label>
            <Input
              placeholder="Nama"
              value={namaMapel}
              onChange={(e) => setNamaMapel(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Kode</Label>
            <Input
              placeholder="Kode Mata Pelajaran"
              value={kodeMapel}
              onChange={(e) => setKodeMapel(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Kelompok</Label>
            <Select value={kelompok} onValueChange={(v) => setKelompok(v ?? "")} options={KELOMPOK_OPTIONS}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih Kelompok" />
              </SelectTrigger>
              <SelectContent>
                {KELOMPOK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-Select Kelas */}
          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Pilih Kelas</Label>
            <div className="relative flex-1" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setKelasDropdownOpen(!kelasDropdownOpen)}
                className="w-full flex h-9 items-center justify-between gap-1.5 px-3 py-2 text-sm rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 text-foreground transition-all outline-none select-none cursor-pointer focus-visible:ring-3 focus-visible:ring-teal-500/15"
              >
                <span className="truncate">{getKelasLabel()}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
              </button>

              {kelasDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] rounded-2xl glass text-popover-foreground p-2 space-y-1 max-h-52 overflow-y-auto shadow-2xl animate-in fade-in-50 zoom-in-95 border border-border/40">
                  <div
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer text-xs font-black uppercase text-teal-650 dark:text-teal-400 select-none border-b border-slate-100 dark:border-slate-800 pb-2 mb-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSemuaKelas()
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSemuaSelected
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      {isSemuaSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>Semua Kelas</span>
                  </div>

                  {(!kelasList || kelasList.length === 0) ? (
                    <p className="text-xs text-slate-400 p-2 text-center">Tidak ada kelas tersedia</p>
                  ) : (
                    kelasList.map((k) => {
                      const isChecked = selectedKelasIds.includes(k.id)
                      return (
                        <div
                          key={k.id}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 select-none"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleKelas(k.id)
                          }}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? "bg-teal-600 border-teal-600 text-white"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{k.namaKelas}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Status</Label>
            <Select value={aktif} onValueChange={(v) => setAktif(v ?? "Aktif")}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aktif">Aktif</SelectItem>
                <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !namaMapel.trim()}>
            {isLoading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  )
}
