"use client"

import { useState, useMemo } from "react"
import { Plus, Loader2, Search, Filter, AlertCircle, CheckCircle, Users, Check, X, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"

function formatPoin(val: number) {
  return val > 0 ? `+${val}` : `${val}`
}

export default function PoinSiswaPage() {
  const [searchSiswaTable, setSearchSiswaTable] = useState("")
  const [filterJenis, setFilterJenis] = useState<string>("")
  
  // Modal State
  const [formOpen, setFormOpen] = useState(false)
  const [step, setStep] = useState<"siswa" | "kategori" | "tindaklanjut">("siswa")
  
  // Multi-Student Selection State
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([])
  const [kelasFilterModal, setKelasFilterModal] = useState<string>("all")
  const [siswaSearch, setSiswaSearch] = useState("")

  // Kategori & Tindak Lanjut State
  const [selectedJenis, setSelectedJenis] = useState<string>("")
  const [selectedKategori, setSelectedKategori] = useState<any>(null)
  const [kategoriSearch, setKategoriSearch] = useState("")
  const [selectedTindakLanjut, setSelectedTindakLanjut] = useState<string>("")

  const utils = api.useUtils()

  const { data: kelasListModal } = api.kelas.getAll.useQuery({ limit: 200 })
  const { data: siswaList } = api.siswa.getAll.useQuery({
    limit: 1000,
    kelasId: kelasFilterModal !== "all" ? kelasFilterModal : undefined,
  })

  const { data: kategoriList } = api.poin.getAllKategori.useQuery({
    aktifOnly: true,
    search: kategoriSearch || undefined,
    jenis: (selectedJenis as any) || undefined,
  })

  const { data: tindakLanjutList } = api.poin.getAllTindakLanjut.useQuery({
    jenis: (selectedJenis as any) || undefined,
  })

  const createSikap = api.poin.createSikap.useMutation({
    onSuccess: (res) => {
      toast.success(`Poin sikap berhasil dicatat untuk ${res?.count || selectedSiswaIds.length} siswa`)
      utils.poin.getAllSikap.invalidate()
      utils.poin.getDashboardSiswa.invalidate()
      utils.poin.getDashboardGuruAdmin.invalidate()
      resetForm()
    },
    onError: (e) => toast.error(e.message || "Gagal mencatat poin sikap"),
  })

  const { data: riwayat, isLoading: riwayatLoading } = api.poin.getAllSikap.useQuery({
    jenis: (filterJenis as any) || undefined,
    limit: 100,
  })

  // Filtered students in modal
  const modalFilteredSiswa = useMemo(() => {
    if (!siswaList) return []
    if (!siswaSearch.trim()) return siswaList
    const q = siswaSearch.toLowerCase()
    return siswaList.filter(
      (s: any) =>
        s.namaLengkap?.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.toLowerCase().includes(q))
    )
  }, [siswaList, siswaSearch])

  // Filtered riwayat table
  const filteredRiwayat = useMemo(() => {
    if (!riwayat) return []
    if (!searchSiswaTable.trim()) return riwayat
    const q = searchSiswaTable.toLowerCase()
    return riwayat.filter(
      (r: any) =>
        r.siswa?.namaLengkap?.toLowerCase().includes(q) ||
        r.kategori?.nama?.toLowerCase().includes(q)
    )
  }, [riwayat, searchSiswaTable])

  const resetForm = () => {
    setFormOpen(false)
    setStep("siswa")
    setSelectedSiswaIds([])
    setKelasFilterModal("all")
    setSelectedJenis("")
    setSelectedKategori(null)
    setKategoriSearch("")
    setSelectedTindakLanjut("")
    setSiswaSearch("")
  }

  const handleToggleSiswa = (id: string) => {
    if (selectedSiswaIds.includes(id)) {
      setSelectedSiswaIds(selectedSiswaIds.filter((sId) => sId !== id))
    } else {
      setSelectedSiswaIds([...selectedSiswaIds, id])
    }
  }

  const handleSelectAllFiltered = () => {
    const allFilteredIds = modalFilteredSiswa.map((s: any) => s.id)
    const allSelected = allFilteredIds.every((id: string) => selectedSiswaIds.includes(id))

    if (allSelected) {
      // Unselect all filtered
      setSelectedSiswaIds(selectedSiswaIds.filter((id) => !allFilteredIds.includes(id)))
    } else {
      // Select all filtered (merge unique)
      const merged = Array.from(new Set([...selectedSiswaIds, ...allFilteredIds]))
      setSelectedSiswaIds(merged)
    }
  }

  const handleSubmit = () => {
    if (selectedSiswaIds.length === 0) {
      toast.error("Pilih minimal 1 siswa")
      return
    }
    if (!selectedKategori) {
      toast.error("Pilih kategori sikap terlebih dahulu")
      return
    }
    createSikap.mutate({
      siswaIds: selectedSiswaIds,
      kategoriId: selectedKategori.id,
      tindakLanjutId: selectedTindakLanjut || null,
    })
  }

  // Map selected students details
  const selectedStudentsMap = useMemo(() => {
    if (!siswaList) return []
    return siswaList.filter((s: any) => selectedSiswaIds.includes(s.id))
  }, [siswaList, selectedSiswaIds])

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Poin Siswa
        </h2>
        <p className="text-muted-foreground text-xs mt-1">
          Input poin sikap (pelanggaran / prestasi) dan lihat riwayat siswa
        </p>
      </div>

      <Card className="p-5 rounded-3xl glass-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari siswa atau sikap..."
                className="pl-10 h-10 rounded-xl text-xs"
                value={searchSiswaTable}
                onChange={(e) => setSearchSiswaTable(e.target.value)}
              />
            </div>
            <Select value={filterJenis} onValueChange={(v) => setFilterJenis(v ?? "")}>
              <SelectTrigger className="w-32 h-10 rounded-xl text-xs font-bold">
                <SelectValue placeholder="Semua Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="positif">Positif (+)</SelectItem>
                <SelectItem value="negatif">Negatif (-)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/10 cursor-pointer transition-all duration-300 transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Input Poin Siswa</span>
          </button>
        </div>

        {riwayatLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredRiwayat.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold">Belum ada catatan poin sikap</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Siswa</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sikap / Kategori</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Poin</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tindak Lanjut</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Penginput</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRiwayat.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap font-medium">
                        {format(new Date(r.createdAt), "d MMM yyyy, HH:mm", { locale: id })}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-100">
                        {r.siswa?.namaLengkap || "-"}
                        {r.siswa?.kelas && (
                          <span className="text-[10px] text-slate-400 font-semibold ml-1">
                            ({r.siswa?.kelas?.namaKelas || ""})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs font-semibold">
                        {r.kategori?.nama || "-"}
                      </TableCell>
                      <TableCell className={`font-black ${r.poin > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatPoin(r.poin)}
                      </TableCell>
                      <TableCell className="text-xs">{r.tindakLanjut?.nama || "-"}</TableCell>
                      <TableCell className="text-xs text-slate-500">{r.guru?.namaLengkap || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "selesai"
                              ? "default"
                              : r.status === "sedang_diproses"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] whitespace-nowrap uppercase tracking-wider"
                        >
                          {r.status === "belum_diproses"
                            ? "Baru"
                            : r.status === "sedang_diproses"
                            ? "Diproses"
                            : "Selesai"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {filteredRiwayat.map((r: any) => (
                <div key={r.id} className="glass-card rounded-2xl p-4 space-y-2 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {r.siswa?.namaLengkap || "-"}
                    </span>
                    <span className={`font-black text-sm ${r.poin > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatPoin(r.poin)}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span className="font-semibold">Tanggal:</span>
                      <span>{format(new Date(r.createdAt), "d MMM yyyy, HH:mm", { locale: id })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Sikap:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{r.kategori?.nama || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Tindak Lanjut:</span>
                      <span>{r.tindakLanjut?.nama || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Penginput:</span>
                      <span>{r.guru?.namaLengkap || "-"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Input Form Modal with Multi-Student Support */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && !createSikap.isPending && resetForm()}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 rounded-3xl">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800 dark:text-slate-100">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Input Poin Sikap Siswa</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-3 overflow-y-auto flex-1 pr-1">
            {/* Step Wizard Indicator */}
            <div className="flex items-center justify-between text-xs font-bold bg-slate-50 dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              {[
                { id: "siswa", label: "1. Pilih Siswa" },
                { id: "kategori", label: "2. Pilih Sikap" },
                { id: "tindaklanjut", label: "3. Konfirmasi" },
              ].map((st, i) => {
                const steps = ["siswa", "kategori", "tindaklanjut"]
                const currentIdx = steps.indexOf(step)
                const isActive = steps.indexOf(st.id) <= currentIdx

                return (
                  <div key={st.id} className={`flex items-center gap-1.5 ${isActive ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-slate-400"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isActive ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <span>{st.label}</span>
                  </div>
                )
              })}
            </div>

            {/* STEP 1: Pilih Siswa (Bisa Pilihan Ganda / Multiple Students) */}
            {step === "siswa" && (
              <div className="space-y-3">
                {/* Filter Kelas & Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Select value={kelasFilterModal} onValueChange={(v) => v && setKelasFilterModal(v)}>
                    <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kelas</SelectItem>
                      {kelasListModal?.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.tingkat ? `Kelas ${k.tingkat} - ` : ""}{k.namaKelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama siswa..."
                      value={siswaSearch}
                      onChange={(e) => setSiswaSearch(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Counter & Select All Controls */}
                <div className="flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Terpilih: <strong>{selectedSiswaIds.length} Siswa</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {modalFilteredSiswa.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                      >
                        {modalFilteredSiswa.every((s: any) => selectedSiswaIds.includes(s.id))
                          ? "Batal Pilih Semua"
                          : `Pilih Semua (${modalFilteredSiswa.length})`}
                      </button>
                    )}
                    {selectedSiswaIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSiswaIds([])}
                        className="text-[10px] font-extrabold text-rose-600 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* List of Students with Checkboxes */}
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {!siswaList ? (
                    <p className="text-center text-muted-foreground py-8 text-xs font-semibold">Memuat data siswa...</p>
                  ) : modalFilteredSiswa.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-xs font-semibold">Siswa tidak ditemukan</p>
                  ) : (
                    modalFilteredSiswa.map((s: any) => {
                      const isSelected = selectedSiswaIds.includes(s.id)
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleToggleSiswa(s.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs"
                              : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} onCheckedChange={() => handleToggleSiswa(s.id)} />
                            <span>{s.namaLengkap}</span>
                          </div>
                          {s.kelas && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {s.kelas?.namaKelas || ""}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                <Button
                  disabled={selectedSiswaIds.length === 0}
                  onClick={() => setStep("kategori")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold text-xs gap-2 cursor-pointer mt-2"
                >
                  <span>Lanjut Pilih Sikap ({selectedSiswaIds.length} Siswa Terpilih)</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* STEP 2: Pilih Jenis + Kategori Sikap */}
            {step === "kategori" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJenis("positif")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedJenis === "positif"
                        ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750"
                    }`}
                  >
                    Sikap Positif / Prestasi (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedJenis("negatif")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedJenis === "negatif"
                        ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-2 border-rose-500 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750"
                    }`}
                  >
                    Sikap Negatif / Pelanggaran (-)
                  </button>
                </div>

                {selectedJenis ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Cari kategori sikap..."
                        value={kategoriSearch}
                        onChange={(e) => setKategoriSearch(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {kategoriList?.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6 text-xs font-semibold">Tidak ada kategori sikap</p>
                      ) : (
                        kategoriList?.map((k: any) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => {
                              setSelectedKategori(k)
                              setStep("tindaklanjut")
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                              selectedKategori?.id === k.id
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold"
                                : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                            }`}
                          >
                            <span>{k.nama}</span>
                            <span className={`font-black ${k.poin > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {formatPoin(k.poin)} Poin
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-6 text-xs font-semibold">
                    Silakan pilih jenis sikap (Positif atau Negatif) terlebih dahulu di atas.
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep("siswa")} className="rounded-xl h-9 text-xs font-bold gap-1 cursor-pointer">
                    <ArrowLeft className="w-4 h-4" /> Kembali
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Tindak Lanjut & Konfirmasi */}
            {step === "tindaklanjut" && (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Siswa Terpilih ({selectedSiswaIds.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {selectedStudentsMap.map((s: any) => (
                        <span key={s.id} className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                          {s.namaLengkap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedKategori && (
                    <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 pt-2.5">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Kategori Sikap</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedKategori.nama}</span>
                      </div>
                      <span className={`text-sm font-black ${selectedKategori.poin > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatPoin(selectedKategori.poin)} Poin
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tindak Lanjut (Opsional)</label>
                  <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTindakLanjut("")}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        !selectedTindakLanjut
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300"
                          : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-500"
                      }`}
                    >
                      Tanpa Tindak Lanjut Khusus
                    </button>
                    {tindakLanjutList?.map((tl: any) => (
                      <button
                        key={tl.id}
                        type="button"
                        onClick={() => setSelectedTindakLanjut(tl.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          selectedTindakLanjut === tl.id
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300"
                            : "bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {tl.nama}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" onClick={() => setStep("kategori")} className="rounded-xl h-10 text-xs font-bold gap-1 cursor-pointer">
                    <ArrowLeft className="w-4 h-4" /> Kembali
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createSikap.isPending}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl h-10 text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    {createSikap.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Menyimpan...
                      </>
                    ) : (
                      `Simpan Poin (${selectedSiswaIds.length} Siswa)`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
