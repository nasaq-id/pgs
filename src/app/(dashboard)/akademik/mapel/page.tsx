"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Plus, Pencil, Trash2, Loader2, Search, MoreHorizontal, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [localRecords, setLocalRecords] = useState<MapelRecord[]>([])

  const { data: mapelList, isLoading } = api.mapel.getAll.useQuery({ search })
  const utils = api.useUtils()

  useEffect(() => {
    setLocalRecords((mapelList ?? []) as MapelRecord[])
  }, [mapelList])

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

  const reorderMutation = api.mapel.reorder.useMutation({
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

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const updated = [...localRecords]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(index, 0, moved)
    setDragIndex(index)
    setLocalRecords(updated)
  }, [dragIndex, localRecords])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    const items = localRecords.map((r, i) => ({ id: r.id, urutan: i + 1 }))
    reorderMutation.mutate({ items })
  }, [localRecords, reorderMutation])

  const { data: session } = useSession()
  const sekolahId = session?.user?.sekolahId ?? ""

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5">
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
        ) : localRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              {search ? "Tidak ditemukan" : "Belum ada mata pelajaran"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Kode</TableHead>
                <TableHead>Nama Mapel</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localRecords.map((r, index) => (
                <TableRow
                  key={r.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={dragIndex === index ? "opacity-50" : "cursor-grab active:cursor-grabbing"}
                >
                  <TableCell className="w-10 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.kodeMapel ?? "-"}</TableCell>
                  <TableCell className="font-medium">{r.namaMapel}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {KELOMPOK_LABEL[r.kelompok ?? ""] ?? r.kelompok ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.aktif ? "default" : "secondary"}>
                      {r.aktif ? "Aktif" : "Tidak Aktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger
                          delay={0}
                          render={
                            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center hover:bg-green-50 dark:hover:bg-green-950/20 text-muted-foreground hover:text-[hsl(142_72%_40%)] focus-visible:ring-2 focus-visible:ring-[hsl(142_72%_40%)] rounded-md focus:outline-none transition-colors cursor-pointer" />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipPositioner>
                            <TooltipPopup>Aksi</TooltipPopup>
                          </TooltipPositioner>
                        </TooltipPortal>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
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
                          className="gap-2 clickable"
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(r.id)}
                          className="gap-2 clickable text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

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
