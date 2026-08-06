"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Pencil, Trash2, CalendarDays, Loader2, CheckCircle2, Sparkles, Save } from "lucide-react"
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
import { toast } from "sonner"
import { DEFAULT_KALDIK } from "@/server/kaldik"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

function MmDdPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [bulanStr, tanggalStr] = value.split("-")
  const bulan = Number(bulanStr)
  const tanggal = Number(tanggalStr)
  return (
    <div className="flex gap-2">
      <Select value={String(bulan)} onValueChange={(v) => v && onChange(`${v.padStart(2, "0")}-${String(tanggal).padStart(2, "0")}`)}>
        <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {BULAN.map((b, i) => (
            <SelectItem key={i} value={String(i + 1)}>{b}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(tanggal)} onValueChange={(v) => v && onChange(`${String(bulan).padStart(2, "0")}-${v.padStart(2, "0")}`)}>
        <SelectTrigger className="rounded-xl w-20"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function TahunAjaranPage() {
  const { data: list, isLoading } = api.lembaga.getTahunAjaran.useQuery()
  const create = api.lembaga.createTahunAjaran.useMutation()
  const update = api.lembaga.updateTahunAjaran.useMutation()
  const remove = api.lembaga.removeTahunAjaran.useMutation()
  const utils = api.useUtils()

  const { data: pengaturan } = api.pengaturanKalender.get.useQuery()
  const saveKaldik = api.pengaturanKalender.upsert.useMutation({
    onSuccess: () => {
      toast.success("Pengaturan kalender berhasil disimpan")
      utils.pengaturanKalender.get.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menyimpan pengaturan kalender"),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ namaTahunAjaran: "", semester: "ganjil", tanggalMulai: "", tanggalSelesai: "", active: true })
  const [kaldikForm, setKaldikForm] = useState({ ...DEFAULT_KALDIK })

  const suggestQuery = api.pengaturanKalender.suggestTahunAjaran.useQuery(
    { namaTahunAjaran: form.namaTahunAjaran, semester: form.semester as "ganjil" | "genap" },
    { enabled: false }
  )

  useEffect(() => {
    if (pengaturan) {
      setKaldikForm({
        tanggalMulaiGanjil: pengaturan.tanggalMulaiGanjil,
        tanggalSelesaiGanjil: pengaturan.tanggalSelesaiGanjil,
        tanggalMulaiGenap: pengaturan.tanggalMulaiGenap,
        tanggalSelesaiGenap: pengaturan.tanggalSelesaiGenap,
        selaraskanSenin: pengaturan.selaraskanSenin,
      })
    }
  }, [pengaturan])

  const resetForm = () => {
    setForm({ namaTahunAjaran: "", semester: "ganjil", tanggalMulai: "", tanggalSelesai: "", active: true })
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

  const applySuggestion = async (force = false) => {
    const res = await suggestQuery.refetch()
    if (!res.data) return
    setForm((f) => {
      if (!force && f.tanggalMulai && f.tanggalSelesai) return f
      return { ...f, tanggalMulai: res.data!.tanggalMulai, tanggalSelesai: res.data!.tanggalSelesai }
    })
  }

  const prevSemester = useRef(form.semester)
  useEffect(() => {
    if (!formOpen || editId) return
    const semesterChanged = prevSemester.current !== form.semester
    prevSemester.current = form.semester
    if (!semesterChanged && form.tanggalMulai && form.tanggalSelesai) return
    applySuggestion(semesterChanged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen, editId, form.semester, form.namaTahunAjaran])

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

  const handleSaveKaldik = async () => {
    await saveKaldik.mutateAsync({ id: pengaturan?.id, ...kaldikForm })
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

      <div className="neumo-card bg-background rounded-2xl">
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : !list?.length ? (
          <div className="p-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Belum ada tahun ajaran</p>
          </div>
        ) : (
          <>
          <div className="hidden md:block">
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
          </div>
          <div className="md:hidden space-y-2">
            {list.map((ta) => (
              <div key={ta.id} className="neumo-card bg-background rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{ta.namaTahunAjaran}</span>
                    <p className="text-xs capitalize text-slate-500">{ta.semester}</p>
                  </div>
                  {ta.active ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">Aktif</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Tidak Aktif</Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500 space-y-1 mb-2">
                  <div className="flex justify-between"><span className="font-semibold">Mulai:</span><span>{ta.tanggalMulai ? new Date(ta.tanggalMulai).toLocaleDateString("id-ID") : "—"}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Selesai:</span><span>{ta.tanggalSelesai ? new Date(ta.tanggalSelesai).toLocaleDateString("id-ID") : "—"}</span></div>
                </div>
                <div className="flex gap-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <button onClick={() => openEdit(ta)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(ta.id)} className="rounded-lg p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <div className="neumo-card bg-background rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Default Kalender Pendidikan</h3>
        </div>
        <p className="text-xs text-slate-500 font-semibold mb-4">
          Tanggal otomatis terisi saat menambah tahun ajaran baru. Sesuaikan dengan Kaldik Dinas Pendidikan provinsi Anda.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="space-y-1.5 text-left">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Mulai Semester Ganjil</Label>
            <MmDdPicker value={kaldikForm.tanggalMulaiGanjil} onChange={(v) => setKaldikForm({ ...kaldikForm, tanggalMulaiGanjil: v })} />
          </div>
          <div className="space-y-1.5 text-left">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Selesai Semester Ganjil</Label>
            <MmDdPicker value={kaldikForm.tanggalSelesaiGanjil} onChange={(v) => setKaldikForm({ ...kaldikForm, tanggalSelesaiGanjil: v })} />
          </div>
          <div className="space-y-1.5 text-left">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Mulai Semester Genap</Label>
            <MmDdPicker value={kaldikForm.tanggalMulaiGenap} onChange={(v) => setKaldikForm({ ...kaldikForm, tanggalMulaiGenap: v })} />
          </div>
          <div className="space-y-1.5 text-left">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Selesai Semester Genap</Label>
            <MmDdPicker value={kaldikForm.tanggalSelesaiGenap} onChange={(v) => setKaldikForm({ ...kaldikForm, tanggalSelesaiGenap: v })} />
          </div>
        </div>
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-100 p-3 bg-slate-50/30">
            <Switch
              checked={kaldikForm.selaraskanSenin}
              onCheckedChange={(checked) => setKaldikForm({ ...kaldikForm, selaraskanSenin: checked })}
            >
              <SwitchThumb />
            </Switch>
            <Label className="font-bold text-xs text-slate-650 cursor-pointer">Selaraskan tanggal mulai ke hari Senin</Label>
          </div>
          <Button onClick={handleSaveKaldik} disabled={saveKaldik.isPending} className="gap-2">
            {saveKaldik.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Pengaturan
          </Button>
        </div>
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
              <button
                type="button"
                onClick={() => applySuggestion(true)}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/60 dark:bg-teal-950/30 hover:bg-teal-100/70 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Isi Otomatis (Kalender Pendidikan)
              </button>
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
