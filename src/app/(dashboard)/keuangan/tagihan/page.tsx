"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DollarSign, Plus, Search, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  lunas: "default",
  tertunggak: "destructive",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  lunas: "Lunas",
  tertunggak: "Tertunggak",
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export default function TagihanPage() {
  const [siswaId, setSiswaId] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [bayarOpen, setBayarOpen] = useState(false)
  const [selectedTagihan, setSelectedTagihan] = useState<any>(null)
  const [newBulan, setNewBulan] = useState("")
  const [newTahun, setNewTahun] = useState("")
  const [newJumlah, setNewJumlah] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: siswaList } = api.siswa.getAll.useQuery({})
  const { data: tagihanList, isLoading, refetch } = api.keuangan.getBySiswa.useQuery(
    { siswaId },
    { enabled: !!siswaId },
  )

  const createTagihan = api.keuangan.create.useMutation()
  const updateTagihan = api.keuangan.update.useMutation()

  const filtered = (tagihanList || []).filter((t) => {
    if (statusFilter !== "all" && t.statusPembayaran !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (t.noTagihan || "").toLowerCase().includes(q)
    }
    return true
  })

  const handleCreateTagihan = async () => {
    if (!siswaId || !newBulan || !newTahun || !newJumlah) {
      toast.error("Semua field wajib diisi")
      return
    }
    setSaving(true)
    try {
      await createTagihan.mutateAsync({
        siswaId,
        bulan: parseInt(newBulan),
        tahun: parseInt(newTahun),
        jumlah: parseInt(newJumlah),
      })
      toast.success("Tagihan berhasil dibuat")
      setFormOpen(false)
      setNewBulan("")
      setNewTahun("")
      setNewJumlah("")
      refetch()
    } catch {
      toast.error("Gagal membuat tagihan")
    }
    setSaving(false)
  }

  const handleMarkPaid = async () => {
    if (!selectedTagihan) return
    setSaving(true)
    try {
      await updateTagihan.mutateAsync({
        id: selectedTagihan.id,
        data: {
          statusPembayaran: "lunas",
          tanggalBayar: new Date(),
        },
      })
      toast.success("Pembayaran berhasil dicatat")
      setBayarOpen(false)
      setSelectedTagihan(null)
      refetch()
    } catch {
      toast.error("Gagal mencatat pembayaran")
    }
    setSaving(false)
  }

  const fmtRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
  }

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  const selectedSiswa = siswaList?.find((s) => s.id === siswaId)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tagihan SPP</h2>
          <p className="text-muted-foreground">Kelola tagihan dan pembayaran SPP siswa</p>
        </div>
        {siswaId && (
          <Button className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Tambah Tagihan
          </Button>
        )}
      </div>

      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
          <Select value={siswaId} onValueChange={(v) => setSiswaId(v ?? "")}>
            <SelectTrigger className="w-[250px] h-9">
              <SelectValue placeholder="Pilih Siswa" />
            </SelectTrigger>
            <SelectContent>
              {siswaList?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.namaLengkap} ({s.nisn})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="lunas">Lunas</SelectItem>
              <SelectItem value="tertunggak">Tertunggak</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari no. tagihan..." className="pl-9 h-9 w-[200px]" />
          </div>
        </div>
      </Card>

      {!siswaId ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Pilih Siswa</h3>
            <p className="text-sm text-muted-foreground">Pilih siswa untuk melihat tagihan SPP.</p>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Tidak Ada Tagihan</h3>
            <p className="text-sm text-muted-foreground">
              {selectedSiswa?.namaLengkap} belum memiliki tagihan. Tambahkan tagihan baru.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Tagihan</TableHead>
                <TableHead>Bulan</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tgl. Bayar</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.noTagihan || "-"}</TableCell>
                  <TableCell>{BULAN[t.bulan - 1]}</TableCell>
                  <TableCell>{t.tahun}</TableCell>
                  <TableCell className="text-right font-medium">{fmtRupiah(t.jumlah)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[t.statusPembayaran] || "secondary"} className="text-xs">
                      {STATUS_LABEL[t.statusPembayaran] || t.statusPembayaran}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(t.tanggalBayar)}</TableCell>
                  <TableCell className="text-center">
                    {t.statusPembayaran !== "lunas" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedTagihan(t); setBayarOpen(true) }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Bayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) setFormOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Tagihan Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Bulan</Label>
                <Select value={newBulan} onValueChange={(v) => setNewBulan(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Bulan" /></SelectTrigger>
                  <SelectContent>
                    {BULAN.map((nama, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Tahun</Label>
                <Input type="number" value={newTahun} onChange={(e) => setNewTahun(e.target.value)} placeholder="2025" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Jumlah (Rp)</Label>
              <Input type="number" value={newJumlah} onChange={(e) => setNewJumlah(e.target.value)} placeholder="500000" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button>
              <Button onClick={handleCreateTagihan} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bayarOpen} onOpenChange={(v) => { if (!v) { setBayarOpen(false); setSelectedTagihan(null) }}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedTagihan && (
              <>
                <p className="text-sm text-muted-foreground">
                  Apakah Anda yakin ingin menandai tagihan berikut sebagai <strong>Lunas</strong>?
                </p>
                <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">No. Tagihan:</span> <strong>{selectedTagihan.noTagihan || "-"}</strong></p>
                  <p><span className="text-muted-foreground">Periode:</span> <strong>{BULAN[selectedTagihan.bulan - 1]} {selectedTagihan.tahun}</strong></p>
                  <p><span className="text-muted-foreground">Jumlah:</span> <strong>{fmtRupiah(selectedTagihan.jumlah)}</strong></p>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setBayarOpen(false); setSelectedTagihan(null) }} disabled={saving}>Batal</Button>
              <Button onClick={handleMarkPaid} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <CheckCircle2 className="h-4 w-4 mr-2" /> Tandai Lunas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
