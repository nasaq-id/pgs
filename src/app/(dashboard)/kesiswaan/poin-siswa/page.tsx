"use client"

import { useState } from "react"
import { Plus, Loader2, Search, Filter, AlertCircle, CheckCircle } from "lucide-react"
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
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"

function formatPoin(val: number) {
  return val > 0 ? `+${val}` : `${val}`
}

export default function PoinSiswaPage() {
  const [searchSiswa, setSearchSiswa] = useState("")
  const [filterJenis, setFilterJenis] = useState<string>("")
  const [siswaSearch, setSiswaSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [step, setStep] = useState<"siswa" | "kategori" | "tindaklanjut">("siswa")
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null)
  const [selectedJenis, setSelectedJenis] = useState<string>("")
  const [selectedKategori, setSelectedKategori] = useState<any>(null)
  const [kategoriSearch, setKategoriSearch] = useState("")
  const [selectedTindakLanjut, setSelectedTindakLanjut] = useState<string>("")
  const utils = api.useUtils()

  const { data: siswaList } = api.siswa.getAll.useQuery({ limit: 500, search: siswaSearch || undefined })
  const { data: kategoriList } = api.poin.getAllKategori.useQuery({
    aktifOnly: true,
    search: kategoriSearch || undefined,
    jenis: (selectedJenis as any) || undefined,
  })
  const { data: tindakLanjutList } = api.poin.getAllTindakLanjut.useQuery({
    jenis: (selectedJenis as any) || undefined,
  })

  const createSikap = api.poin.createSikap.useMutation({
    onSuccess: () => {
      toast.success("Poin berhasil dicatat")
      utils.poin.getAllSikap.invalidate()
      utils.poin.getDashboardSiswa.invalidate()
      utils.poin.getDashboardGuruAdmin.invalidate()
      resetForm()
    },
    onError: (e) => toast.error(e.message),
  })

  const { data: riwayat, isLoading: riwayatLoading } = api.poin.getAllSikap.useQuery({
    jenis: (filterJenis as any) || undefined,
    limit: 100,
  })

  const filteredSiswa = siswaList?.filter((s: any) =>
    s.namaLengkap?.toLowerCase().includes(searchSiswa.toLowerCase())
  ) || []

  const resetForm = () => {
    setFormOpen(false)
    setStep("siswa")
    setSelectedSiswa(null)
    setSelectedJenis("")
    setSelectedKategori(null)
    setKategoriSearch("")
    setSelectedTindakLanjut("")
    setSiswaSearch("")
  }

  const handleSubmit = () => {
    if (!selectedSiswa || !selectedKategori) {
      toast.error("Lengkapi semua data")
      return
    }
    createSikap.mutate({
      siswaId: selectedSiswa.id,
      kategoriId: selectedKategori.id,
      tindakLanjutId: selectedTindakLanjut || null,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Poin Siswa</h2>
        <p className="text-muted-foreground">Input poin sikap dan lihat riwayat siswa</p>
      </div>

      <Card className="p-5 rounded-3xl glass-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari siswa..."
                className="pl-9"
                value={searchSiswa}
                onChange={(e) => setSearchSiswa(e.target.value)}
              />
            </div>
            <Select value={filterJenis} onValueChange={(v) => setFilterJenis(v || "")}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Semua" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Semua</SelectItem>
                <SelectItem value="positif">Positif</SelectItem>
                <SelectItem value="negatif">Negatif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Input Poin
          </Button>
        </div>

        {riwayatLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
        ) : !riwayat?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada catatan poin</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Siswa</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sikap</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Poin</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tindak Lanjut</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Penginput</TableHead>
                  <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riwayat.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(r.createdAt), "d MMM HH:mm", { locale: id })}
                    </TableCell>
                    <TableCell className="font-medium">{r.siswa?.namaLengkap || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.kategori?.nama || "-"}</TableCell>
                    <TableCell className={`font-bold ${r.poin > 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatPoin(r.poin)}
                    </TableCell>
                    <TableCell className="text-xs">{r.tindakLanjut?.nama || "-"}</TableCell>
                    <TableCell className="text-xs">{r.guru?.namaLengkap || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={
                        r.status === "selesai" ? "default" :
                        r.status === "sedang_diproses" ? "secondary" : "outline"
                      } className="text-[10px] whitespace-nowrap">
                        {r.status === "belum_diproses" ? "Baru" :
                         r.status === "sedang_diproses" ? "Diproses" : "Selesai"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Input Poin Sikap</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-xs font-medium">
              {["Pilih Siswa", "Pilih Sikap", "Tindak Lanjut"].map((label, i) => {
                const steps = ["siswa", "kategori", "tindaklanjut"]
                const currentIdx = steps.indexOf(step)
                const isActive = steps.indexOf(steps[i]) <= currentIdx
                return (
                  <div key={label} className={`flex items-center gap-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>{i + 1}</div>
                    <span>{label}</span>
                    {i < 2 && <div className="h-px w-6 bg-border mx-1" />}
                  </div>
                )
              })}
            </div>

            {/* Step: Pilih Siswa */}
            {step === "siswa" && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                <Input
                  placeholder="Cari nama siswa..."
                  value={siswaSearch}
                  onChange={(e) => setSiswaSearch(e.target.value)}
                  className="sticky top-0 z-10"
                />
                {!siswaList?.length ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Memuat data siswa...</p>
                ) : filteredSiswa.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Siswa tidak ditemukan</p>
                ) : (
                  <div className="space-y-1">
                    {filteredSiswa.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedSiswa(s); setStep("kategori") }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                          selectedSiswa?.id === s.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                        }`}
                      >
                        {s.namaLengkap}
                        {s.kelas && <span className="text-xs text-muted-foreground ml-2">({s.kelas?.namaKelas || ""})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Pilih Jenis + Kategori */}
            {step === "kategori" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedJenis("positif")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      selectedJenis === "positif" ? "bg-green-100 text-green-700 ring-2 ring-green-500" : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    Positif
                  </button>
                  <button
                    onClick={() => setSelectedJenis("negatif")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      selectedJenis === "negatif" ? "bg-red-100 text-red-700 ring-2 ring-red-500" : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    Negatif
                  </button>
                </div>

                {selectedJenis && (
                  <>
                    <Input
                      placeholder="Cari sikap..."
                      value={kategoriSearch}
                      onChange={(e) => setKategoriSearch(e.target.value)}
                    />
                    <div className="space-y-1 max-h-[220px] overflow-y-auto">
                      {kategoriList?.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">Tidak ada kategori sikap</p>
                      ) : (
                        kategoriList?.map((k: any) => (
                          <button
                            key={k.id}
                            onClick={() => { setSelectedKategori(k); setStep("tindaklanjut") }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                              selectedKategori?.id === k.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                            }`}
                          >
                            <span>{k.nama}</span>
                            <span className={`font-bold ${k.poin > 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatPoin(k.poin)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: Tindak Lanjut */}
            {step === "tindaklanjut" && (
              <div className="space-y-3">
                {selectedKategori && (
                  <div className="p-3 rounded-xl bg-muted/50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{selectedKategori.nama}</p>
                      <p className="text-xs text-muted-foreground">Poin: <span className={`font-bold ${selectedKategori.poin > 0 ? "text-green-600" : "text-red-600"}`}>{formatPoin(selectedKategori.poin)}</span></p>
                    </div>
                    <Badge variant={selectedKategori.jenis === "positif" ? "default" : "destructive"}>
                      {selectedKategori.jenis}
                    </Badge>
                  </div>
                )}
                <p className="text-sm font-medium">Tindak Lanjut (opsional)</p>
                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  <button
                    onClick={() => setSelectedTindakLanjut("")}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                      !selectedTindakLanjut ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Tidak ada tindak lanjut
                  </button>
                  {tindakLanjutList?.map((tl: any) => (
                    <button
                      key={tl.id}
                      onClick={() => setSelectedTindakLanjut(tl.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                        selectedTindakLanjut === tl.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                      }`}
                    >
                      {tl.nama}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Poin akan dicatat dengan penginput: Anda (guru)</span>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleSubmit}
                    disabled={createSikap.isPending}
                    style={{ backgroundColor: "hsl(142 72% 40%)" }}
                    className="w-full"
                  >
                    {createSikap.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Simpan Poin
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
