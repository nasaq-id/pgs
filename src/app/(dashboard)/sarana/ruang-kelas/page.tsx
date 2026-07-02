"use client"

import { useState, useEffect } from "react"
import { X, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay">
      <div className="glass-dialog rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="font-semibold text-foreground">Form Ruang Kelas</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Nama Ruang</Label>
            <Input
              placeholder="Nama Ruang Kelas"
              value={namaRuang}
              onChange={(e) => setNamaRuang(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label className="w-20 text-right flex-shrink-0">Kapasitas</Label>
            <Input
              type="number"
              placeholder="Jumlah kapasitas"
              value={kapasitas}
              onChange={(e) => setKapasitas(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !namaRuang.trim()}
          >
            {isLoading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
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
    onSuccess: () => {
      toast.success("Ruang kelas berhasil dihapus")
      utils.ruangKelas.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus ruang kelas"),
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Ruang Kelas</h2>
        <p className="text-sm text-muted-foreground">Kelola data ruang kelas</p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari ruang kelas..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="gap-2"
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
            onClick={() => {
              setEditData(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Tambah Ruang Kelas
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              {search ? "Tidak ditemukan" : "Belum ada ruang kelas"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Ruang</TableHead>
                <TableHead>Kapasitas</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.namaRuang}</TableCell>
                  <TableCell>{r.kapasitas ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditData({
                            id: r.id,
                            namaRuang: r.namaRuang,
                            kapasitas: r.kapasitas,
                          })
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Ruang Kelas</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus ruang kelas ini? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
