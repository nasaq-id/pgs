"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch, SwitchThumb } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"

const TARGET_LABEL: Record<string, string> = {
  semua: "Semua",
  guru: "Guru",
  siswa: "Siswa",
  orang_tua: "Orang Tua",
}

const TARGET_BADGE: Record<string, string> = {
  semua: "bg-secondary text-secondary-foreground",
  guru: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  siswa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  orang_tua: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
}

interface PengumumanRecord {
  id: string
  judul: string
  konten: string | null
  target: "semua" | "guru" | "siswa" | "orang_tua"
  tanggalPublish: string | null
  published: boolean
  createdAt: string
}

interface FormState {
  id?: string
  judul: string
  konten: string
  target: string
  tanggalPublish: string
  published: boolean
}

const emptyForm: FormState = {
  judul: "",
  konten: "",
  target: "semua",
  tanggalPublish: "",
  published: false,
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function toDateInputValue(dateStr: string | null) {
  if (!dateStr) return ""
  try {
    return new Date(dateStr).toISOString().split("T")[0]
  } catch {
    return ""
  }
}

export default function PengumumanPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: pengumumanList, isLoading } = api.pengumuman.getAll.useQuery({ search })
  const utils = api.useUtils()

  const createMutation = api.pengumuman.create.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil ditambahkan")
      utils.pengumuman.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan pengumuman"),
  })

  const updateMutation = api.pengumuman.update.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil diperbarui")
      utils.pengumuman.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui pengumuman"),
  })

  const removeMutation = api.pengumuman.remove.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil dihapus")
      utils.pengumuman.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus pengumuman"),
  })

  const openCreateForm = () => {
    setFormData(emptyForm)
    setFormOpen(true)
  }

  const openEditForm = (r: PengumumanRecord) => {
    setFormData({
      id: r.id,
      judul: r.judul,
      konten: r.konten ?? "",
      target: r.target,
      tanggalPublish: toDateInputValue(r.tanggalPublish),
      published: r.published,
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.judul.trim()) return
    const payload = {
      judul: formData.judul.trim(),
      konten: formData.konten.trim() || null,
      target: formData.target as "semua" | "guru" | "siswa" | "orang_tua",
      tanggalPublish: formData.tanggalPublish || null,
      published: formData.published,
      sekolahId: "",
    }
    if (formData.id) {
      await updateMutation.mutateAsync({ id: formData.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    setFormOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const records = (pengumumanList ?? []) as PengumumanRecord[]
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pengumuman</h2>
        <p className="text-sm text-muted-foreground">Kelola pengumuman sekolah</p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pengumuman..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            className="gap-2"
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
            onClick={openCreateForm}
          >
            <Plus className="h-4 w-4" /> Buat Pengumuman
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
              {search ? "Tidak ditemukan" : "Belum ada pengumuman"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Tanggal Publish</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.judul}</TableCell>
                  <TableCell>
                    <Badge className={TARGET_BADGE[r.target] ?? ""} variant="secondary">
                      {TARGET_LABEL[r.target] ?? r.target}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(r.tanggalPublish)}</TableCell>
                  <TableCell>
                    {r.published ? (
                      <Badge variant="default" className="bg-green-600">Published</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={<Button variant="ghost" size="icon" onClick={() => openEditForm(r)} />}
                        >
                          <Pencil className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipPositioner>
                            <TooltipPopup>Edit</TooltipPopup>
                          </TooltipPositioner>
                        </TooltipPortal>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteId(r.id)}
                            />
                          }
                        >
                          <Trash2 className="h-4 w-4" />
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay">
          <div className="glass-dialog rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="font-semibold text-foreground">
                {formData.id ? "Edit Pengumuman" : "Buat Pengumuman"}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <Label className="w-24 text-right flex-shrink-0">Judul</Label>
                <Input
                  placeholder="Judul pengumuman"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="flex-1"
                />
              </div>

              <div className="flex items-start gap-4">
                <Label className="w-24 text-right flex-shrink-0 mt-2">Konten</Label>
                <Textarea
                  placeholder="Isi pengumuman"
                  value={formData.konten}
                  onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                  className="flex-1 min-h-[100px]"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-24 text-right flex-shrink-0">Target</Label>
                <Select
                  value={formData.target}
                  onValueChange={(v) => setFormData({ ...formData, target: v ?? "semua" })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua</SelectItem>
                    <SelectItem value="guru">Guru</SelectItem>
                    <SelectItem value="siswa">Siswa</SelectItem>
                    <SelectItem value="orang_tua">Orang Tua</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-24 text-right flex-shrink-0">Tgl Publish</Label>
                <Input
                  type="date"
                  value={formData.tanggalPublish}
                  onChange={(e) => setFormData({ ...formData, tanggalPublish: e.target.value })}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-24 text-right flex-shrink-0">Published</Label>
                <Switch
                  checked={formData.published}
                  onCheckedChange={(v: boolean) => setFormData({ ...formData, published: v })}
                >
                  <SwitchThumb />
                </Switch>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer">
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !formData.judul.trim()}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.
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
