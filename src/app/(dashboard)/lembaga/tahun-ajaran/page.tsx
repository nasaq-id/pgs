"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, CalendarDays, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  const [form, setForm] = useState({ namaTahunAjaran: "", semester: "ganjil", tanggalMulai: "", tanggalSelesai: "" })

  const resetForm = () => {
    setForm({ namaTahunAjaran: "", semester: "ganjil", tanggalMulai: "", tanggalSelesai: "" })
    setEditId(null)
  }

  const openEdit = (item: any) => {
    setEditId(item.id)
    setForm({
      namaTahunAjaran: item.namaTahunAjaran,
      semester: item.semester,
      tanggalMulai: item.tanggalMulai ? item.tanggalMulai.slice(0, 10) : "",
      tanggalSelesai: item.tanggalSelesai ? item.tanggalSelesai.slice(0, 10) : "",
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
    setFormOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await remove.mutateAsync({ id: deleteId })
    utils.lembaga.getTahunAjaran.invalidate()
    setDeleteId(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Tahun Ajaran</h2>
          <p className="text-sm text-muted-foreground">Kelola tahun ajaran dan semester aktif</p>
        </div>
        <Button onClick={() => { resetForm(); setFormOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm">
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ta)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(ta.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) resetForm(); setFormOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Tambah"} Tahun Ajaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Tahun Ajaran</Label>
              <Input value={form.namaTahunAjaran} onChange={(e) => setForm({ ...form, namaTahunAjaran: e.target.value })} placeholder="2025/2026" />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Select value={form.semester} onValueChange={(v) => v && setForm({ ...form, semester: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ganjil">Ganjil</SelectItem>
                  <SelectItem value="genap">Genap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
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
