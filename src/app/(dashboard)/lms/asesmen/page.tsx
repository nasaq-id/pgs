"use client"

import { useState, useMemo } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, ClipboardCheck, MoreVertical, Pencil, Trash2, Calendar, Clock, CheckCircle2, XCircle, BarChart3 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import AsesmenFormDialog from "@/components/asesmen/AsesmenFormDialog"
import AsesmenDetailDialog from "@/components/asesmen/AsesmenDetailDialog"

const KATEGORI_LABEL: Record<string, string> = {
  formatif_awal: "Formatif Awal",
  formatif_proses: "Formatif Proses",
  sumatif: "Sumatif",
}

const KATEGORI_COLORS: Record<string, string> = {
  formatif_awal: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400",
  formatif_proses: "bg-blue-500/10 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400",
  sumatif: "bg-purple-500/10 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400",
}

export default function AsesmenPage() {
  const [tab, setTab] = useState("asesmen")

  const [kelasFilter, setKelasFilter] = useState("all")
  const [mapelFilter, setMapelFilter] = useState("all")
  const [kategoriFilter, setKategoriFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const [rekapKelasId, setRekapKelasId] = useState("all")

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })

  const { data: asesmenList, isLoading } = api.asesmen.getAll.useQuery({
    kelasId: kelasFilter !== "all" ? kelasFilter : undefined,
    mapelId: mapelFilter !== "all" ? mapelFilter : undefined,
    kategori: kategoriFilter !== "all" ? (kategoriFilter as any) : undefined,
    status: statusFilter !== "all" ? (statusFilter as "aktif" | "ditutup") : undefined,
  })

  const { data: rekapData } = api.asesmen.getRekapKelas.useQuery(
    { kelasId: rekapKelasId },
    { enabled: rekapKelasId !== "all" },
  )

  const kelasMap = useMemo(() => new Map((kelasList ?? []).map((k) => [k.id, k])), [kelasList])
  const mapelMap = useMemo(() => new Map((mapelList ?? []).map((m) => [m.id, m])), [mapelList])

  const removeMutation = api.asesmen.remove.useMutation()
  const updateMutation = api.asesmen.update.useMutation()
  const utils = api.useUtils()

  const filtered = (asesmenList || []).filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (a.judul || "").toLowerCase().includes(q)
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await removeMutation.mutateAsync({ id: deleteId })
      toast.success("Asesmen berhasil dihapus")
      setDeleteId(null)
      utils.asesmen.getAll.invalidate()
    } catch {
      toast.error("Gagal menghapus asesmen")
    }
  }

  const handleStatusChange = async (item: any, status: "aktif" | "ditutup") => {
    try {
      await updateMutation.mutateAsync({ id: item.id, data: { status } })
      toast.success(`Status diubah menjadi "${status === "aktif" ? "Aktif" : "Ditutup"}"`)
      utils.asesmen.getAll.invalidate()
    } catch {
      toast.error("Gagal mengubah status")
    }
  }

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  const today = new Date().toISOString().split("T")[0]

  const selectedKelasLabel = useMemo(() => {
    if (kelasFilter === "all") return "Semua Kelas"
    const k = kelasMap.get(kelasFilter)
    return k ? `${k.tingkat ?? ""} - ${k.namaKelas}` : "Semua Kelas"
  }, [kelasFilter, kelasMap])

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Modul Asesmen Pembelajaran</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Asesmen Kurikulum Merdeka</h2>
          <p className="text-muted-foreground text-xs mt-1">Kelola asesmen formatif & sumatif</p>
        </div>
        <button
          className="gap-2 shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md shadow-teal-500/5 cursor-pointer transition-all flex items-center justify-center transform active:scale-95"
          onClick={() => { setEditItem(null); setFormOpen(true) }}
        >
          <Plus className="h-4 w-4" />
          <span>Buat Asesmen</span>
        </button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "asesmen")} className="space-y-5">
        <TabsList className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl overflow-x-auto w-full max-w-xs hide-scrollbar border border-slate-200/50 dark:border-slate-800/40">
          <TabsTrigger
            value="asesmen"
            className="flex-1 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> Asesmen
          </TabsTrigger>
          <TabsTrigger
            value="laporan"
            className="flex-1 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <BarChart3 className="h-4 w-4 mr-1.5" /> Laporan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="asesmen" className="space-y-5 mt-0">
          <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-4 md:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
              <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[180px] !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
                  <SelectValue placeholder="Semua Kelas">{selectedKelasLabel || "Semua Kelas"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.tingkat ?? ""} - {k.namaKelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mapelFilter} onValueChange={(v) => setMapelFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[180px] !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
                  <SelectValue placeholder="Semua Mapel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mapel</SelectItem>
                  {mapelList?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={kategoriFilter} onValueChange={(v) => setKategoriFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[160px] !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="formatif_awal">Formatif Awal</SelectItem>
                  <SelectItem value="formatif_proses">Formatif Proses</SelectItem>
                  <SelectItem value="sumatif">Sumatif</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[140px] !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="ditutup">Ditutup</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative sm:ml-auto w-full sm:w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari asesmen..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900/60 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition-all text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3.5">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/65 flex items-center justify-center mb-4 border border-border/20">
                <ClipboardCheck className="h-7 w-7 text-muted-foreground/75" />
              </div>
              <h3 className="text-lg font-bold mb-1.5 text-slate-700 dark:text-slate-300">Belum Ada Asesmen</h3>
              <p className="text-sm text-slate-400 max-w-sm">Buat asesmen baru untuk mulai menilai kompetensi siswa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((a) => {
                const deadlineStr = a.deadline ? new Date(a.deadline).toISOString().split("T")[0] : ""
                const isOverdue = a.status === "aktif" && deadlineStr && deadlineStr < today

                const cls = kelasMap.get(a.kelasId)
                const mapel = mapelMap.get(a.mataPelajaranId)
                const classLabel = cls ? `${cls.tingkat ?? ""} - ${cls.namaKelas}` : "-"
                const mapelLabel = mapel ? mapel.namaMapel : "-"

                return (
                  <div key={a.id} className="glass-card rounded-[22px] border border-slate-200/85 dark:border-slate-800/85 p-5 hover:shadow-xl hover:border-teal-300 dark:hover:border-teal-850 hover:bg-white dark:hover:bg-slate-900/50 transition-all duration-300 cursor-pointer flex flex-col justify-between bg-white dark:bg-slate-900/40 text-left shadow-[0_4px_20px_rgb(0,0,0,0.01)]" onClick={() => setDetailId(a.id)}>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${KATEGORI_COLORS[a.kategori] || "bg-slate-50 text-slate-600"}`}>
                          {KATEGORI_LABEL[a.kategori] || a.kategori}
                        </span>
                        {isOverdue ? (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                            Terlambat
                          </span>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            a.status === "aktif"
                              ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                              : "text-slate-500 bg-slate-50 border-slate-100"
                          }`}>
                            {a.status === "aktif" ? "Aktif" : "Ditutup"}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm leading-tight">{a.judul}</h4>
                        <p className="text-[11px] text-slate-450 dark:text-slate-500 font-semibold mt-1.5">
                          {classLabel} &middot; {mapelLabel}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 p-3 rounded-xl space-y-1 text-[10px] text-slate-550 dark:text-slate-400 font-bold">
                        <p>Target KKTP: <span className="text-teal-600 dark:text-teal-400 font-bold">{a.kktp}</span></p>
                        {a.deadline && (
                          <p className={`font-bold ${isOverdue ? "text-rose-600" : ""}`}>
                            Deadline: {fmtDate(a.deadline)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-9 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setDetailId(a.id) }}
                      >
                        Detail & Nilai
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer shadow-sm" onClick={(e) => e.stopPropagation()} />}>
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditItem(a); setFormOpen(true) }} className="gap-2">
                            <Pencil className="h-4 w-4 text-muted-foreground" /> Edit
                          </DropdownMenuItem>
                          {a.status === "aktif" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(a, "ditutup") }} className="gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" /> Tutup Asesmen
                            </DropdownMenuItem>
                          )}
                          {a.status === "ditutup" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(a, "aktif") }} className="gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" /> Aktifkan Kembali
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(a.id) }} className="text-destructive gap-2">
                            <Trash2 className="h-4 w-4" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="laporan" className="space-y-5 mt-0">
          <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-4 md:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
              <Select value={rekapKelasId} onValueChange={(v) => setRekapKelasId(v ?? "all")}>
                <SelectTrigger className="w-full sm:w-[220px] !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" disabled>Pilih Kelas</SelectItem>
                  {kelasList?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.tingkat ?? ""} - {k.namaKelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {rekapKelasId === "all" ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/65 flex items-center justify-center mb-4 border border-border/20">
                <BarChart3 className="h-7 w-7 text-muted-foreground/75" />
              </div>
              <h3 className="text-lg font-bold mb-1.5 text-slate-700 dark:text-slate-350">Pilih Kelas</h3>
              <p className="text-sm text-slate-400 max-w-sm">Pilih kelas untuk melihat rekap asesmen dan nilai siswa.</p>
            </div>
          ) : !rekapData || rekapData.asesmen.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-450 font-semibold shadow-sm">
              Belum ada asesmen untuk kelas ini.
            </div>
          ) : (
            <div className="space-y-5">
              {rekapData.asesmen.map((a) => {
                const kelasEntries = rekapData.entries.filter((e) => e.asesmenId === a.id)
                const totalSiswa = kelasEntries.length
                const tuntasCount = kelasEntries.filter((e) => e.statusKetuntasan === "tuntas").length
                const belumCount = kelasEntries.filter((e) => e.statusKetuntasan === "belum_tuntas").length
                const belumKerjaCount = kelasEntries.filter((e) => e.status === "belum_dikerjakan").length
                const rataNilai = totalSiswa > 0
                  ? Math.round(kelasEntries.reduce((sum, e) => sum + (e.nilai ?? 0), 0) / totalSiswa)
                  : 0

                return (
                  <div key={a.id} className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm text-left">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm leading-tight">{a.judul}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {KATEGORI_LABEL[a.kategori]} · KKTP {a.kktp}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Tuntas: {tuntasCount}
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-500">
                            <XCircle className="h-3.5 w-3.5" />
                            Belum: {belumCount}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-650 bg-slate-50 dark:bg-slate-900 dark:text-slate-350">
                            Rata-rata: {rataNilai}
                          </span>
                        </div>
                      </div>
                      {belumKerjaCount > 0 && (
                        <p className="text-[10px] text-amber-600 font-bold mt-1.5">{belumKerjaCount} siswa belum mengerjakan</p>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800">
                            <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Siswa</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Nilai</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Ketuntasan</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Feedback</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kelasEntries.map((entry) => (
                            <TableRow key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                              <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {(entry as any).siswa?.namaLengkap || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-bold ${
                                  entry.status === "sudah_dinilai" ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20" :
                                  entry.status === "sudah_mengumpulkan" ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20" :
                                  "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900"
                                }`}>
                                  {entry.status === "sudah_dinilai" ? "Dinilai" :
                                   entry.status === "sudah_mengumpulkan" ? "Dikumpulkan" : "Belum"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-black text-slate-800 dark:text-slate-200">
                                {entry.nilai !== null ? entry.nilai : "-"}
                              </TableCell>
                              <TableCell>
                                {entry.statusKetuntasan ? (
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                    entry.statusKetuntasan === "tuntas" ? "text-emerald-600" : "text-rose-600"
                                  }`}>
                                    {entry.statusKetuntasan === "tuntas" ? "Tuntas" : "Belum Tuntas"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate font-semibold text-slate-600 dark:text-slate-405">
                                {entry.feedback || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AsesmenFormDialog
        open={formOpen}
        item={editItem}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        onSaved={() => { setFormOpen(false); setEditItem(null) }}
      />

      <AsesmenDetailDialog
        open={!!detailId}
        asesmenId={detailId}
        onClose={() => setDetailId(null)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Asesmen?</AlertDialogTitle>
            <AlertDialogDescription>Asesmen yang dihapus tidak dapat dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer bg-rose-600 hover:bg-rose-700 text-white border-none">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
