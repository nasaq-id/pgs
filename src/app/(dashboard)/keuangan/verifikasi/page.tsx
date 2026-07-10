"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, CheckCircle2, XCircle, Eye, Clock } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

export default function VerifikasiPage() {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [processing, setProcessing] = useState(false)

  const { data: pending, isLoading, refetch } = api.keuangan.payment.listPending.useQuery({})
  const verifyMutation = api.keuangan.payment.verify.useMutation()
  const rejectMutation = api.keuangan.payment.reject.useMutation()

  const handleVerify = async (id: string) => {
    setProcessing(true)
    try {
      await verifyMutation.mutateAsync({ id })
      toast.success("Pembayaran diverifikasi")
      refetch()
    } catch (err: any) {
      toast.error(err?.message || "Gagal verifikasi")
    }
    setProcessing(false)
  }

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason.trim()) return
    setProcessing(true)
    try {
      await rejectMutation.mutateAsync({ id: selectedPayment.id, reason: rejectReason })
      toast.success("Pembayaran ditolak")
      setRejectOpen(false)
      setSelectedPayment(null)
      setRejectReason("")
      refetch()
    } catch (err: any) {
      toast.error(err?.message || "Gagal menolak")
    }
    setProcessing(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Verifikasi Pembayaran</h2>
        <p className="text-muted-foreground">Antrian pembayaran yang menunggu verifikasi</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : !pending || pending.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Tidak Ada Antrian</h3>
          <p className="text-sm text-muted-foreground">Semua pembayaran sudah diverifikasi.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{fmtDate(p.paidAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">{p.method?.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtRupiah(Number(p.amount))}</TableCell>
                  <TableCell>
                    {p.paymentProofUrl ? (
                      <a href={p.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Eye className="h-3 w-3" /> Lihat
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200" onClick={() => handleVerify(p.id)} disabled={processing}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => { setSelectedPayment(p); setRejectOpen(true) }} disabled={processing}>
                        <XCircle className="h-3 w-3 mr-1" /> Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={rejectOpen} onOpenChange={(v) => { if (!v) { setRejectOpen(false); setSelectedPayment(null); setRejectReason("") }}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alasan Penolakan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedPayment && (
              <p className="text-sm text-muted-foreground">
                Menolak pembayaran <strong>{fmtRupiah(Number(selectedPayment.amount))}</strong>
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Alasan <span className="text-destructive">*</span></Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setSelectedPayment(null); setRejectReason("") }}>Batal</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Tolak Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
