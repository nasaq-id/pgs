"use client"

import { useState, useEffect } from "react"
import { X, Plus, Pencil, Trash2, Loader2, Search, DoorOpen, Building2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { useOptimisticRemove } from "@/hooks/useOptimisticRemove"

interface RuangKelasFormData {
  id?: string
  namaRuang: string
  kapasitas?: number | null
}

interface RuangKelasRecord {
  id: string
  namaRuang: string
  kapasitas: number | null
}

function RuangKelasFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: RuangKelasFormData) => Promise<void>
  initial?: RuangKelasFormData | null
  saving?: boolean
}) {
  const [namaRuang, setNamaRuang] = useState("")
  const [kapasitas, setKapasitas] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setNamaRuang(initial.namaRuang ?? "")
      setKapasitas(initial.kapasitas?.toString() ?? "")
    } else {
      setNamaRuang("")
      setKapasitas("")
    }
  }, [open, initial])

  const handleSubmit = async () => {
    if (!namaRuang.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        id: initial?.id,
        namaRuang: namaRuang.trim(),
        kapasitas: kapasitas ? parseInt(kapasitas, 10) : null,
      })
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  const isLoading = saving || submitting

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
            {initial?.id ? "Edit Ruang Kelas" : "Tambah Ruang Kelas Baru"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Nama Ruangan</Label>
            <Input
              placeholder="Contoh: Ruang Kelas VII-A, Lab Fisika..."
              value={namaRuang}
              onChange={(e) => setNamaRuang(e.target.value)}
              className="rounded-xl border-slate-200 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Kapasitas Siswa</Label>
            <Input
              type="number"
              placeholder="Contoh: 36"
              value={kapasitas}
              onChange={(e) => setKapasitas(e.target.value)}
              className="rounded-xl border-slate-200 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-85"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !namaRuang.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 h-[38px]"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            <span>Simpan</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function RuangKelasPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<RuangKelasFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: ruangList, isLoading } = api.ruangKelas.getAll.useQuery({ search })
  const utils = api.useUtils()

  const createMutation = api.ruangKelas.create.useMutation({
    onSuccess: () => {
      toast.success("Ruang kelas berhasil ditambahkan")
      utils.ruangKelas.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan ruang kelas"),
  })

  const updateMutation = api.ruangKelas.update.useMutation({
    onSuccess: () => {
      toast.success("Ruang kelas berhasil diperbarui")
      utils.ruangKelas.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui ruang kelas"),
  })

  const removeMutation = api.ruangKelas.remove.useMutation({
    ...useOptimisticRemove({
      queryKey: [["ruangKelas", "getAll"]],
      successMessage: "Ruang kelas berhasil dihapus",
      errorMessage: "Gagal menghapus ruang kelas",
    }),
  })

  const handleSubmit = async (data: RuangKelasFormData) => {
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          namaRuang: data.namaRuang,
          kapasitas: data.kapasitas ?? null,
        },
      })
    } else {
      await createMutation.mutateAsync({
        namaRuang: data.namaRuang,
        kapasitas: data.kapasitas ?? null,
        sekolahId: "",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const records = (ruangList ?? []) as RuangKelasRecord[]

  const totalRooms = records.length
  const totalKapasitas = records.reduce((sum, r) => sum + (r.kapasitas ?? 0), 0)

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-3 text-left">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 p-5 rounded-3xl bg-card border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5 uppercase">
              <DoorOpen className="h-6 w-6 text-teal-600" />
              Ruang Kelas & Sarana
            </h2>
            <p className="text-xs text-slate-450 font-bold mt-1">
              Kelola data ruang belajar fisik, kapasitas kelas, laboratorium, dan sarana sekolah
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="neumo-card bg-background rounded-3xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Ruangan</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{isLoading ? "..." : totalRooms} Ruang</h3>
            </div>
          </div>

          <div className="neumo-card bg-background rounded-3xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Kapasitas Belajar</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{isLoading ? "..." : totalKapasitas} Siswa</h3>
            </div>
          </div>
        </div>

        {/* List Card */}
        <div className="neumo-card bg-background rounded-[26px] p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari ruang kelas..."
                  className="pl-9 h-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" className="h-10 px-4">
                Cari
              </Button>
            </div>
            <button
              onClick={() => {
                setEditData(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all duration-300 h-10"
            >
              <Plus className="h-4 w-4" /> Tambah Ruang Kelas
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/20">
              <Building2 className="h-12 w-12 text-slate-350 dark:text-slate-600 mb-3" />
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">Tidak ada ruangan</h4>
              <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold mt-1">
                {search ? "Coba kata kunci pencarian lainnya" : "Silakan tambahkan ruangan fisik pertama Anda"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block rounded-2xl border border-slate-200/60 dark:border-slate-800/40 overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-slate-50/70 dark:bg-slate-900/30">
                    <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-slate-800/40">
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400 py-3.5 pl-5">Nama Ruangan</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400 py-3.5">Kapasitas</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-400 py-3.5 text-right pr-5">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 border-slate-200/50 dark:border-slate-800/20">
                        <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200 py-3.5 pl-5">{r.namaRuang}</TableCell>
                        <TableCell className="font-semibold text-xs text-slate-600 dark:text-slate-300 py-3.5">
                          {r.kapasitas ? `${r.kapasitas} Siswa` : "Tidak Terbatas"}
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-5">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    onClick={() => {
                                      setEditData({ id: r.id, namaRuang: r.namaRuang, kapasitas: r.kapasitas })
                                      setFormOpen(true)
                                    }}
                                  />
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </TooltipTrigger>
                              <TooltipPortal>
                                <TooltipPositioner side="top">
                                  <TooltipPopup>Edit Ruang</TooltipPopup>
                                </TooltipPositioner>
                              </TooltipPortal>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-700" onClick={() => setDeleteId(r.id)} />
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </TooltipTrigger>
                              <TooltipPortal>
                                <TooltipPositioner side="top">
                                  <TooltipPopup>Hapus Ruang</TooltipPopup>
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
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="neumo-card bg-background rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{r.namaRuang}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">{r.kapasitas ? `${r.kapasitas} Siswa` : "Tidak Terbatas"}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditData({ id: r.id, namaRuang: r.namaRuang, kapasitas: r.kapasitas }); setFormOpen(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:text-rose-700 cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <RuangKelasFormDialog
          open={formOpen}
          onClose={() => {
            setFormOpen(false)
            setEditData(null)
          }}
          onSubmit={handleSubmit}
          initial={editData}
          saving={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-md text-left">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-black text-slate-800 uppercase tracking-widest">Hapus Ruang Kelas</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500 font-bold">
                Apakah Anda yakin ingin menghapus ruang kelas ini? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2.5">
              <AlertDialogCancel disabled={removeMutation.isPending} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={removeMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-rose-500/5 cursor-pointer disabled:opacity-80 transition-all duration-300 transform active:scale-95 border-0"
              >
                {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Hapus Permanen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
