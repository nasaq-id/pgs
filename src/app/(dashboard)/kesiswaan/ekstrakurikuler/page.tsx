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
import EkstrakurikulerFormDialog, { type EkstrakurikulerFormData } from "@/components/ekstrakurikuler/EkstrakurikulerFormDialog"

const HARI_LABEL: Record<string, string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
  minggu: "Minggu",
}

interface EkstrakurikulerRecord {
  id: string
  namaEkskul: string
  pembinaId: string | null
  deskripsi: string | null
  hari: string | null
  jam: string | null
  pembina: { id: string; namaLengkap: string } | null
}

export default function EkstrakurikulerPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<EkstrakurikulerFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: ekskulList, isLoading } = api.ekstrakurikuler.getAll.useQuery({ search })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 200 })
  const utils = api.useUtils()

  const createMutation = api.ekstrakurikuler.create.useMutation({
    onSuccess: () => {
      toast.success("Ekstrakurikuler berhasil ditambahkan")
      utils.ekstrakurikuler.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan ekstrakurikuler"),
  })

  const updateMutation = api.ekstrakurikuler.update.useMutation({
    onSuccess: () => {
      toast.success("Ekstrakurikuler berhasil diperbarui")
      utils.ekstrakurikuler.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui ekstrakurikuler"),
  })

  const removeMutation = api.ekstrakurikuler.remove.useMutation({
    onSuccess: () => {
      toast.success("Ekstrakurikuler berhasil dihapus")
      utils.ekstrakurikuler.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus ekstrakurikuler"),
  })

  const handleSubmit = async (data: EkstrakurikulerFormData) => {
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          namaEkskul: data.namaEkskul,
          pembinaId: data.pembinaId ?? null,
          deskripsi: data.deskripsi ?? null,
          hari: data.hari ?? null,
          jam: data.jam ?? null,
        },
      })
    } else {
      await createMutation.mutateAsync({
        namaEkskul: data.namaEkskul,
        pembinaId: data.pembinaId ?? null,
        deskripsi: data.deskripsi ?? null,
        hari: data.hari ?? null,
        jam: data.jam ?? null,
        sekolahId: "",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const records = (ekskulList ?? []) as EkstrakurikulerRecord[]
  const guruOptions = (guruList ?? []).map((g: { id: string; namaLengkap: string }) => ({ id: g.id, namaLengkap: g.namaLengkap }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Ekstrakurikuler</h2>
        <p className="text-muted-foreground">Kelola data ekstrakurikuler</p>
      </div>

      <Card className="p-5 rounded-3xl glass-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari ekstrakurikuler..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setEditData(null)
              setFormOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer transition-all duration-300 transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Ekskul</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {search ? "Tidak ditemukan" : "Belum ada ekstrakurikuler"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nama Ekskul</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pembina</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hari</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jam</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.namaEkskul}</TableCell>
                  <TableCell>{r.pembina?.namaLengkap ?? "-"}</TableCell>
                  <TableCell>
                    {r.hari ? (
                      <Badge variant="outline">{HARI_LABEL[r.hari] ?? r.hari}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{r.jam ?? "-"}</TableCell>
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
                                  namaEkskul: r.namaEkskul,
                                  pembinaId: r.pembinaId,
                                  deskripsi: r.deskripsi,
                                  hari: r.hari,
                                  jam: r.jam,
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

      <EkstrakurikulerFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
        }}
        onSubmit={handleSubmit}
        initial={editData}
        saving={createMutation.isPending || updateMutation.isPending}
        guruList={guruOptions}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Ekstrakurikuler</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus ekstrakurikuler ini? Tindakan ini tidak dapat
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
