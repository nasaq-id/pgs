"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  issued: "default",
  partially_paid: "outline",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
}
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", issued: "Belum Dibayar", partially_paid: "Sebagian",
  paid: "Lunas", overdue: "Tertunggak", cancelled: "Dibatalkan",
}

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

export default function DetailTagihanSiswaPage() {
  const params = useParams()
  const router = useRouter()
  const siswaId = params.siswaId as string

  const [bayarOpen, setBayarOpen] = useState(false)
  const [bayarAmount, setBayarAmount] = useState("")
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const { data: siswa } = api.siswa.getAll.useQuery({})
  const { data: invoices, isLoading, refetch } = api.keuangan.billing.getByStudent.useQuery({ studentId: siswaId })
  const { data: billingTypes } = api.keuangan.settings.billingType.list.useQuery()
  const recordCashMutation = api.keuangan.payment.recordCash.useMutation()
  const cancelMutation = api.keuangan.billing.cancel.useMutation()

  const siswaData = siswa?.find((s: any) => s.id === siswaId)

  const handleBayar = async () => {
    if (!selectedInvoice || !bayarAmount) return
    setSaving(true)
    try {
      await recordCashMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        amount: Number(bayarAmount),
      })
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/keuangan/tagihan" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{siswaData?.namaLengkap || "Detail Tagihan"}</h2>
          <p className="text-muted-foreground">NISN: {siswaData?.nisn || "-"}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
      ) : !invoices || invoices.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Siswa ini belum memiliki tagihan.</p>
          <Link href="/keuangan/tagihan/generate">
            <Button variant="outline" className="mt-3">Generate Tagihan</Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Tagihan</TableHead>
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
              {invoices.map((inv) => {
                const total = Number(inv.totalAmount)
                const paid = Number(inv.paidAmount)
                const sisa = total - paid
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="text-xs">{BULAN[(inv.periodMonth || 1) - 1]} {inv.periodYear}</TableCell>
                    <TableCell className="text-right">{fmtRupiah(Number(inv.amount))}</TableCell>
                    <TableCell className="text-right text-xs">{fmtRupiah(Number(inv.discountAmount))}</TableCell>
                    <TableCell className="text-right text-xs">{fmtRupiah(Number(inv.lateFeeAmount))}</TableCell>
                    <TableCell className="text-right font-medium">{fmtRupiah(total)}</TableCell>
                    <TableCell className="text-right">{fmtRupiah(paid)}</TableCell>
                    <TableCell className="text-right font-bold">{fmtRupiah(sisa)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(inv.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[inv.status] || "secondary"} className="text-xs">
                        {STATUS_LABEL[inv.status] || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {inv.status !== "paid" && inv.status !== "cancelled" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setSelectedInvoice(inv); setBayarOpen(true) }}>
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedInvoice(inv); setCancelOpen(true) }}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

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
          <DialogFooter>
            <Button variant="outline" onClick={() => setBayarOpen(false)}>Batal</Button>
            <Button onClick={handleBayar} disabled={!bayarAmount || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={(v) => { if (!v) setCancelOpen(false); setSelectedInvoice(null); setCancelReason("") }}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelOpen(false); setSelectedInvoice(null); setCancelReason("") }}>Batal</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
