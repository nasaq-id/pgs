"use client"

import { useState, useMemo } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

const DISCOUNT_LABEL: Record<string, string> = {
  sibling: "Sibling",
  scholarship: "Beasiswa",
  yayasan: "Yayasan",
  other: "Lainnya",
}

const DISCOUNT_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sibling: "secondary",
  scholarship: "default",
  yayasan: "outline",
  other: "secondary",
}

export default function DiskonPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [siswaId, setSiswaId] = useState("")
  const [type, setType] = useState<string>("sibling")
  const [valueType, setValueType] = useState<string>("percent")
  const [value, setValue] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [note, setNote] = useState("")

  const { data: discounts, isLoading, refetch } = api.keuangan.discount.list.useQuery({})
  const { data: siswaList } = api.siswa.getLookup.useQuery({})
  const createMutation = api.keuangan.discount.create.useMutation()
  const approveMutation = api.keuangan.discount.approve.useMutation()
  const toggleMutation = api.keuangan.discount.toggle.useMutation()

  const siswaMap = useMemo(() => {
    const m = new Map<string, string>()
    siswaList?.forEach((s: any) => m.set(s.id, s.namaLengkap))
    return m
  }, [siswaList])

  const handleCreate = async () => {
    if (!siswaId || !value || !validFrom) { toast.error("Isi semua field wajib"); return }
    setSaving(true)
    try {
      await createMutation.mutateAsync({
        studentId: siswaId,
        type: type as any,
        valueType: valueType as any,
        value: Number(value),
        validFrom: new Date(validFrom),
        validUntil: validUntil ? new Date(validUntil) : null,
        note: note || null,
      })
      toast.success("Diskon berhasil diajukan")
      setFormOpen(false)
      setSiswaId(""); setValue(""); setValidFrom(""); setValidUntil(""); setNote("")
      refetch()
    } catch (err: any) {
      toast.error(err?.message || "Gagal")
    }
    setSaving(false)
  }

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync({ id })
      toast.success("Diskon disetujui")
      refetch()
    } catch (err: any) {
      toast.error(err?.message || "Gagal approve")
    }
  }

  const handleToggle = async (id: string) => {
    try {
      const res = await toggleMutation.mutateAsync({ id })
      toast.success(res.isActive ? "Diskon diaktifkan" : "Diskon dinonaktifkan")
      refetch()
    } catch (err: any) {
      toast.error(err?.message || "Gagal")
    }
  }

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Diskon & Beasiswa</h2>
          <p className="text-xs text-slate-450 font-bold mt-1">Kelola potongan biaya per siswa</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer transition-all duration-300 transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Ajukan Diskon</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Berlaku</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!discounts || discounts.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Belum ada diskon</TableCell>
                  </TableRow>
                ) : (
                  discounts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{siswaMap.get(d.studentId) || d.studentId}</TableCell>
                      <TableCell><Badge variant={DISCOUNT_COLOR[d.type]} className="text-xs">{DISCOUNT_LABEL[d.type]}</Badge></TableCell>
                      <TableCell>{d.valueType === "percent" ? `${d.value}%` : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(d.value))}</TableCell>
                      <TableCell className="text-xs">{fmtDate(d.validFrom)} {d.validUntil ? `- ${fmtDate(d.validUntil)}` : ""}</TableCell>
                      <TableCell>
                        {d.approvedBy ? (
                          <Badge variant="default" className="text-xs">Disetujui</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!d.approvedBy && (
                            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => handleApprove(d.id)}>
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleToggle(d.id)}>
                            {d.isActive ? <XCircle className="h-3 w-3 text-red-500" /> : <CheckCircle2 className="h-3 w-3 text-muted-foreground" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-2 p-4">
            {(!discounts || discounts.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Belum ada diskon</div>
            ) : (
              discounts.map((d) => (
                <div key={d.id} className="neumo-card bg-background rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{siswaMap.get(d.studentId) || d.studentId}</span>
                    <Badge variant={DISCOUNT_COLOR[d.type]} className="text-xs">{DISCOUNT_LABEL[d.type]}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between"><span className="font-semibold">Nilai:</span><span>{d.valueType === "percent" ? `${d.value}%` : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(d.value))}</span></div>
                    <div className="flex justify-between"><span className="font-semibold">Berlaku:</span><span>{fmtDate(d.validFrom)} {d.validUntil ? `- ${fmtDate(d.validUntil)}` : ""}</span></div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Status:</span>
                      {d.approvedBy ? <Badge variant="default" className="text-xs">Disetujui</Badge> : <Badge variant="secondary" className="text-xs">Pending</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                    {!d.approvedBy && (
                      <Button variant="ghost" size="sm" className="text-emerald-600 h-8" onClick={() => handleApprove(d.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => handleToggle(d.id)}>
                      {d.isActive ? <XCircle className="h-3 w-3 text-red-500 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {d.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Diskon / Beasiswa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Siswa</Label>
                <Select value={siswaId} onValueChange={(v) => v && setSiswaId(v)} options={siswaList?.map((s: any) => ({ value: s.id, label: s.namaLengkap }))}>
                <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                <SelectContent>
                  {siswaList?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.namaLengkap}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={type} onValueChange={(v) => v && setType(v)} options={[{value:"sibling", label:"Sibling"}, {value:"scholarship", label:"Beasiswa"}, {value:"yayasan", label:"Yayasan"}, {value:"other", label:"Lainnya"}]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="scholarship">Beasiswa</SelectItem>
                    <SelectItem value="yayasan">Yayasan</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipe Nilai</Label>
                <Select value={valueType} onValueChange={(v) => v && setValueType(v)} options={[{value:"percent", label:"Persen (%)"}, {value:"fixed", label:"Nominal (Rp)"}]}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persen (%)</SelectItem>
                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nilai</Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={valueType === "percent" ? "10" : "100000"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Berlaku Dari</Label>
                <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sampai (opsional)</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan pemberian diskon..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ajukan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
