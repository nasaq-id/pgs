"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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

export default function KelasTab() {
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
    <>
      <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 md:p-6 mb-6 space-y-5 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari rombel kelas..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition-all text-slate-700 dark:text-slate-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center cursor-pointer"
            onClick={() => {
              setEditData(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Tambah Kelas</span>
          </button>
        </div>

        {/* Mobile View: Card List (Visible on mobile, hidden on desktop) */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))
          ) : records.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-8 text-center text-slate-400 font-semibold shadow-sm">
              {search ? "Tidak ditemukan" : "Belum ada data rombel kelas"}
            </div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="glass-card rounded-[22px] border border-slate-200/85 dark:border-slate-800/85 p-4 shadow-sm space-y-3 relative text-left bg-white dark:bg-slate-900/40">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">TINGKAT: {r.tingkat ?? "—"}</span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-tight mt-0.5 truncate">{r.namaKelas}</h4>
                  </div>
                  <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded-full border shrink-0 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30">
                    Kapasitas: {r.kapasitas ? `${siswaCountByKelas.get(r.id) ?? 0} / ${r.kapasitas}` : "—"}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="min-w-0 pr-2">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Wali Kelas</span>
                    {r.waliKelasId ? (
                      <span className="inline-block px-2.5 py-0.5 border border-teal-100 dark:border-teal-900/30 rounded-lg text-[9px] font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 mt-1 truncate max-w-[150px]">
                        {guruMap.get(r.waliKelasId) ?? "—"}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic font-semibold mt-1 block">Belum Ditentukan</span>
                    )}
                  </div>

                  <div className="flex space-x-1.5 items-center shrink-0">
                    <button
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
                      className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(r.id)}
                      className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table (Visible on desktop, hidden on mobile) */}
        <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-150 dark:border-slate-800">
              <TableRow>
                <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Nama Rombel Kelas</TableHead>
                <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Tingkat</TableHead>
                <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Wali Kelas</TableHead>
                <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Kapasitas Siswa</TableHead>
                <TableHead className="text-right w-28 text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold">
                    Tidak ada data kelas ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                    <TableCell className="font-extrabold text-slate-800 dark:text-slate-200">
                      {r.namaKelas}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-slate-550 dark:text-slate-400 font-mono">
                      {r.tingkat ?? "—"}
                    </TableCell>
                    <TableCell>
                      {r.waliKelasId ? (
                        <span className="inline-block px-3 py-1 border border-teal-100 dark:border-teal-900/30 rounded-full text-[10px] font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 uppercase tracking-wide">
                          {guruMap.get(r.waliKelasId) ?? "—"}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold text-xs italic">Belum Ditentukan</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 dark:text-slate-350 text-xs">
                      {r.kapasitas ? `${siswaCountByKelas.get(r.id) ?? 0} / ${r.kapasitas} Siswa` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger
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
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-900/30 transition-all shadow-xs cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipPositioner>
                              <TooltipPopup>Edit Kelas</TooltipPopup>
                            </TooltipPositioner>
                          </TooltipPortal>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            onClick={() => setDeleteId(r.id)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/30 transition-all shadow-xs cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipPositioner>
                              <TooltipPopup>Hapus Kelas</TooltipPopup>
                            </TooltipPositioner>
                          </TooltipPortal>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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
    </>
  )
}
