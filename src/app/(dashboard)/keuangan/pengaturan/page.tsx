"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Plus, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function BillingTypeTab() {
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("recurring")
  const [saving, setSaving] = useState(false)

  const { data, isLoading, refetch } = api.keuangan.settings.billingType.list.useQuery()
  const createMutation = api.keuangan.settings.billingType.create.useMutation()
  const toggleMutation = api.keuangan.settings.billingType.toggle.useMutation()

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createMutation.mutateAsync({ name, category: category as any })
      toast.success("Jenis tagihan dibuat")
      setFormOpen(false)
      setName(""); setCategory("recurring")
      refetch()
    } catch (err: any) { toast.error(err?.message || "Gagal") }
    setSaving(false)
  }

  const handleToggle = async (id: string) => {
    try {
      await toggleMutation.mutateAsync({ id })
      refetch()
    } catch (err: any) { toast.error(err?.message || "Gagal") }
  }

  if (isLoading) return <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>

  return (
    <div className="space-y-4 text-left">
      <div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer transition-all duration-300 transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah</span>
        </button>
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((bt: any) => (
              <TableRow key={bt.id}>
                <TableCell className="font-medium">{bt.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs uppercase">{bt.category}</Badge></TableCell>
                <TableCell><Badge variant={bt.isActive ? "default" : "secondary"} className="text-xs">{bt.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(bt.id)}>
                    {bt.isActive ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-emerald-500" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden space-y-2">
        {data?.map((bt: any) => (
          <div key={bt.id} className="neumo-card bg-background rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{bt.name}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs uppercase">{bt.category}</Badge>
                <Badge variant={bt.isActive ? "default" : "secondary"} className="text-xs">{bt.isActive ? "Aktif" : "Nonaktif"}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleToggle(bt.id)}>
              {bt.isActive ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-emerald-500" />}
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Jenis Tagihan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: SPP, Uang Gedung" />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)} options={[{value:"recurring", label:"Bulanan (Recurring)"}, {value:"one_time", label:"Sekali (One Time)"}]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Bulanan (Recurring)</SelectItem>
                  <SelectItem value="one_time">Sekali (One Time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FeeStructureTab() {
  const [formOpen, setFormOpen] = useState(false)
  const [billingTypeId, setBillingTypeId] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [amount, setAmount] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [saving, setSaving] = useState(false)

  const { data, isLoading, refetch } = api.keuangan.settings.feeStructure.list.useQuery()
  const { data: billingTypes } = api.keuangan.settings.billingType.list.useQuery()
  const createMutation = api.keuangan.settings.feeStructure.create.useMutation()

  const handleCreate = async () => {
    if (!billingTypeId || !gradeLevel || !amount || !effectiveFrom) { toast.error("Isi semua field"); return }
    setSaving(true)
    try {
      await createMutation.mutateAsync({
        billingTypeId,
        academicYearId: "active",
        gradeLevel,
        amount: Number(amount),
        effectiveFrom: new Date(effectiveFrom),
      })
      toast.success("Tarif ditambahkan")
      setFormOpen(false)
      setBillingTypeId(""); setGradeLevel(""); setAmount(""); setEffectiveFrom("")
      refetch()
    } catch (err: any) { toast.error(err?.message || "Gagal") }
    setSaving(false)
  }

  if (isLoading) return <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>

  return (
    <div className="space-y-4 text-left">
      <div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer transition-all duration-300 transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Tarif</span>
        </button>
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jenis Tagihan</TableHead>
              <TableHead>Jenjang</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Mulai Berlaku</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((fs: any) => (
              <TableRow key={fs.id}>
                <TableCell className="font-medium">{billingTypes?.find((bt: any) => bt.id === fs.billingTypeId)?.name || fs.billingTypeId}</TableCell>
                <TableCell>{fs.gradeLevel}</TableCell>
                <TableCell className="text-right">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(fs.amount))}</TableCell>
                <TableCell className="text-xs">{fmtDate(fs.effectiveFrom)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="md:hidden space-y-2">
        {data?.map((fs: any) => (
          <div key={fs.id} className="neumo-card bg-background rounded-2xl p-4">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{billingTypes?.find((bt: any) => bt.id === fs.billingTypeId)?.name || fs.billingTypeId}</p>
            <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
              <span className="font-semibold">{fs.gradeLevel}</span>
              <span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(fs.amount))}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Mulai: {fmtDate(fs.effectiveFrom)}</p>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Tarif</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Jenis Tagihan</Label>
              <Select value={billingTypeId} onValueChange={(v) => v && setBillingTypeId(v)} options={billingTypes?.map((bt: any) => ({ value: bt.id, label: bt.name }))}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {billingTypes?.map((bt: any) => <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jenjang</Label>
              <Select value={gradeLevel} onValueChange={(v) => v && setGradeLevel(v)} options={[{value:"1", label:"Kelas 1"}, {value:"2", label:"Kelas 2"}, {value:"3", label:"Kelas 3"}, {value:"4", label:"Kelas 4"}, {value:"5", label:"Kelas 5"}, {value:"6", label:"Kelas 6"}, {value:"7", label:"Kelas 7"}, {value:"8", label:"Kelas 8"}, {value:"9", label:"Kelas 9"}, {value:"10", label:"Kelas 10"}, {value:"11", label:"Kelas 11"}, {value:"12", label:"Kelas 12"}]}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => <SelectItem key={n} value={String(n)}>Kelas {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100000" />
            </div>
            <div className="space-y-1.5">
              <Label>Mulai Berlaku</Label>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PengaturanKeuanganPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengaturan Keuangan</h2>
        <p className="text-muted-foreground">Kelola jenis tagihan, tarif, dan aturan denda</p>
      </div>

      <Tabs defaultValue="billing-type">
        <TabsList>
          <TabsTrigger value="billing-type">Jenis Tagihan</TabsTrigger>
          <TabsTrigger value="fee-structure">Tarif</TabsTrigger>
          <TabsTrigger value="late-fee">Denda</TabsTrigger>
        </TabsList>

        <TabsContent value="billing-type">
          <Card className="p-4">
            <BillingTypeTab />
          </Card>
        </TabsContent>

        <TabsContent value="fee-structure">
          <Card className="p-4">
            <FeeStructureTab />
          </Card>
        </TabsContent>

        <TabsContent value="late-fee">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground py-8 text-center">Aturan denda — coming soon</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
