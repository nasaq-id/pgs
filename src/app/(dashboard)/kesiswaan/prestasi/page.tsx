"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
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
import PrestasiFormDialog, { type PrestasiFormData } from "@/components/prestasi/PrestasiFormDialog"

const TINGKAT_LABEL: Record<string, string> = {
  sekolah: "Sekolah",
  kecamatan: "Kecamatan",
  kabupaten: "Kabupaten",
  provinsi: "Provinsi",
  nasional: "Nasional",
  internasional: "Internasional",
}

interface PrestasiRecord {
  id: string
  siswaId: string
  namaPrestasi: string
  tingkat: string | null
  juara: string | null
  tanggal: string | null
  siswa: { id: string; namaLengkap: string }
}

function formatDate(dateVal: string | null) {
  if (!dateVal) return "-"
  const d = new Date(dateVal)
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

export default function PrestasiPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<PrestasiFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: prestasiList, isLoading } = api.prestasi.getAll.useQuery({ search })
  const { data: siswaList } = api.siswa.getAll.useQuery({ limit: 200 })
  const utils = api.useUtils()

  const createMutation = api.prestasi.create.useMutation({
    onSuccess: () => {
      toast.success("Prestasi berhasil ditambahkan")
      utils.prestasi.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan prestasi"),
  })

  const updateMutation = api.prestasi.update.useMutation({
    onSuccess: () => {
      toast.success("Prestasi berhasil diperbarui")
      utils.prestasi.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui prestasi"),
  })

  const removeMutation = api.prestasi.remove.useMutation({
    onSuccess: () => {
      toast.success("Prestasi berhasil dihapus")
      utils.prestasi.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus prestasi"),
  })

  const handleSubmit = async (data: PrestasiFormData) => {
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          siswaId: data.siswaId,
          namaPrestasi: data.namaPrestasi,
          tingkat: (data.tingkat || null) as "sekolah" | "kecamatan" | "kabupaten" | "provinsi" | "nasional" | "internasional" | null | undefined,
          juara: data.juara ?? null,
          tanggal: data.tanggal ? new Date(data.tanggal) : null,
        },
      })
    } else {
      await createMutation.mutateAsync({
        siswaId: data.siswaId,
        namaPrestasi: data.namaPrestasi,
        tingkat: (data.tingkat || null) as "sekolah" | "kecamatan" | "kabupaten" | "provinsi" | "nasional" | "internasional" | null | undefined,
        juara: data.juara ?? null,
        tanggal: data.tanggal ? new Date(data.tanggal) : null,
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const records = (prestasiList ?? []) as PrestasiRecord[]
  const siswaOptions = (siswaList ?? []).map((s: { id: string; namaLengkap: string }) => ({
    id: s.id,
    namaLengkap: s.namaLengkap,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Prestasi Siswa</h2>
        <p className="text-sm text-muted-foreground">Kelola data prestasi siswa</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari prestasi atau siswa..."
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
            <Plus className="h-4 w-4" /> Tambah Prestasi
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
              {search ? "Tidak ditemukan" : "Belum ada prestasi"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Prestasi</TableHead>
                <TableHead>Siswa</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>Juara</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.namaPrestasi}</TableCell>
                  <TableCell>{r.siswa?.namaLengkap ?? "-"}</TableCell>
                  <TableCell>
                    {r.tingkat ? (
                      <Badge variant="outline">{TINGKAT_LABEL[r.tingkat] ?? r.tingkat}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{r.juara ?? "-"}</TableCell>
                  <TableCell>{formatDate(r.tanggal)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditData({
                                  id: r.id,
                                  siswaId: r.siswaId,
                                  namaPrestasi: r.namaPrestasi,
                                  tingkat: r.tingkat,
                                  juara: r.juara,
                                  tanggal: r.tanggal ? new Date(r.tanggal).toISOString().split("T")[0] : null,
                                })
                                setFormOpen(true)
                              }}
                            />
                          }
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
      </Card>

      <PrestasiFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
        }}
        onSubmit={handleSubmit}
        initial={editData}
        saving={createMutation.isPending || updateMutation.isPending}
        siswaList={siswaOptions}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Prestasi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus prestasi ini? Tindakan ini tidak dapat dibatalkan.
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
