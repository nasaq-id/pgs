"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Loader2, Search, X, CalendarDays } from "lucide-react"
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

const TIPE_LABEL: Record<string, string> = {
  kegiatan: "Kegiatan",
  libur: "Libur",
  lainnya: "Lainnya",
}

const TIPE_BADGE: Record<string, string> = {
  kegiatan: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  libur: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  lainnya: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
}

const BULAN_LIST = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
]

function getBulanLabel(value: string) {
  return BULAN_LIST.find((b) => b.value === value)?.label ?? value
}

interface KalenderRecord {
  id: string
  judul: string
  deskripsi: string | null
  tanggalMulai: string
  tanggalSelesai: string | null
  tipe: "kegiatan" | "libur" | "lainnya"
  isLiburNasional: boolean
  warna: string | null
  createdAt: string
}

interface FormState {
  id?: string
  judul: string
  deskripsi: string
  tanggalMulai: string
  tanggalSelesai: string
  tipe: string
  warna: string
}

const emptyForm: FormState = {
  judul: "",
  deskripsi: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  tipe: "kegiatan",
  warna: "#3b82f6",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "short",
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

export default function KalenderPage() {
  const [search, setSearch] = useState("")
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString())
  const [filterBulan, setFilterBulan] = useState((new Date().getMonth() + 1).toString())
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const tahun = filterTahun ? parseInt(filterTahun) : undefined
  const bulan = filterBulan ? parseInt(filterBulan) : undefined

  const { data: eventList, isLoading } = api.kalender.getAll.useQuery({
    search,
    tahun,
    bulan,
    limit: 200,
  })
  const utils = api.useUtils()

  const createMutation = api.kalender.create.useMutation({
    onSuccess: () => {
      toast.success("Event berhasil ditambahkan")
      utils.kalender.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan event"),
  })

  const updateMutation = api.kalender.update.useMutation({
    onSuccess: () => {
      toast.success("Event berhasil diperbarui")
      utils.kalender.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui event"),
  })

  const removeMutation = api.kalender.remove.useMutation({
    onSuccess: () => {
      toast.success("Event berhasil dihapus")
      utils.kalender.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus event"),
  })

  const seedMutation = api.kalender.seedLiburNasional.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} hari libur nasional berhasil ditambahkan`)
      utils.kalender.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan libur nasional"),
  })

  const openCreateForm = () => {
    setFormData(emptyForm)
    setFormOpen(true)
  }

  const openEditForm = (r: KalenderRecord) => {
    setFormData({
      id: r.id,
      judul: r.judul,
      deskripsi: r.deskripsi ?? "",
      tanggalMulai: toDateInputValue(r.tanggalMulai),
      tanggalSelesai: toDateInputValue(r.tanggalSelesai),
      tipe: r.tipe,
      warna: r.warna ?? "#3b82f6",
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.judul.trim() || !formData.tanggalMulai) return
    const payload = {
      judul: formData.judul.trim(),
      deskripsi: formData.deskripsi.trim() || undefined,
      tanggalMulai: formData.tanggalMulai,
      tanggalSelesai: formData.tanggalSelesai || undefined,
      tipe: formData.tipe as "kegiatan" | "libur" | "lainnya",
      warna: formData.warna,
    }
    if (formData.id) {
      await updateMutation.mutateAsync({ id: formData.id, ...payload })
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

  const handleSeed = async () => {
    const year = new Date().getFullYear()
    seedMutation.mutate({ tahun: year })
  }

  const records = (eventList ?? []) as KalenderRecord[]
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Kalender Akademik</h2>
          <p className="text-sm text-muted-foreground">Kelola kegiatan sekolah dan hari libur</p>
        </div>
        <Button variant="outline" onClick={handleSeed} disabled={seedMutation.isPending}>
          {seedMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CalendarDays className="h-4 w-4 mr-2" />
          )}
          Inisialisasi Libur Nasional {new Date().getFullYear()}
        </Button>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari event..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterBulan} onValueChange={(v) => setFilterBulan(v ?? "")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Bulan">{filterBulan ? getBulanLabel(filterBulan) : "Bulan"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BULAN_LIST.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Tahun"
              className="w-[100px]"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
            />
          </div>
          <Button
            className="gap-2"
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
            onClick={openCreateForm}
          >
            <Plus className="h-4 w-4" /> Tambah Event
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
              {search ? "Tidak ditemukan" : "Belum ada event kalender"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Warna</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.warna ?? "#3b82f6" }} />
                      {r.judul}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={TIPE_BADGE[r.tipe] ?? ""} variant="secondary">
                      {TIPE_LABEL[r.tipe] ?? r.tipe}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(r.tanggalMulai)}</TableCell>
                  <TableCell>{r.tanggalSelesai ? formatDate(r.tanggalSelesai) : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: r.warna ?? "#3b82f6" }} />
                      <span className="text-xs text-muted-foreground">{r.warna ?? "#3b82f6"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.isLiburNasional ? (
                      <Badge variant="outline" className="border-red-300 text-red-600">Libur Nasional</Badge>
                    ) : (
                      <Badge variant="outline">Manual</Badge>
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
                {formData.id ? "Edit Event" : "Tambah Event"}
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
                <Label className="w-28 text-right flex-shrink-0">Judul</Label>
                <Input
                  placeholder="Judul event"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="flex-1"
                />
              </div>

              <div className="flex items-start gap-4">
                <Label className="w-28 text-right flex-shrink-0 mt-2">Deskripsi</Label>
                <Textarea
                  placeholder="Deskripsi event (opsional)"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="flex-1 min-h-[80px]"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Tipe</Label>
                <Select
                  value={formData.tipe}
                  onValueChange={(v) => setFormData({ ...formData, tipe: v ?? "kegiatan" })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kegiatan">Kegiatan</SelectItem>
                    <SelectItem value="libur">Libur</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Warna</Label>
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="color"
                    value={formData.warna}
                    onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
                    className="h-9 w-9 rounded-lg border border-border bg-transparent cursor-pointer p-0.5"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{formData.warna}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Tgl Mulai</Label>
                <Input
                  type="date"
                  value={formData.tanggalMulai}
                  onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Tgl Selesai</Label>
                <Input
                  type="date"
                  value={formData.tanggalSelesai}
                  onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer">
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !formData.judul.trim() || !formData.tanggalMulai}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Event</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus event ini? Tindakan ini tidak dapat dibatalkan.
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
