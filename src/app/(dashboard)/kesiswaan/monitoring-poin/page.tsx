"use client"

import { useState } from "react"
import { Search, Loader2, Send, CheckCircle, Clock, AlertTriangle, Users, AlertOctagon } from "lucide-react"
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

const statusLabels: Record<string, string> = {
  belum_diproses: "Baru",
  sedang_diproses: "Diproses",
  selesai: "Selesai",
}

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  belum_diproses: "outline",
  sedang_diproses: "secondary",
  selesai: "default",
}

function formatPoin(val: number) {
  return val > 0 ? `+${val}` : `${val}`
}

function AllEntriesTab({
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  updateStatus,
  kirimNotif,
}: {
  search: string
  setSearch: (v: string) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  updateStatus: any
  kirimNotif: any
}) {
  const { data: list, isLoading } = api.poin.getMonitoring.useQuery({
    search: search || undefined,
    status: (filterStatus as any) || undefined,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari siswa..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "")}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Semua Status</SelectItem>
              <SelectItem value="belum_diproses">Baru</SelectItem>
              <SelectItem value="sedang_diproses">Diproses</SelectItem>
              <SelectItem value="selesai">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : !list?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data monitoring</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
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
                  <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r: any) => (
                  <TableRow key={r.id} className={r.status === "belum_diproses" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(r.createdAt), "d MMM HH:mm", { locale: id })}
                    </TableCell>
                    <TableCell className="font-medium">{r.siswa?.namaLengkap || "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.kategori?.nama || "-"}</TableCell>
                    <TableCell className={`font-bold ${r.poin > 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatPoin(r.poin)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{r.tindakLanjut?.nama || "-"}</TableCell>
                    <TableCell className="text-xs">{r.guru?.namaLengkap || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[r.status] || "outline"} className="text-[10px] whitespace-nowrap">
                        {statusLabels[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {r.status === "belum_diproses" && (
                          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => updateStatus.mutate({ id: r.id, status: "sedang_diproses" })} disabled={updateStatus.isPending}>
                            <Clock className="h-3 w-3 mr-1" /> Proses
                          </Button>
                        )}
                        {r.status !== "selesai" && (
                          <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => updateStatus.mutate({ id: r.id, status: "selesai" })} disabled={updateStatus.isPending}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                          </Button>
                        )}
                        <Button size="sm" className="h-7 text-[11px]" style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => kirimNotif.mutate({ siswaId: r.siswaId })} disabled={kirimNotif.isPending}>
                          {kirimNotif.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Kirim
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {list.map((r: any) => (
              <div key={r.id} className={`neumo-card bg-background rounded-2xl p-4 space-y-2.5 ${r.status === "belum_diproses" ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{r.siswa?.namaLengkap || "-"}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{format(new Date(r.createdAt), "d MMM HH:mm", { locale: id })}</p>
                  </div>
                  <Badge variant={statusVariants[r.status] || "outline"} className="text-[9px]">{statusLabels[r.status] || r.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div><span className="text-slate-400 font-semibold">Sikap:</span><span className="font-bold ml-1">{r.kategori?.nama || "-"}</span></div>
                  <div className="text-right"><span className="text-slate-400 font-semibold">Poin:</span><span className={`font-bold ml-1 ${r.poin > 0 ? "text-green-600" : "text-red-600"}`}>{formatPoin(r.poin)}</span></div>
                  <div className="col-span-2"><span className="text-slate-400 font-semibold">Tindak Lanjut:</span><span className="font-medium ml-1">{r.tindakLanjut?.nama || "-"}</span></div>
                  <div className="col-span-2"><span className="text-slate-400 font-semibold">Penginput:</span><span className="font-medium ml-1">{r.guru?.namaLengkap || "-"}</span></div>
                </div>
                <div className="flex gap-1.5 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  {r.status === "belum_diproses" && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1" onClick={() => updateStatus.mutate({ id: r.id, status: "sedang_diproses" })} disabled={updateStatus.isPending}>
                      <Clock className="h-3 w-3 mr-1" /> Proses
                    </Button>
                  )}
                  {r.status !== "selesai" && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1" onClick={() => updateStatus.mutate({ id: r.id, status: "selesai" })} disabled={updateStatus.isPending}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                    </Button>
                  )}
                  <Button size="sm" className="h-7 text-[10px] flex-1" style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => kirimNotif.mutate({ siswaId: r.siswaId })} disabled={kirimNotif.isPending}>
                    {kirimNotif.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                    Kirim
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ThresholdTab({ kirimNotif }: { kirimNotif: any }) {
  const { data: thresholdData, isLoading } = api.poin.getMonitoringThreshold.useQuery()

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
  }

  if (!thresholdData?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertOctagon className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Belum ada siswa yang mencapai ambang batas aturan</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Atur rentang poin di menu Pengaturan → Poin → Aturan Akumulasi</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {thresholdData.map((group: any, gi: number) => (
        <div key={gi} className="rounded-xl border border-border overflow-hidden">
          <div className={`px-4 py-3 flex items-center gap-3 ${
            group.aturan.poinMin < 0
              ? "bg-red-50/80 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800/30"
              : "bg-green-50/80 dark:bg-green-950/20 border-b border-green-200 dark:border-green-800/30"
          }`}>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              group.aturan.poinMin < 0
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-green-100 dark:bg-green-900/30"
            }`}>
              {group.aturan.poinMin < 0
                ? <AlertTriangle className={`h-5 w-5 ${group.aturan.poinMin < 0 ? "text-red-600" : "text-green-600"}`} />
                : <Users className="h-5 w-5 text-green-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">
                  Rentang: {group.aturan.poinMin} s/d {group.aturan.poinMax}
                </span>
                <Badge variant="secondary" className="text-[10px]">{group.aturan.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{group.aturan.tindakLanjut}</p>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {group.students.length} siswa
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-[10px] font-black text-slate-400 uppercase tracking-wider">#</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Siswa</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">NISN</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Poin</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.students.map((st: any, si: number) => (
                    <TableRow key={st.siswaId}>
                      <TableCell className="text-xs text-muted-foreground">{si + 1}</TableCell>
                      <TableCell className="font-medium">{st.namaLengkap}</TableCell>
                      <TableCell className="text-xs">{st.nisn || "-"}</TableCell>
                      <TableCell className={`font-bold ${st.totalPoin > 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatPoin(st.totalPoin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="h-7 text-[11px]" style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => kirimNotif.mutate({ siswaId: st.siswaId })} disabled={kirimNotif.isPending}>
                          {kirimNotif.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Kirim
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile cards for threshold students */}
            <div className="md:hidden space-y-2">
              {group.students.map((st: any, si: number) => (
                <div key={st.siswaId} className="neumo-card bg-background rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs text-slate-400 font-bold shrink-0">#{si + 1}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{st.namaLengkap}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{st.nisn || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-black ${st.totalPoin > 0 ? "text-green-600" : "text-red-600"}`}>{formatPoin(st.totalPoin)}</span>
                    <Button size="sm" className="h-8 text-[10px]" style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => kirimNotif.mutate({ siswaId: st.siswaId })} disabled={kirimNotif.isPending}>
                      {kirimNotif.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                      Kirim
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MonitoringPoinPage() {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [activeTab, setActiveTab] = useState("semua")
  const utils = api.useUtils()

  const updateStatus = api.poin.updateStatusMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Status diperbarui")
      utils.poin.getMonitoring.invalidate()
      utils.poin.getAllSikap.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const kirimNotif = api.poin.kirimPemberitahuan.useMutation({
    onSuccess: (res: any) => {
      if (res.aturan) {
        toast.success(`Pemberitahuan terkirim. ${res.aturan.tindakLanjut}`)
      } else {
        toast.success("Pemberitahuan terkirim (tanpa aturan akumulasi)")
      }
      utils.poin.getMonitoring.invalidate()
      utils.poin.getMonitoringThreshold.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Monitoring Poin</h2>
        <p className="text-muted-foreground">Pantau dan tindak lanjuti catatan poin siswa</p>
      </div>

      <div className="neumo-card bg-background rounded-3xl p-5">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "semua") utils.poin.getMonitoring.invalidate() }}>
          <TabsList className="mb-5 rounded-xl">
            <TabsTrigger value="semua" className="rounded-lg text-xs">Semua Entri</TabsTrigger>
            <TabsTrigger value="ambang" className="rounded-lg text-xs">Ambang Batas</TabsTrigger>
          </TabsList>

          <TabsContent value="semua">
            <AllEntriesTab
              search={search}
              setSearch={setSearch}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              updateStatus={updateStatus}
              kirimNotif={kirimNotif}
            />
          </TabsContent>

          <TabsContent value="ambang">
            <ThresholdTab kirimNotif={kirimNotif} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
