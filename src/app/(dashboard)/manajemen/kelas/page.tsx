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
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { api } from "@/lib/trpc/client"
import KelasFormDialog, { type KelasFormData } from "@/components/kelas/KelasFormDialog"
import { toast } from "sonner"

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
  waliKelasId: string | null
  kapasitas: number | null
  tahunAjaranId: string | null
}

export default function KelasPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<KelasFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: kelasList, isLoading } = api.kelas.getAll.useQuery({ search })
  const { data: guruList } = api.guru.getAll.useQuery({})
  const { data: siswaList } = api.siswa.getAll.useQuery({})
  const utils = api.useUtils()

  const createMutation = api.kelas.create.useMutation({
    onSuccess: () => {
      utils.kelas.getAll.invalidate()
    },
  })

  const updateMutation = api.kelas.update.useMutation({
    onSuccess: () => {
      utils.kelas.getAll.invalidate()
    },
  })

  const removeMutation = api.kelas.remove.useMutation({
    onSuccess: () => {
      utils.kelas.getAll.invalidate()
    },
  })

  const { data: session } = useSession()
  const sekolahId = session?.user?.sekolahId ?? ""

  const guruMap = new Map(
    (guruList ?? []).map((g: { id: string; namaLengkap: string }) => [g.id, g.namaLengkap])
  )

  const handleSubmit = async (data: KelasFormData) => {
    try {
      if (data.id) {
        await updateMutation.mutateAsync({
          id: data.id,
          data: {
            namaKelas: data.namaKelas,
            tingkat: data.tingkat || null,
            waliKelasId: data.waliKelasId || null,
            kapasitas: data.kapasitas ?? null,
            siswaIds: data.siswaIds,
          },
        })
      } else {
        await createMutation.mutateAsync({
          namaKelas: data.namaKelas,
          tingkat: data.tingkat || null,
          waliKelasId: data.waliKelasId || null,
          kapasitas: data.kapasitas ?? null,
          sekolahId,
          siswaIds: data.siswaIds,
        })
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan kelas")
      throw err
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const siswaCountByKelas = new Map<string, number>()
  if (siswaList) {
    for (const s of siswaList as any[]) {
      if (s.kelasId) {
        siswaCountByKelas.set(s.kelasId, (siswaCountByKelas.get(s.kelasId) ?? 0) + 1)
      }
    }
  }

  const records = (kelasList ?? []) as KelasRecord[]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Rombongan Belajar</h2>
        <p className="text-muted-foreground">Kelola data rombongan belajar</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kelas..."
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
            <Plus className="h-4 w-4" /> Tambah Kelas
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
              {search ? "Tidak ditemukan" : "Belum ada data kelas"}
            </p>
          </div>
        ) : (
          <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Wali Kelas</TableHead>
                  <TableHead>Kapasitas</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.namaKelas}</TableCell>
                    <TableCell>{r.tingkat ?? "-"}</TableCell>
                    <TableCell>
                      {r.waliKelasId ? (
                        <Badge variant="outline">{guruMap.get(r.waliKelasId) ?? "-"}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.kapasitas ? `${siswaCountByKelas.get(r.id) ?? 0} / ${r.kapasitas}` : "-"}
                    </TableCell>
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
                                    namaKelas: r.namaKelas,
                                    tingkat: r.tingkat ?? "",
                                    waliKelasId: r.waliKelasId ?? "",
                                    kapasitas: r.kapasitas ?? undefined,
                                    siswaIds: [],
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
          </div>
          <div className="md:hidden space-y-2">
            {records.map((r) => (
              <div key={r.id} className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{r.namaKelas}</span>
                    <p className="text-xs text-slate-500">{r.tingkat ?? "-"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditData({ id: r.id, namaKelas: r.namaKelas, tingkat: r.tingkat ?? "", waliKelasId: r.waliKelasId ?? "", kapasitas: r.kapasitas ?? undefined, siswaIds: [] }); setFormOpen(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                    {deleteId !== r.id && <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {r.waliKelasId && <Badge variant="outline" className="text-[10px]">{guruMap.get(r.waliKelasId) ?? "-"}</Badge>}
                  <span className="font-semibold">{r.kapasitas ? `${siswaCountByKelas.get(r.id) ?? 0} / ${r.kapasitas}` : "-"}</span>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </Card>

      <KelasFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
        }}
        onSubmit={handleSubmit}
        initial={editData}
        guruList={guruList ?? []}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kelas</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan.
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
