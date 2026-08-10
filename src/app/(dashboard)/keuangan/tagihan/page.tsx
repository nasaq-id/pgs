"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import ResponsiveTable from "@/components/ui/responsive-table"
import FilterBar from "@/components/keuangan/FilterBar"
import { Plus, Eye, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react"
import { toast } from "sonner"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  issued: "Belum Dibayar",
  partially_paid: "Sebagian",
  paid: "Lunas",
  overdue: "Tertunggak",
  cancelled: "Dibatalkan",
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "paid") return "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
  if (status && status !== "cancelled") return "bg-red-50 text-red-600 border-red-200 hover:bg-red-50"
  return ""
}

function statusBadgeClassDetail(status: string | null | undefined) {
  if (status === "paid") return "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
  if (status === "cancelled") return "bg-muted text-muted-foreground border-border"
  return "bg-red-50 text-red-600 border-red-200 hover:bg-red-50"
}

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

export default function TagihanPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [kelasFilter, setKelasFilter] = useState("all")

  // Modal state
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null)

  // Bayar dialog state
  const [bayarOpen, setBayarOpen] = useState(false)
  const [bayarAmount, setBayarAmount] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Cancel dialog state
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  const { data: siswaList, isLoading: siswaLoading } = api.siswa.getLookup.useQuery({})
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 })
  const { data: invoices, isLoading: invLoading, refetch } = api.keuangan.billing.getAll.useQuery({ limit: 500 })

  const recordCashMutation = api.keuangan.payment.recordCash.useMutation()
  const cancelMutation = api.keuangan.billing.cancel.useMutation()

  // Filter invoices for the selected student
  const selectedInvoices = useMemo(() => {
    if (!selectedSiswa || !invoices) return []
    return invoices
      .filter((inv) => inv.studentId === selectedSiswa.id)
      .sort((a, b) => {
        const aDate = `${a.periodYear || 0}-${String(a.periodMonth || 0).padStart(2, "0")}`
        const bDate = `${b.periodYear || 0}-${String(b.periodMonth || 0).padStart(2, "0")}`
        return bDate.localeCompare(aDate)
      })
  }, [selectedSiswa, invoices])

  const siswaWithInvoice = useMemo(() => {
    if (!siswaList || !invoices) return []
    const invBySiswa = new Map<string, { total: number; paid: number; status: string; dueDate: string }>()
    for (const inv of invoices) {
      const existing = invBySiswa.get(inv.studentId)
      const total = Number(inv.totalAmount)
      const paid = Number(inv.paidAmount)
      if (existing) {
        existing.total += total
        existing.paid += paid
        if (inv.status === "overdue") existing.status = "overdue"
        else if (inv.status === "issued" && existing.status !== "overdue") existing.status = "issued"
        else if (inv.status === "partially_paid" && existing.status !== "overdue" && existing.status !== "issued") existing.status = "partially_paid"
      } else {
        invBySiswa.set(inv.studentId, { total, paid, status: inv.status, dueDate: inv.dueDate })
      }
    }

    return siswaList
      .map((s) => ({
        id: s.id,
        nama: s.namaLengkap,
        kelasId: s.kelasId || "",
        nisn: s.nisn,
        tagihan: invBySiswa.get(s.id) || null,
      }))
      .filter((s) => {
        if (statusFilter === "all") return true
        if (statusFilter === "lunas") return s.tagihan?.status === "paid"
        if (statusFilter === "menunggak") return s.tagihan && s.tagihan.status !== "paid" && s.tagihan.status !== "cancelled"
        if (statusFilter === "belum") return !s.tagihan
        return true
      })
      .filter((s) => {
        if (kelasFilter === "all") return true
        return s.kelasId === kelasFilter
      })
      .filter((s) => {
        if (!search) return true
        const q = search.toLowerCase()
        return s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const aUnpaid = a.tagihan ? a.tagihan.total - a.tagihan.paid : 0
        const bUnpaid = b.tagihan ? b.tagihan.total - b.tagihan.paid : 0
        return bUnpaid - aUnpaid
      })
  }, [siswaList, invoices, statusFilter, kelasFilter, search])

  const kelasOptions = useMemo(() => [
    { value: "all", label: "Semua Kelas" },
    ...(kelasList || []).map((k: any) => ({ value: k.id, label: `${k.tingkat || ""} ${k.namaKelas}` })),
  ], [kelasList])

  const isLoading = siswaLoading || invLoading

  function openDetail(s: any) {
    setSelectedSiswa(s)
    setDetailOpen(true)
  }

  function openBayar(inv: any) {
    setSelectedInvoice(inv)
    setBayarOpen(true)
  }

  const handleBayar = async () => {
    if (!selectedInvoice || !bayarAmount) return
    setSaving(true)
    try {
      await recordCashMutation.mutateAsync({ invoiceId: selectedInvoice.id, amount: Number(bayarAmount) })
      toast.success("Pembayaran berhasil dicatat")
      setBayarOpen(false)
      setSelectedInvoice(null)
      setBayarAmount("")
      refetch()
    } catch (err: any) { toast.error(err?.message || "Gagal") }
    setSaving(false)
  }

  const handleCancel = async () => {
    if (!selectedInvoice || !cancelReason.trim()) return
    setSaving(true)
    try {
      await cancelMutation.mutateAsync({ id: selectedInvoice.id, reason: cancelReason })
      toast.success("Tagihan dibatalkan")
      setCancelOpen(false)
      setSelectedInvoice(null)
      setCancelReason("")
      refetch()
    } catch (err: any) { toast.error(err?.message || "Gagal") }
    setSaving(false)
  }

  const detailTotalTagihan = selectedInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
  const detailTerbayar = selectedInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0)
  const detailSisa = detailTotalTagihan - detailTerbayar

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3 text-left">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Tagihan</h2>
          <p className="text-xs text-slate-450 font-bold mt-1">Daftar tagihan semua siswa</p>
        </div>
        <Link href="/keuangan/tagihan/generate">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer transition-all duration-300 transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Tagihan</span>
          </button>
        </Link>
      </div>

      <Card className="p-3">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari siswa..."
          filters={[
            { key: "status", label: "Status", options: [
              { value: "all", label: "Semua Status" },
              { value: "lunas", label: "Lunas" },
              { value: "menunggak", label: "Menunggak" },
              { value: "belum", label: "Belum Ada Tagihan" },
            ], value: statusFilter, onChange: setStatusFilter },
            { key: "kelas", label: "Kelas", options: kelasOptions, value: kelasFilter, onChange: setKelasFilter },
          ]}
        />
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <ResponsiveTable
            columns={[
              { header: "Nama Siswa", mobileLabel: "Siswa", accessor: (s: any) => <span className="font-medium">{s.nama}</span> },
              { header: "NISN", mobileLabel: "NISN", accessor: (s: any) => <span className="text-xs text-muted-foreground">{s.nisn}</span> },
              { header: "Kelas", accessor: (s: any) => <span className="text-xs">{kelasList?.find((k: any) => k.id === s.kelasId)?.namaKelas || "-"}</span>, hideOnMobile: true },
              { header: "Total Tagihan", mobileLabel: "Total", accessor: (s: any) => <span className="text-right block">{s.tagihan ? fmtRupiah(s.tagihan.total) : "-"}</span>, headerClassName: "text-right", className: "text-right" },
              { header: "Terbayar", accessor: (s: any) => <span className="text-right block">{s.tagihan ? fmtRupiah(s.tagihan.paid) : "-"}</span>, headerClassName: "text-right", className: "text-right", hideOnMobile: true },
              { header: "Sisa", mobileLabel: "Sisa", accessor: (s: any) => { const sisa = s.tagihan ? s.tagihan.total - s.tagihan.paid : 0; return <span className={`text-right block font-medium ${sisa > 0 ? "text-red-600" : ""}`}>{s.tagihan ? fmtRupiah(sisa) : "-"}</span> }, headerClassName: "text-right", className: "text-right" },
              { header: "Status", mobileLabel: "Status", accessor: (s: any) => s.tagihan ? <Badge variant="outline" className={`text-xs ${statusBadgeClass(s.tagihan.status)}`}>{STATUS_LABEL[s.tagihan.status] || s.tagihan.status}</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">Belum Ada</Badge> },
              { header: "Aksi", accessor: (s: any) => <div className="text-center"><Button variant="ghost" size="sm" className="gap-1 text-xs text-primary" onClick={() => openDetail(s)}><Eye className="h-3 w-3" /> Detail</Button></div>, headerClassName: "text-center", className: "text-center" },
            ]}
            data={siswaWithInvoice}
            keyExtractor={(s: any) => s.id}
            emptyMessage="Tidak ada data siswa"
            mobileCardTitle={(s: any) => {
              const sisa = s.tagihan ? s.tagihan.total - s.tagihan.paid : 0
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{s.nama}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{s.nisn}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{s.tagihan ? fmtRupiah(sisa) : "-"}</p>
                    {s.tagihan ? <Badge variant="outline" className={`text-[9px] mt-0.5 ${statusBadgeClass(s.tagihan.status)}`}>{STATUS_LABEL[s.tagihan.status] || s.tagihan.status}</Badge> : <Badge variant="outline" className="text-[9px] mt-0.5 text-muted-foreground">Belum Ada</Badge>}
                  </div>
                </div>
              )
            }}
            mobileCardActions={(s: any) => (
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary w-full" onClick={() => openDetail(s)}>
                <Eye className="h-3 w-3" /> Lihat Detail Tagihan
              </Button>
            )}
          />
        </Card>
      )}

      {/* ── Detail Modal ── */}
      <Dialog open={detailOpen} onOpenChange={(v) => { if (!v) { setDetailOpen(false); setSelectedSiswa(null) } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">{selectedSiswa?.nama || ""}</DialogTitle>
                  <DialogDescription>NISN: {selectedSiswa?.nisn || "-"}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4 mt-4 mb-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Total Tagihan</p>
                <p className="text-lg font-bold">{fmtRupiah(detailTotalTagihan)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs text-emerald-600">Terbayar</p>
                <p className="text-lg font-bold text-emerald-600">{fmtRupiah(detailTerbayar)}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-xs text-red-600">Sisa</p>
                <p className={`text-lg font-bold ${detailSisa > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {fmtRupiah(detailSisa)}
                </p>
              </div>
            </div>
            <Separator />
          </div>

          <div className="overflow-y-auto max-h-[55vh] p-6 pt-4">
            {selectedInvoices.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Siswa ini belum memiliki tagihan</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead className="text-right">Pokok</TableHead>
                        <TableHead className="text-right">Diskon</TableHead>
                        <TableHead className="text-right">Denda</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Terbayar</TableHead>
                        <TableHead className="text-right">Sisa</TableHead>
                        <TableHead>Jatuh Tempo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoices.map((inv) => {
                        const total = Number(inv.totalAmount)
                        const paid = Number(inv.paidAmount)
                        const sisa = total - paid
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="text-xs font-medium">
                              {BULAN[(inv.periodMonth || 1) - 1]} {inv.periodYear}
                            </TableCell>
                            <TableCell className="text-right">{fmtRupiah(Number(inv.amount))}</TableCell>
                            <TableCell className="text-right text-xs">{fmtRupiah(Number(inv.discountAmount))}</TableCell>
                            <TableCell className="text-right text-xs">{fmtRupiah(Number(inv.lateFeeAmount))}</TableCell>
                            <TableCell className="text-right font-medium">{fmtRupiah(total)}</TableCell>
                            <TableCell className="text-right">{fmtRupiah(paid)}</TableCell>
                            <TableCell className={`text-right font-bold ${sisa > 0 ? "text-red-600" : ""}`}>
                              {fmtRupiah(sisa)}
                            </TableCell>
                            <TableCell className="text-xs">{fmtDate(inv.dueDate)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs whitespace-nowrap ${statusBadgeClassDetail(inv.status)}`}>
                                {STATUS_LABEL[inv.status] || inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                {inv.status !== "paid" && inv.status !== "cancelled" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      onClick={() => openBayar(inv)}
                                      title="Catat Pembayaran"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => { setSelectedInvoice(inv); setCancelOpen(true) }}
                                      title="Batalkan Tagihan"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {inv.status === "paid" && (
                                  <span className="text-xs text-emerald-600 font-medium">Lunas</span>
                                )}
                                {inv.status === "cancelled" && (
                                  <span className="text-xs text-muted-foreground">Batal</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile cards for detail */}
                <div className="md:hidden space-y-2">
                  {selectedInvoices.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">Belum ada tagihan</div>
                  ) : (
                    selectedInvoices.map((inv) => {
                      const total = Number(inv.totalAmount)
                      const paid = Number(inv.paidAmount)
                      const sisa = total - paid
                      return (
                        <div key={inv.id} className="neumo-card bg-background rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                              {BULAN[(inv.periodMonth || 1) - 1]} {inv.periodYear}
                            </span>
                            <Badge variant="outline" className={`text-[9px] whitespace-nowrap ${statusBadgeClassDetail(inv.status)}`}>
                              {STATUS_LABEL[inv.status] || inv.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div><span className="text-slate-400">Pokok</span><p className="font-bold">{fmtRupiah(Number(inv.amount))}</p></div>
                            <div className="text-right"><span className="text-slate-400">Total</span><p className="font-bold">{fmtRupiah(total)}</p></div>
                            <div><span className="text-slate-400">Diskon</span><p className="font-semibold">{fmtRupiah(Number(inv.discountAmount))}</p></div>
                            <div className="text-right"><span className="text-slate-400">Terbayar</span><p className="font-semibold">{fmtRupiah(paid)}</p></div>
                            {(Number(inv.lateFeeAmount) || 0) > 0 && <div><span className="text-slate-400">Denda</span><p className="font-semibold text-rose-600">{fmtRupiah(Number(inv.lateFeeAmount))}</p></div>}
                            <div className={`text-right ${sisa > 0 ? "" : ""}`}><span className="text-slate-400">Sisa</span><p className={`font-bold ${sisa > 0 ? "text-red-600" : ""}`}>{fmtRupiah(sisa)}</p></div>
                            <div className="col-span-2"><span className="text-slate-400">Jatuh Tempo</span><p className="font-semibold">{fmtDate(inv.dueDate)}</p></div>
                          </div>
                          {inv.status !== "paid" && inv.status !== "cancelled" && (
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => openBayar(inv)}>
                                <CheckCircle2 className="h-3 w-3" /> Bayar
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { setSelectedInvoice(inv); setCancelOpen(true) }}>
                                <XCircle className="h-3 w-3" /> Batal
                              </Button>
                            </div>
                          )}
                          {inv.status === "paid" && (
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 text-center">
                              <span className="text-xs text-emerald-600 font-bold">Lunas</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bayar Dialog ── */}
      <Dialog open={bayarOpen} onOpenChange={(v) => { if (!v) setBayarOpen(false); setSelectedInvoice(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {selectedInvoice && (
              <p className="text-sm text-muted-foreground">
                Tagihan: {BULAN[(selectedInvoice.periodMonth || 1) - 1]} {selectedInvoice.periodYear} — {fmtRupiah(Number(selectedInvoice.totalAmount))}
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Jumlah Bayar</Label>
              <Input type="number" value={bayarAmount} onChange={(e) => setBayarAmount(e.target.value)} placeholder="Masukkan nominal" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setBayarOpen(false)}>Batal</Button>
            <Button onClick={handleBayar} disabled={!bayarAmount || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={(v) => { if (!v) { setCancelOpen(false); setSelectedInvoice(null); setCancelReason("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Batalkan Tagihan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {selectedInvoice && (
              <p className="text-sm text-muted-foreground">
                Membatalkan tagihan {BULAN[(selectedInvoice.periodMonth || 1) - 1]} {selectedInvoice.periodYear}
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Alasan <span className="text-destructive">*</span></Label>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Wajib diisi" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setCancelOpen(false); setSelectedInvoice(null); setCancelReason("") }}>Batal</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Batalkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
