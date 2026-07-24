"use client"

import { useState } from "react"
import { Search, FileSpreadsheet, FileText, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"

function formatPoin(val: number) {
  return val > 0 ? `+${val}` : `${val}`
}

export default function LaporanPoinPage() {
  const [tab, setTab] = useState("semua")
  const [tanggalMulai, setTanggalMulai] = useState("")
  const [tanggalSelesai, setTanggalSelesai] = useState("")
  const [filterJenis, setFilterJenis] = useState<string>("")
  const [siswaSearch, setSiswaSearch] = useState("")
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null)

  const { data: siswaList } = api.siswa.getAll.useQuery({ limit: 500 })

  const { data: laporanData, isLoading } = api.poin.getLaporanData.useQuery({
    tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : undefined,
    tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai + "T23:59:59") : undefined,
    jenis: (filterJenis as any) || undefined,
    siswaId: selectedSiswa?.id || undefined,
    limit: 1000,
  })

  const { data: raporData, isLoading: raporLoading } = api.poin.getRaporSiswa.useQuery(
    { siswaId: selectedSiswa?.id || "" },
    { enabled: !!selectedSiswa?.id && tab === "per-siswa" },
  )

  const generateCSV = () => {
    if (!laporanData?.length) {
      toast.error("Tidak ada data untuk di-export")
      return
    }
    const headers = ["Tanggal", "Siswa", "NISN", "Kelas", "Sikap", "Jenis", "Poin", "Tindak Lanjut", "Penginput", "Status"]
    const rows = laporanData.map((r: any) => [
      format(new Date(r.createdAt), "yyyy-MM-dd HH:mm"),
      r.siswa?.namaLengkap || "",
      r.siswa?.nisn || "",
      r.siswa?.kelas?.namaKelas || "",
      r.kategori?.nama || "",
      r.kategori?.jenis || "",
      r.poin,
      r.tindakLanjut?.nama || "",
      r.guru?.namaLengkap || "",
      r.status,
    ])
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `laporan-poin-${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success("File CSV berhasil diunduh")
  }

  const generateRaporCSV = () => {
    if (!raporData?.records?.length) {
      toast.error("Tidak ada data rapor")
      return
    }
    const headers = ["Tanggal", "Sikap", "Jenis", "Poin", "Tindak Lanjut", "Penginput", "Status"]
    const rows = raporData.records.map((r: any) => [
      format(new Date(r.createdAt), "yyyy-MM-dd HH:mm"),
      r.kategori?.nama || "",
      r.kategori?.jenis || "",
      r.poin,
      r.tindakLanjut?.nama || "",
      r.guru?.namaLengkap || "",
      r.status,
    ])
    const csv = [
      `Rapor Karakter: ${raporData.siswa?.namaLengkap}`,
      `NISN: ${raporData.siswa?.nisn || "-"}`,
      `Total Poin: ${raporData.totalPoin}`,
      `Positif: ${raporData.positifCount} | Negatif: ${raporData.negatifCount}`,
      "",
      headers.join(","),
      ...rows.map((r: any) => r.join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `rapor-karakter-${raporData.siswa?.namaLengkap?.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success("File CSV rapor berhasil diunduh")
  }

  const printTable = () => {
    window.print()
  }

  const filteredSiswa = siswaList?.filter((s: any) =>
    s.namaLengkap?.toLowerCase().includes(siswaSearch.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body { background: white; }
          
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 4px 6px; font-size: 9px; }
          th { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Laporan Poin</h2>
        <p className="text-muted-foreground">Filter, cetak, dan export laporan poin siswa</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="rounded-2xl neumo-card bg-background p-1">
          <TabsTrigger value="semua" className="rounded-xl">Semua Riwayat</TabsTrigger>
          <TabsTrigger value="per-siswa" className="rounded-xl">Per Siswa (Rapor Karakter)</TabsTrigger>
        </TabsList>

        <TabsContent value="semua" className="space-y-4">
          <div className="neumo-card bg-background rounded-3xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5 no-print">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tanggal Mulai</label>
                <Input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tanggal Selesai</label>
                <Input type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Jenis Sikap</label>
                <Select value={filterJenis} onValueChange={(v) => setFilterJenis(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Semua</SelectItem>
                    <SelectItem value="positif">Positif</SelectItem>
                    <SelectItem value="negatif">Negatif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={generateCSV} className="gap-2 flex-1 no-print">
                  <FileSpreadsheet className="h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" onClick={printTable} className="gap-2 flex-1 no-print">
                  <Printer className="h-4 w-4" /> Cetak
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : !laporanData?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Tidak ada data sesuai filter</p>
              </div>
            ) : (
              <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Siswa</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sikap</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jenis</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Poin</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tindak Lanjut</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Penginput</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laporanData.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(r.createdAt), "d MMM yyyy HH:mm", { locale: id })}
                        </TableCell>
                        <TableCell className="font-medium">{r.siswa?.namaLengkap || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{r.kategori?.nama || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={r.kategori?.jenis === "positif" ? "default" : "destructive"} className="text-[10px]">
                            {r.kategori?.jenis === "positif" ? "Positif" : "Negatif"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-bold ${r.poin > 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatPoin(r.poin)}
                        </TableCell>
                        <TableCell className="text-xs">{r.tindakLanjut?.nama || "-"}</TableCell>
                        <TableCell className="text-xs">{r.guru?.namaLengkap || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "selesai" ? "default" : "outline"} className="text-[10px] whitespace-nowrap">
                            {r.status === "belum_diproses" ? "Baru" : r.status === "sedang_diproses" ? "Diproses" : "Selesai"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-2">
                {laporanData.map((r: any) => (
                  <div key={r.id} className="neumo-card bg-background rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{r.siswa?.namaLengkap || "-"}</span>
                      <span className={`font-black text-sm ${r.poin > 0 ? "text-green-600" : "text-red-600"}`}>{formatPoin(r.poin)}</span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex justify-between"><span className="font-semibold">Tanggal:</span><span>{format(new Date(r.createdAt), "d MMM yyyy HH:mm", { locale: id })}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Sikap:</span><span>{r.kategori?.nama || "-"}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Jenis:</span><Badge variant={r.kategori?.jenis === "positif" ? "default" : "destructive"} className="text-[10px]">{r.kategori?.jenis === "positif" ? "Positif" : "Negatif"}</Badge></div>
                      <div className="flex justify-between"><span className="font-semibold">Tindak Lanjut:</span><span>{r.tindakLanjut?.nama || "-"}</span></div>
                      <div className="flex justify-between"><span className="font-semibold">Penginput:</span><span>{r.guru?.namaLengkap || "-"}</span></div>
                      <div className="flex justify-between items-center"><span className="font-semibold">Status:</span><Badge variant={r.status === "selesai" ? "default" : "outline"} className="text-[10px]">{r.status === "belum_diproses" ? "Baru" : r.status === "sedang_diproses" ? "Diproses" : "Selesai"}</Badge></div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="per-siswa" className="space-y-4">
          <div className="neumo-card bg-background rounded-3xl p-5">
              <div className="flex items-center gap-3 mb-5 no-print">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama siswa..."
                    className="pl-9"
                    value={siswaSearch}
                    onChange={(e) => setSiswaSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={generateRaporCSV} disabled={!raporData} className="gap-2 no-print">
                  <FileText className="h-4 w-4" /> Export Rapor CSV
                </Button>
                <Button variant="outline" onClick={printTable} className="gap-2 no-print">
                  <Printer className="h-4 w-4" /> Cetak
                </Button>
              </div>

            {siswaSearch && (
              <div className="mb-5 max-h-[200px] overflow-y-auto space-y-1">
                {filteredSiswa.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Siswa tidak ditemukan</p>
                ) : (
                  filteredSiswa.slice(0, 10).map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSiswa(s); setSiswaSearch(s.namaLengkap) }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                        selectedSiswa?.id === s.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                      }`}
                    >
                      {s.namaLengkap}
                      {s.kelas && <span className="text-xs text-muted-foreground ml-2">({s.kelas?.namaKelas || ""})</span>}
                    </button>
                  ))
                )}
              </div>
            )}

            {raporLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : raporData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-muted/50 text-center">
                    <p className="text-2xl font-black text-foreground">{raporData.totalPoin}</p>
                    <p className="text-xs text-muted-foreground">Total Poin</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-green-50/50 dark:bg-green-950/20 text-center">
                    <p className="text-2xl font-black text-green-600">{raporData.positifCount}</p>
                    <p className="text-xs text-muted-foreground">Positif</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 text-center">
                    <p className="text-2xl font-black text-red-600">{raporData.negatifCount}</p>
                    <p className="text-xs text-muted-foreground">Negatif</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/50 text-center">
                    <p className="text-2xl font-black text-foreground">{raporData.records.length}</p>
                    <p className="text-xs text-muted-foreground">Total Catatan</p>
                  </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sikap</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jenis</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Poin</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tindak Lanjut</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Penginput</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {raporData.records.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(r.createdAt), "d MMM yyyy HH:mm", { locale: id })}
                          </TableCell>
                          <TableCell>{r.kategori?.nama || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={r.kategori?.jenis === "positif" ? "default" : "destructive"} className="text-[10px]">
                              {r.kategori?.jenis === "positif" ? "Positif" : "Negatif"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-bold ${r.poin > 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatPoin(r.poin)}
                          </TableCell>
                          <TableCell className="text-xs">{r.tindakLanjut?.nama || "-"}</TableCell>
                          <TableCell className="text-xs">{r.guru?.namaLengkap || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "selesai" ? "default" : "outline"} className="text-[10px]">
                              {r.status === "belum_diproses" ? "Baru" : r.status === "sedang_diproses" ? "Diproses" : "Selesai"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-2">
                  {raporData.records.map((r: any) => (
                    <div key={r.id} className="neumo-card bg-background rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-black text-sm ${r.poin > 0 ? "text-green-600" : "text-red-600"}`}>{formatPoin(r.poin)}</span>
                        <Badge variant={r.kategori?.jenis === "positif" ? "default" : "destructive"} className="text-[10px]">{r.kategori?.jenis === "positif" ? "Positif" : "Negatif"}</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between"><span className="font-semibold">Tanggal:</span><span>{format(new Date(r.createdAt), "d MMM yyyy HH:mm", { locale: id })}</span></div>
                        <div className="flex justify-between"><span className="font-semibold">Sikap:</span><span>{r.kategori?.nama || "-"}</span></div>
                        <div className="flex justify-between"><span className="font-semibold">Tindak Lanjut:</span><span>{r.tindakLanjut?.nama || "-"}</span></div>
                        <div className="flex justify-between"><span className="font-semibold">Penginput:</span><span>{r.guru?.namaLengkap || "-"}</span></div>
                        <div className="flex justify-between items-center"><span className="font-semibold">Status:</span><Badge variant={r.status === "selesai" ? "default" : "outline"} className="text-[10px]">{r.status === "belum_diproses" ? "Baru" : r.status === "sedang_diproses" ? "Diproses" : "Selesai"}</Badge></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedSiswa ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data rapor...</div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">Pilih siswa untuk melihat rapor karakter</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
