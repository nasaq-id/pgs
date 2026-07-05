"use client"

import { useState } from "react"
import { Search, Loader2, Send, CheckCircle, Clock, AlertTriangle } from "lucide-react"
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

export default function MonitoringPoinPage() {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const utils = api.useUtils()

  const { data: list, isLoading } = api.poin.getMonitoring.useQuery({
    search: search || undefined,
    status: (filterStatus as any) || undefined,
  })

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
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Monitoring Poin</h2>
        <p className="text-sm text-muted-foreground">Pantau dan tindak lanjuti catatan poin siswa</p>
      </div>

      <Card className="p-5 rounded-3xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
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
          <div className="text-center py-16 text-muted-foreground">Belum ada data monitoring</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Sikap</TableHead>
                  <TableHead>Poin</TableHead>
                  <TableHead>Tindak Lanjut</TableHead>
                  <TableHead>Penginput</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
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
                      <div className="flex items-center justify-end gap-1">
                        {r.status === "belum_diproses" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => updateStatus.mutate({ id: r.id, status: "sedang_diproses" })}
                            disabled={updateStatus.isPending}
                          >
                            <Clock className="h-3 w-3 mr-1" /> Proses
                          </Button>
                        )}
                        {r.status !== "selesai" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => updateStatus.mutate({ id: r.id, status: "selesai" })}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-7 text-[11px]"
                          style={{ backgroundColor: "hsl(142 72% 40%)" }}
                          onClick={() => kirimNotif.mutate({ siswaId: r.siswaId })}
                          disabled={kirimNotif.isPending}
                        >
                          {kirimNotif.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 mr-1" />
                          )}
                          Kirim
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
