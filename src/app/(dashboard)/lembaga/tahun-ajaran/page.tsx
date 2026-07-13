"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, CalendarDays, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { api } from "@/lib/trpc/client"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch, SwitchThumb } from "@/components/ui/switch"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function TahunAjaranPage() {
  const { data: list, isLoading } = api.lembaga.getTahunAjaran.useQuery()
  const create = api.lembaga.createTahunAjaran.useMutation()
  const update = api.lembaga.updateTahunAjaran.useMutation()
  const remove = api.lembaga.removeTahunAjaran.useMutation()
  const utils = api.useUtils()

  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ namaTahunAjaran: "", semester: "ganjil", tanggalMulai: "", tanggalSelesai: "", active: false })

  const resetForm = () => {
    setForm({ namaTahunAjaran: "", semester: "ganjil", tanggalMulai: "", tanggalSelesai: "", active: false })
    setEditId(null)
  }

  const openEdit = (item: any) => {
    setEditId(item.id)
    setForm({
      namaTahunAjaran: item.namaTahunAjaran,
      semester: item.semester,
      tanggalMulai: item.tanggalMulai ? item.tanggalMulai.slice(0, 10) : "",
      tanggalSelesai: item.tanggalSelesai ? item.tanggalSelesai.slice(0, 10) : "",
      active: item.active,
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    const data = { ...form, semester: form.semester as "ganjil" | "genap" }
    if (editId) {
      await update.mutateAsync({ id: editId, ...data })
    } else {
      await create.mutateAsync(data)
    }
    utils.lembaga.getTahunAjaran.invalidate()
    utils.lembaga.getActiveTahunAjaran.invalidate()
    setFormOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await remove.mutateAsync({ id: deleteId })
    utils.lembaga.getTahunAjaran.invalidate()
    utils.lembaga.getActiveTahunAjaran.invalidate()
    setDeleteId(null)
  }

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Tahun Ajaran</h2>
          <p className="text-xs text-slate-450 font-bold mt-1">Kelola tahun ajaran dan semester aktif</p>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true) }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer transition-all duration-300 transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah</span>
        </button>
      </div>

      <div className="glass-card rounded-2xl">
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : !list?.length ? (
          <div className="p-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Belum ada tahun ajaran</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tahun Ajaran</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((ta) => (
                <TableRow key={ta.id}>
                  <TableCell className="font-medium">{ta.namaTahunAjaran}</TableCell>
                  <TableCell className="capitalize">{ta.semester}</TableCell>
                  <TableCell>{ta.tanggalMulai ? new Date(ta.tanggalMulai).toLocaleDateString("id-ID") : "—"}</TableCell>
                  <TableCell>{ta.tanggalSelesai ? new Date(ta.tanggalSelesai).toLocaleDateString("id-ID") : "—"}</TableCell>
                  <TableCell>
                    {ta.active ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Tidak Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ta)} />}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipPositioner>
                            <TooltipPopup>Edit</TooltipPopup>
                          </TooltipPositioner>
                        </TooltipPortal>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(ta.id)} />}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipPositioner>
                            <TooltipPopup>Hapus</TooltipPopup>
                          </TooltipPositioner>
                        </TooltipPortal>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) resetForm(); setFormOpen(open) }}>
        <DialogContent className="sm:max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="p-6 relative">
            <DialogHeader className="text-left mb-4">
              <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">{editId ? "Edit" : "Tambah"} Tahun Ajaran</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Nama Tahun Ajaran</Label>
                <Input value={form.namaTahunAjaran} onChange={(e) => setForm({ ...form, namaTahunAjaran: e.target.value })} placeholder="2025/2026" />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Semester</Label>
                <Select value={form.semester} onValueChange={(v) => v && setForm({ ...form, semester: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ganjil">Ganjil</SelectItem>
                    <SelectItem value="genap">Genap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Tanggal Mulai</Label>
                  <Input type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Tanggal Selesai</Label>
                  <Input type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3 bg-slate-50/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-650" />
                  <Label className="font-bold text-xs text-slate-650 cursor-pointer">Aktifkan sebagai tahun ajaran berjalan</Label>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                >
                  <SwitchThumb />
                </Switch>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={create.isPending || update.isPending}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed mt-4"
              >
                {create.isPending || update.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Simpan</span>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tahun Ajaran?</AlertDialogTitle>
            <AlertDialogDescription>Data tahun ajaran akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
