"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Plus, Pencil, Trash2, Loader2, Search, BarChart2, Printer,
  Layers, Users, AlertCircle, CheckCircle
} from "lucide-react"
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
import { useOptimisticRemove } from "@/hooks/useOptimisticRemove"
import KelasFormDialog, { type KelasFormData } from "@/components/kelas/KelasFormDialog"
import LaporanKelasDialog from "@/components/sarpras/LaporanKelasDialog"
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
  const [showRekap, setShowRekap] = useState(false)
  const [laporanOpen, setLaporanOpen] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<KelasFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: kelasList, isLoading } = api.kelas.getAll.useQuery({ search })
  const { data: guruList } = api.guru.getAll.useQuery({})
  const { data: siswaList } = api.siswa.getAll.useQuery({})
  const { data: profile } = api.profil.getProfile.useQuery()
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
    ...useOptimisticRemove({ queryKey: [["kelas", "getAll"]] }),
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
  const totalSiswaCount = siswaList?.length ?? 0

  // Calculate per class stats (L, P, Total)
  const kelasStatsMap = new Map<string, { count: number; laki: number; perempuan: number }>()
  let siswaTerbagiCount = 0

  if (siswaList) {
    for (const s of siswaList as any[]) {
      if (s.kelasId) {
        siswaTerbagiCount++
        const curr = kelasStatsMap.get(s.kelasId) || { count: 0, laki: 0, perempuan: 0 }
        curr.count += 1
        if (s.jenisKelamin === "L") curr.laki += 1
        else if (s.jenisKelamin === "P") curr.perempuan += 1
        kelasStatsMap.set(s.kelasId, curr)
      }
    }
  }

  const siswaBelumMasukKelasCount = Math.max(0, totalSiswaCount - siswaTerbagiCount)

  let totalRekapL = 0
  let totalRekapP = 0
  records.forEach((r) => {
    const st = kelasStatsMap.get(r.id) || { count: 0, laki: 0, perempuan: 0 }
    totalRekapL += st.laki
    totalRekapP += st.perempuan
  })
  const totalRekapAll = totalRekapL + totalRekapP

  const sekolahInfo = profile?.sekolah ? {
    namaSekolah: (profile.sekolah as any)?.nama,
    yayasan: (profile.sekolah as any)?.yayasan,
    alamat: (profile.sekolah as any)?.alamat,
    akreditasi: (profile.sekolah as any)?.akreditasi,
    email: (profile.sekolah as any)?.email,
  } : null

  return (
    <>
      <div className="neumo-card bg-background rounded-[26px] p-5 md:p-6 mb-6 space-y-5 text-left">
        {/* Action Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Cari kelas berdasarkan nama atau tingkat..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="button" variant="secondary" className="h-10 px-4">
              Cari
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Rekap & Statistik Toggle Button */}
            <button
              type="button"
              onClick={() => setShowRekap(!showRekap)}
              className="px-4 py-2.5 rounded-2xl neumo-sm bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
            >
              <BarChart2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>{showRekap ? "Tutup Rekap" : "Rekap & Statistik"}</span>
            </button>

            {/* Laporan Kelas PDF Export Button */}
            <button
              type="button"
              onClick={() => setLaporanOpen(true)}
              className="px-4 py-2.5 rounded-2xl neumo-sm bg-background text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
            >
              <Printer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Laporan Kelas</span>
            </button>

            {/* Tambah Kelas Button */}
            <button
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
              style={{
                boxShadow: "4px 4px 10px oklch(0.70 0.08 175 / 0.5), -3px -3px 8px oklch(1 0 0)",
              }}
              onClick={() => {
                setEditData(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Tambah Kelas</span>
            </button>
          </div>
        </div>

        {/* Rekap & Statistik Collapsible Section */}
        {showRekap && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 animate-in fade-in-50 duration-300">
            {/* Left Column: Metric Cards */}
            <div className="lg:col-span-4 space-y-3">
              {/* TOTAL KELAS */}
              <div className="neumo-card p-4 rounded-2xl flex items-center gap-4 bg-background">
                <div className="w-11 h-11 rounded-2xl neumo-inset bg-background flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">TOTAL KELAS</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100">{records.length} Rombel</span>
                </div>
              </div>

              {/* SISWA TERBAGI KELAS */}
              <div className="neumo-card p-4 rounded-2xl flex items-center gap-4 bg-background">
                <div className="w-11 h-11 rounded-2xl neumo-inset bg-background flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SISWA TERBAGI KELAS</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100">{siswaTerbagiCount} / {totalSiswaCount} Siswa</span>
                </div>
              </div>

              {/* BELUM MASUK KELAS */}
              <div className="neumo-card p-4 rounded-2xl flex items-center gap-4 bg-background">
                <div className="w-11 h-11 rounded-2xl neumo-inset bg-background flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">BELUM MASUK KELAS</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100">{siswaBelumMasukKelasCount} Siswa</span>
                </div>
              </div>
            </div>

            {/* Right Column: REKAPITULASI SISWA PER KELAS Table */}
            <div className="lg:col-span-8 neumo-card p-4 rounded-2xl bg-background space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    REKAPITULASI SISWA PER KELAS
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Total Siswa: {totalSiswaCount}</span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="neumo-inset bg-background/50">
                    <TableRow className="border-b border-slate-150 dark:border-slate-800">
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase py-2">KELAS</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase text-center py-2">L (LAKI-LAKI)</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase text-center py-2">P (PEREMPUAN)</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-400 uppercase text-center py-2">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-xs text-slate-400">
                          Belum ada data kelas
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((r) => {
                        const st = kelasStatsMap.get(r.id) || { count: 0, laki: 0, perempuan: 0 }
                        return (
                          <TableRow key={r.id} className="border-b border-slate-100/60 dark:border-slate-800/40 last:border-0 text-xs py-1.5">
                            <TableCell className="font-bold text-slate-800 dark:text-slate-200 py-1.5">{r.namaKelas}</TableCell>
                            <TableCell className="text-center font-extrabold text-blue-600 dark:text-blue-400 py-1.5">{st.laki}</TableCell>
                            <TableCell className="text-center font-extrabold text-rose-600 dark:text-rose-400 py-1.5">{st.perempuan}</TableCell>
                            <TableCell className="text-center font-black text-slate-800 dark:text-slate-100 py-1.5">{st.count}</TableCell>
                          </TableRow>
                        )
                      })
                    )}
                    <TableRow className="neumo-inset bg-background/50 font-black text-xs">
                      <TableCell className="text-slate-800 dark:text-slate-100 py-2">Total Siswa</TableCell>
                      <TableCell className="text-center text-blue-600 dark:text-blue-400 py-2">{totalRekapL}</TableCell>
                      <TableCell className="text-center text-rose-600 dark:text-rose-400 py-2">{totalRekapP}</TableCell>
                      <TableCell className="text-center text-slate-900 dark:text-slate-100 py-2">{totalRekapAll}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Mobile View: Card List */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="neumo-card rounded-[22px] p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))
          ) : records.length === 0 ? (
            <div className="neumo-inset bg-background rounded-[22px] p-8 text-center text-slate-400 font-semibold">
              {search ? "Tidak ditemukan" : "Belum ada data rombel kelas"}
            </div>
          ) : (
            records.map((r) => {
              const st = kelasStatsMap.get(r.id) || { count: 0, laki: 0, perempuan: 0 }
              const cap = r.kapasitas || 32
              const pct = Math.min(100, Math.round((st.count / cap) * 100))

              return (
                <div key={r.id} className="neumo-card bg-background rounded-[22px] p-4 space-y-3 relative text-left">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/50">
                        {r.tingkat ? `KELAS ${r.tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "")}` : "UMUM"}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-tight mt-1.5 truncate">{r.namaKelas}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">{st.count} / {cap} Siswa</span>
                      <span className="text-[9px] text-slate-400 font-bold">{pct}% Kapasitas</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Wali Kelas</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate max-w-[150px]">
                        {r.waliKelasId ? guruMap.get(r.waliKelasId) ?? "—" : "Belum Ditentukan"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
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
                        className="px-2.5 py-1.5 neumo-sm bg-background hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        className="px-2.5 py-1.5 neumo-sm bg-background hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block neumo-card bg-background rounded-[22px] overflow-x-auto">
          <Table>
            <TableHeader className="neumo-inset bg-background/50">
              <TableRow className="border-b border-slate-100 dark:border-slate-800/60">
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">TINGKAT</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">NAMA KELAS (ROMBEL)</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">WALI KELAS</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">KAPASITAS & SISWA</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">RASIO L/P</TableHead>
                <TableHead className="text-right w-24 text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold">
                    Tidak ada data kelas ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => {
                  const st = kelasStatsMap.get(r.id) || { count: 0, laki: 0, perempuan: 0 }
                  const cap = r.kapasitas || 32
                  const pct = Math.min(100, Math.round((st.count / cap) * 100))

                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100/60 dark:border-slate-800/40 last:border-0">
                      <TableCell>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/50">
                          {r.tingkat ? `KELAS ${r.tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "")}` : "UMUM"}
                        </span>
                      </TableCell>
                      <TableCell className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                        {r.namaKelas}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.waliKelasId ? (
                          <span className="text-slate-700 dark:text-slate-300 font-semibold">
                            {guruMap.get(r.waliKelasId) ?? "—"}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-[180px]">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-700 dark:text-slate-300">{st.count} / {cap} Siswa</span>
                            <span className="text-[10px] font-extrabold text-slate-400">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full neumo-inset bg-background rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-black">
                          <span className="text-blue-600 dark:text-blue-400">L:{st.laki}</span>
                          <span className="text-rose-600 dark:text-rose-400">P:{st.perempuan}</span>
                        </div>
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
                              className="w-8 h-8 rounded-xl neumo-sm flex items-center justify-center bg-background hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all cursor-pointer"
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
                              className="w-8 h-8 rounded-xl neumo-sm flex items-center justify-center bg-background hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Forms & Dialogs */}
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

      <LaporanKelasDialog
        open={laporanOpen}
        onClose={() => setLaporanOpen(false)}
        kelasList={records}
        siswaList={(siswaList ?? []) as any}
        sekolahInfo={sekolahInfo}
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
