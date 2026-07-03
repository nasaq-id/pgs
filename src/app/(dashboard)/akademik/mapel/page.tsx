"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
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
import { api } from "@/lib/trpc/client"
import MapelFormDialog, { type MapelFormData } from "@/components/mapel/MapelFormDialog"

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
  kelompok: string | null
  kkm: number | null
  aktif: boolean
  urutan: number | null
}

const KELOMPOK_LABEL: Record<string, string> = {
  A: "Kelompok A",
  B: "Kelompok B",
  C: "Kelompok C",
  muatan_lokal: "Muatan Lokal",
}

export default function MapelPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<MapelFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: mapelList, isLoading } = api.mapel.getAll.useQuery({ search })
  const utils = api.useUtils()

  const createMutation = api.mapel.create.useMutation({
    onSuccess: () => {
      utils.mapel.getAll.invalidate()
    },
  })

  const updateMutation = api.mapel.update.useMutation({
    onSuccess: () => {
      utils.mapel.getAll.invalidate()
    },
  })

  const removeMutation = api.mapel.remove.useMutation({
    onSuccess: () => {
      utils.mapel.getAll.invalidate()
    },
  })

  const handleSubmit = async (data: MapelFormData) => {
    if (data.id) {
      await updateMutation.mutateAsync({
        id: data.id,
        data: {
          namaMapel: data.namaMapel,
          kodeMapel: data.kodeMapel || null,
          kelompok: (data.kelompok as "A" | "B" | "C" | "muatan_lokal") || null,
        },
      })
    } else {
      await createMutation.mutateAsync({
        namaMapel: data.namaMapel,
        kodeMapel: data.kodeMapel || null,
        kelompok: (data.kelompok as "A" | "B" | "C" | "muatan_lokal") || null,
        sekolahId,
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const { data: session } = useSession()
  const sekolahId = session?.user?.sekolahId ?? ""

  const records = (mapelList ?? []) as MapelRecord[]

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari mata pelajaran..."
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
            <Plus className="h-4 w-4" /> Tambah Mapel
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
              {search ? "Tidak ditemukan" : "Belum ada mata pelajaran"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Mapel</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>KKM</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urutan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.kodeMapel ?? "-"}</TableCell>
                  <TableCell className="font-medium">{r.namaMapel}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {KELOMPOK_LABEL[r.kelompok ?? ""] ?? r.kelompok ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.kkm ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={r.aktif ? "default" : "secondary"}>
                      {r.aktif ? "Aktif" : "Tidak Aktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.urutan ?? "-"}</TableCell>
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
                                  namaMapel: r.namaMapel,
                                  kodeMapel: r.kodeMapel ?? "",
                                  kelompok: r.kelompok ?? "",
                                  aktif: r.aktif,
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

      <MapelFormDialog
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
            <AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus mata pelajaran ini? Tindakan ini tidak dapat
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
