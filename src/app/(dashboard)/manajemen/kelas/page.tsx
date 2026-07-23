"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, Pencil, Trash2, Loader2, Search, AlertTriangle, GraduationCap, UserCheck, Users, Eye } from "lucide-react"
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
import KelasDetailDialog from "@/components/kelas/KelasDetailDialog"
import { formatKelasLabel, formatTingkatLabel } from "@/components/jadwal/constants"
import { toast } from "sonner"

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
  waliKelasId: string | null
  kapasitas: number | null
  tahunAjaranId: string | null
  siswaCount: number
}

function CapacityIndicator({ count, max }: { count: number; max: number | null }) {
  if (!max) return <span className="text-muted-foreground text-xs italic">Belum diatur</span>

  const percent = Math.min(100, Math.round((count / max) * 100))
  
  let barColorClass = "from-teal-500 to-emerald-400"
  let textColorClass = "text-emerald-600 dark:text-emerald-400"
  let bgColorClass = "bg-emerald-500/10"
  
  if (percent >= 100) {
    barColorClass = "from-rose-500 to-red-400"
    textColorClass = "text-rose-600 dark:text-rose-400 font-extrabold"
    bgColorClass = "bg-rose-500/10"
  } else if (percent >= 85) {
    barColorClass = "from-amber-500 to-yellow-400"
    textColorClass = "text-amber-600 dark:text-amber-400 font-bold"
    bgColorClass = "bg-amber-500/10"
  }

  return (
    <div className="flex flex-col gap-1 w-full max-w-[150px] group/cap">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className={textColorClass}>{count} <span className="text-muted-foreground/75 font-normal">/ {max}</span></span>
        <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${bgColorClass} ${textColorClass} scale-95 origin-right transition-transform group-hover/cap:scale-100`}>{percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/10">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${barColorClass} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function getTingkatTheme(tingkat: string | null) {
  if (!tingkat) {
    return {
      rowClass: "border-l-4 border-l-amber-500 bg-amber-500/[0.03] dark:bg-amber-500/[0.01] hover:bg-amber-500/[0.07] dark:hover:bg-amber-500/[0.03]",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
    }
  }
  
  const num = parseInt(tingkat.replace(/\D/g, ""))
  const code = isNaN(num) ? 1 : ((num - 1) % 6) + 1
  
  switch (code) {
    case 1: // Teal theme (e.g. 1, 7, 10)
      return {
        rowClass: "border-l-4 border-l-teal-500 bg-teal-500/[0.02] dark:bg-teal-500/[0.01] hover:bg-teal-500/[0.05] dark:hover:bg-teal-500/[0.03]",
        badgeClass: "bg-teal-50/80 text-teal-700 border border-teal-500/10 dark:bg-teal-950/30 dark:text-teal-400"
      }
    case 2: // Indigo theme (e.g. 2, 8, 11)
      return {
        rowClass: "border-l-4 border-l-indigo-500 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.01] hover:bg-indigo-500/[0.05] dark:hover:bg-indigo-500/[0.03]",
        badgeClass: "bg-indigo-50/80 text-indigo-700 border border-indigo-500/10 dark:bg-indigo-950/30 dark:text-indigo-400"
      }
    case 3: // Purple theme (e.g. 3, 9, 12)
      return {
        rowClass: "border-l-4 border-l-purple-500 bg-purple-500/[0.02] dark:bg-purple-500/[0.01] hover:bg-purple-500/[0.05] dark:hover:bg-purple-500/[0.03]",
        badgeClass: "bg-purple-50/80 text-purple-700 border border-purple-500/10 dark:bg-purple-950/30 dark:text-purple-400"
      }
    case 4: // Rose theme (e.g. 4)
      return {
        rowClass: "border-l-4 border-l-rose-500 bg-rose-500/[0.02] dark:bg-rose-500/[0.01] hover:bg-rose-500/[0.05] dark:hover:bg-rose-500/[0.03]",
        badgeClass: "bg-rose-50/80 text-rose-700 border border-rose-500/10 dark:bg-rose-950/30 dark:text-rose-400"
      }
    case 5: // Amber theme (e.g. 5)
      return {
        rowClass: "border-l-4 border-l-amber-500 bg-amber-500/[0.02] dark:bg-amber-500/[0.01] hover:bg-amber-500/[0.05] dark:hover:bg-amber-500/[0.03]",
        badgeClass: "bg-amber-50/80 text-amber-700 border border-amber-500/10 dark:bg-amber-950/30 dark:text-amber-400"
      }
    case 6: // Sky theme (e.g. 6)
    default:
      return {
        rowClass: "border-l-4 border-l-sky-500 bg-sky-500/[0.02] dark:bg-sky-500/[0.01] hover:bg-sky-500/[0.05] dark:hover:bg-sky-500/[0.03]",
        badgeClass: "bg-sky-50/80 text-sky-700 border border-sky-500/10 dark:bg-sky-950/30 dark:text-sky-400"
      }
  }
}

export default function KelasPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<KelasFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: kelasList, isLoading } = api.kelas.getAll.useQuery({ search })
  const { data: guruList } = api.guru.getAll.useQuery({})
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
  const records = (kelasList ?? []) as KelasRecord[]
  const recordsWithoutTingkat = records.filter((r) => !r.tingkat)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Rombongan Belajar</h2>
        <p className="text-muted-foreground">Kelola data rombongan belajar</p>
      </div>

      {recordsWithoutTingkat.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">{recordsWithoutTingkat.length} kelas belum memiliki tingkat</p>
            <p className="mt-1">
              Data kelas yang sudah ada sebelumnya harus diperbarui agar sesuai dengan struktur baru.
              Klik ikon <strong>Edit</strong> pada baris yang ditandai untuk memilih tingkat dan menyesuaikan nama kelas (misal: "7a" → tingkat <strong>7</strong>, nama kelas <strong>A</strong>).
            </p>
          </div>
        </div>
      )}

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
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-100/60 dark:bg-slate-800/40" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 dark:from-teal-500/5 dark:to-emerald-500/5 flex items-center justify-center text-teal-500 dark:text-teal-400 mb-4 shadow-sm border border-teal-500/10">
              <GraduationCap className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
              {search ? "Pencarian Tidak Ditemukan" : "Belum Ada Data Rombel"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {search
                ? `Tidak ditemukan hasil untuk kata kunci "${search}". Coba cari kata kunci kelas atau tingkatan lain.`
                : "Rombongan belajar digunakan untuk mengelompokkan siswa berdasarkan tingkat dan kelas akademik. Mulai dengan membuat rombel baru."}
            </p>
            {!search && (
              <Button
                style={{ backgroundColor: "hsl(142 72% 40%)" }}
                onClick={() => {
                  setEditData(null)
                  setFormOpen(true)
                }}
                className="gap-2 shadow-md shadow-emerald-500/10 hover:brightness-105 active:scale-95 transition-all text-white font-semibold"
              >
                <Plus className="h-4 w-4" /> Tambah Rombel Baru
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-border/50">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Nama Kelas</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Tingkat</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Wali Kelas</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Kapasitas Kelas</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const theme = getTingkatTheme(r.tingkat)
                  return (
                    <TableRow key={r.id} className={`transition-colors ${theme.rowClass}`}>
                      <TableCell className="font-semibold py-3.5">
                        <div className="flex items-center gap-2">
                          {!r.tingkat && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                          <span className="text-slate-800 dark:text-slate-200">
                            {formatKelasLabel({ namaKelas: r.namaKelas, tingkat: r.tingkat })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {!r.tingkat ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${theme.badgeClass}`}>Perlu diatur</span>
                        ) : (
                          <Badge variant="secondary" className={`px-2.5 py-1 border transition-colors font-bold text-xs ${theme.badgeClass}`}>
                            {formatTingkatLabel(r.tingkat)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        {r.waliKelasId ? (
                          <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1.5 w-fit bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 font-semibold border-border">
                            <UserCheck className="h-3 w-3 text-teal-500 dark:text-teal-400" />
                            {guruMap.get(r.waliKelasId) ?? "-"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Belum ditentukan</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <CapacityIndicator count={r.siswaCount ?? 0} max={r.kapasitas} />
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  onClick={() => {
                                    setDetailId(r.id)
                                    setDetailOpen(true)
                                  }}
                                />
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner>
                                <TooltipPopup>Lihat Rombel</TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                                <TooltipPopup>Edit Rombel</TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                  onClick={() => setDeleteId(r.id)}
                                />
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner>
                                <TooltipPopup>Hapus Rombel</TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {records.map((r) => {
              const theme = getTingkatTheme(r.tingkat)
              return (
                <div key={r.id} className={`glass-card rounded-2xl p-4 border border-border/50 relative overflow-hidden transition-all ${theme.rowClass}`}>
                  <div className="flex items-start justify-between mb-3.5">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        {!r.tingkat && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        {formatKelasLabel({ namaKelas: r.namaKelas, tingkat: r.tingkat })}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {!r.tingkat ? (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">Tingkat Perlu diatur</span>
                        ) : (
                          <Badge variant="secondary" className={`px-2 py-0.2 font-extrabold text-[10px] ${theme.badgeClass}`}>
                            {formatTingkatLabel(r.tingkat)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { 
                        setDetailId(r.id)
                        setDetailOpen(true)
                      }} 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Lihat Detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => { 
                        setEditData({ id: r.id, namaKelas: r.namaKelas, tingkat: r.tingkat ?? "", waliKelasId: r.waliKelasId ?? "", kapasitas: r.kapasitas ?? undefined, siswaIds: [] }); 
                        setFormOpen(true) 
                      }} 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setDeleteId(r.id)} 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1">
                  {r.waliKelasId ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <UserCheck className="h-3.5 w-3.5 text-teal-500" />
                      <span className="font-semibold">{guruMap.get(r.waliKelasId) ?? "-"}</span>
                      <span className="text-[10px] text-muted-foreground">(Wali Kelas)</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      Belum ada Wali Kelas
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Kapasitas</span>
                    <CapacityIndicator count={r.siswaCount ?? 0} max={r.kapasitas} />
                  </div>
                  </div>
                </div>
              )
            })}
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

      <KelasDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        kelasId={detailId ?? ""}
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
