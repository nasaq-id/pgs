"use client"

import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, BookOpen, MoreVertical, Pencil, Trash2, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Users, ClipboardList, Activity } from "lucide-react"
import { toast } from "sonner"
import JurnalFormDialog from "@/components/jurnal/JurnalFormDialog"

export default function JurnalMengajarPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "super_admin" || session?.user?.role === "admin_sekolah"
  const isGuru = session?.user?.role === "guru"

  const [kelasFilter, setKelasFilter] = useState("all")
  const [tanggal, setTanggal] = useState("")
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [adminGuruFilter, setAdminGuruFilter] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  useEffect(() => {
    setTanggal(new Date().toISOString().split("T")[0])
  }, [])

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: guruListAll } = api.guru.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })

  const kelasMap = useMemo(() => new Map((kelasList ?? []).map((k) => [k.id, k])), [kelasList])
  const mapelMap = useMemo(() => new Map((mapelList ?? []).map((m) => [m.id, m])), [mapelList])
  const guruMap = useMemo(() => new Map((guruListAll ?? []).map((g) => [g.id, g])), [guruListAll])

  // Memo for selected class filter label to fix Radix/Base UI select trigger value display bugs
  const selectedKelasFilterLabel = useMemo(() => {
    if (kelasFilter === "all") return "Semua Kelas"
    const k = kelasMap.get(kelasFilter)
    return k ? `${k.tingkat ?? ""} - ${k.namaKelas}` : "Semua Kelas"
  }, [kelasFilter, kelasMap])

  const { data: currentGuru } = api.lms.getCurrentGuru.useQuery(undefined, {
    enabled: isGuru,
  })
  const currentGuruId = currentGuru?.id

  const { data: jurnalList, isLoading } = api.lms.getJurnal.useQuery({
    kelasId: kelasFilter !== "all" ? kelasFilter : undefined,
    guruId: adminGuruFilter || currentGuruId || undefined,
    tanggal: tanggal ? new Date(tanggal + "T00:00:00") : undefined,
  }, {
    enabled: tanggal !== "",
  })

  const deleteJurnal = api.lms.deleteJurnal.useMutation()
  const utils = api.useUtils()

  const hariList = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
  const selectedDate = tanggal ? new Date(tanggal + "T00:00:00") : new Date()
  const hariName = hariList[selectedDate.getDay()]

  const { data: monitoringJurnal } = api.lms.getJurnal.useQuery(
    { tanggal: selectedDate, limit: 500 },
    { enabled: isAdmin && tanggal !== "" },
  )

  const { data: allJadwal } = api.jadwal.getAll.useQuery(
    { hari: hariName as any, limit: 500 },
    { enabled: isAdmin && tanggal !== "" },
  )

  const generateJurnal = api.lms.generateJurnalDariJadwal.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`Berhasil generate ${data.created} jurnal`)
        utils.lms.getJurnal.invalidate()
      }
    },
    onError: () => {
      toast.error("Gagal generate jurnal")
    },
  })

  const generateAllJurnal = api.lms.generateAllJurnalForDay.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`Berhasil generate ${data.created} jurnal untuk semua guru`)
        utils.lms.getJurnal.invalidate()
      }
    },
    onError: () => {
      toast.error("Gagal generate jurnal untuk semua guru")
    },
  })

  // Auto-generate Jurnal harian untuk guru
  useEffect(() => {
    if (isGuru && currentGuruId && !hasGenerated) {
      setHasGenerated(true)
      generateJurnal.mutate({
        guruId: currentGuruId,
        tanggal: new Date(),
      })
    }
  }, [currentGuruId, isGuru, hasGenerated])

  // Auto-generate Jurnal harian untuk semua guru (admin view)
  useEffect(() => {
    if (isAdmin && !hasGenerated && tanggal) {
      setHasGenerated(true)
      generateAllJurnal.mutate({ tanggal: selectedDate })
    }
  }, [isAdmin, hasGenerated, tanggal])

  const guruStats = useMemo(() => {
    if (!isAdmin || !guruListAll || !monitoringJurnal || !allJadwal) return []
    return guruListAll.map((guru: any) => {
      const jadwalCount = allJadwal.filter((j: any) => j.guruId === guru.id).length
      const guruJurnal = monitoringJurnal.filter((j: any) => j.guruId === guru.id)
      const totalJurnal = guruJurnal.length
      const selesaiCount = guruJurnal.filter((j: any) => j.status === "selesai").length
      const draftCount = totalJurnal - selesaiCount

      let status: "complete" | "partial" | "none" | "nojadwal" = "nojadwal"
      if (jadwalCount > 0) {
        if (selesaiCount >= jadwalCount) {
          status = "complete"
        } else if (totalJurnal > 0) {
          status = "partial"
        } else {
          status = "none"
        }
      }

      return {
        id: guru.id,
        nama: guru.namaLengkap,
        nip: guru.nipnuptk,
        jadwalCount,
        totalJurnal,
        selesaiCount,
        draftCount,
        status,
        isSelected: adminGuruFilter === guru.id,
      }
    })
  }, [isAdmin, guruListAll, monitoringJurnal, allJadwal, adminGuruFilter])

  const filtered = (jurnalList || []).filter((j: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (j.judulJurnal || "").toLowerCase().includes(q)
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteJurnal.mutateAsync({ id: deleteId })
      toast.success("Jurnal berhasil dihapus")
      setDeleteId(null)
    } catch {
      toast.error("Gagal menghapus jurnal")
    }
  }

  const handleGenerateJurnal = async (guruId: string) => {
    try {
      await generateJurnal.mutateAsync({ guruId, tanggal: selectedDate })
    } catch {}
  }

  const fmtTime = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  const fmtDate = (d: Date | string) => {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  const selectedGuru = adminGuruFilter
    ? guruListAll?.find((g: any) => g.id === adminGuruFilter)
    : null

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Learning Management System (LMS)</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Jurnal Mengajar</h2>
          <p className="text-muted-foreground text-xs mt-1">Kelola jurnal mengajar harian</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shrink-0">
          <Calendar className="h-4 w-4 text-slate-450 dark:text-slate-500" />
          <input
            type="date"
            lang="id-ID"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none w-[130px] cursor-pointer"
          />
          <span className="text-[10px] font-black px-2 py-0.5 bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-lg uppercase">{hariName}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-5">
          {/* Stat Widgets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 flex items-center justify-between bg-white dark:bg-slate-900/40 shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Mengajar</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 block">{monitoringJurnal?.length ?? 0}</span>
              </div>
              <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/40 rounded-xl flex items-center justify-center text-teal-650 dark:text-teal-400">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 flex items-center justify-between bg-white dark:bg-slate-900/40 shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jurnal Terisi</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{monitoringJurnal?.filter((j: any) => j.status === "selesai").length ?? 0}</span>
              </div>
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 flex items-center justify-between bg-white dark:bg-slate-900/40 shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Belum Terisi</span>
                <span className="text-2xl font-black text-rose-500 dark:text-rose-400 block">{monitoringJurnal?.filter((j: any) => j.status !== "selesai").length ?? 0}</span>
              </div>
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-500 dark:text-rose-450">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 flex items-center justify-between bg-white dark:bg-slate-900/40 shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Kepatuhan Guru</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 block">
                  {monitoringJurnal && monitoringJurnal.length > 0
                    ? Math.round((monitoringJurnal.filter((j: any) => j.status === "selesai").length / monitoringJurnal.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Monitoring Guru &mdash; {fmtDate(selectedDate)}</h3>
          </div>

          {guruStats.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {guruStats.map((stat) => {
                const borderLeftClass = {
                  complete: "border-l-4 border-l-emerald-500 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.04)]",
                  partial: "border-l-4 border-l-amber-500 shadow-[0_4px_20px_-2px_rgba(245,158,11,0.04)]",
                  none: "border-l-4 border-l-rose-500 shadow-[0_4px_20px_-2px_rgba(244,63,94,0.04)]",
                  nojadwal: "border-l-4 border-l-slate-300 dark:border-l-slate-700",
                }[stat.status as "complete" | "partial" | "none" | "nojadwal"] || ""

                const isSelectedClass = stat.isSelected
                  ? "ring-2 ring-teal-500 border-transparent bg-slate-50/40 dark:bg-slate-900/50 scale-[1.01]"
                  : "hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-750"

                return (
                  <div
                    key={stat.id}
                    className={`p-4 cursor-pointer transition-all duration-300 rounded-[22px] bg-white dark:bg-slate-900/40 border border-slate-200/85 dark:border-slate-800/85 ${borderLeftClass} ${isSelectedClass}`}
                    onClick={() => {
                      setAdminGuruFilter(stat.isSelected ? null : stat.id)
                      setKelasFilter("all")
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 truncate">{stat.nama}</p>
                        {stat.nip && <p className="text-[10px] text-slate-400 truncate font-mono mt-1">{stat.nip}</p>}
                      </div>
                      {stat.status === "complete" && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/85 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 shrink-0">
                          Lengkap
                        </span>
                      )}
                      {stat.status === "partial" && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100/85 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 shrink-0">
                          Sebagian
                        </span>
                      )}
                      {stat.status === "none" && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-100/85 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50 shrink-0">
                          Kosong
                        </span>
                      )}
                      {stat.status === "nojadwal" && (
                        <span className="bg-slate-50 text-slate-500 border border-slate-100/85 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 shrink-0">
                          Libur
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-1 divide-x divide-slate-100 dark:divide-slate-800/40 text-center bg-slate-50 dark:bg-slate-900/40 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Jadwal</p>
                        <p className="font-extrabold text-xs text-slate-700 dark:text-slate-200 mt-0.5">{stat.jadwalCount}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-wider">Selesai</p>
                        <p className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{stat.selesaiCount}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-455 dark:text-slate-550 uppercase font-black tracking-wider">Draft</p>
                        <p className="font-extrabold text-xs text-amber-600 dark:text-amber-400 mt-0.5">{stat.draftCount}</p>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        <span>Progress Input</span>
                        <span>{stat.jadwalCount > 0 ? `${Math.round((stat.selesaiCount / stat.jadwalCount) * 100)}%` : "0%"}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800/30">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stat.status === "complete" ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                            stat.status === "partial" ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
                            stat.status === "none" ? "bg-gradient-to-r from-rose-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" :
                            "bg-slate-350 dark:bg-slate-700"
                          }`}
                          style={{ width: stat.jadwalCount > 0 ? `${Math.round((stat.selesaiCount / stat.jadwalCount) * 100)}%` : "0%" }}
                        />
                      </div>
                    </div>

                    {stat.jadwalCount > 0 && stat.totalJurnal < stat.jadwalCount && (
                      <button
                        type="button"
                        className="mt-3.5 w-full h-8 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl border border-teal-500/25 text-teal-600 dark:text-teal-400 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 dark:hover:text-white transition-all bg-teal-50/30 dark:bg-teal-950/10 cursor-pointer flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerateJurnal(stat.id)
                        }}
                        disabled={generateJurnal.isPending}
                      >
                        <RefreshCw className={`h-3 w-3 ${generateJurnal.isPending ? "animate-spin" : ""}`} />
                        <span>Generate Jurnal</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {adminGuruFilter && selectedGuru && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between flex-wrap gap-2 text-left">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-450 dark:text-slate-500 font-bold">Menampilkan jurnal untuk:</span>
                  <span className="font-extrabold text-slate-750 dark:text-slate-250">{selectedGuru.namaLengkap}</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">{fmtDate(selectedDate)}</span>
                </div>
                <div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAdminGuruFilter(null)}
                    className="!h-8 !rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Tampilkan Semua
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-4 md:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
          <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[200px] !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
              <SelectValue placeholder="Semua Kelas">{selectedKelasFilterLabel || "Semua Kelas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasList?.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.tingkat ?? ""} - {k.namaKelas}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative sm:ml-auto w-full sm:w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul jurnal..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900/60 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition-all text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3.5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/65 flex items-center justify-center mb-4 border border-border/20">
            {isGuru ? (
              <CheckCircle2 className="h-7 w-7 text-muted-foreground/75" />
            ) : (
              <BookOpen className="h-7 w-7 text-muted-foreground/75" />
            )}
          </div>
          <h3 className="text-lg font-bold mb-1.5 text-slate-700 dark:text-slate-300">
            {isGuru ? "Alhamdulillah, Tidak Ada Jadwal" : "Tidak Ada Jurnal"}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm">
            {isGuru
              ? "Tidak ada jadwal mengajar untuk hari ini. Silakan hubungi admin jika seharusnya ada."
              : "Belum ada jurnal mengajar harian yang terinput atau cocok dengan filter hari ini."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((j) => {
            const cls = kelasMap.get(j.kelasId)
            const mapel = mapelMap.get(j.mataPelajaranId)
            const guruRec = guruMap.get(j.guruId)

            const classLabel = cls ? `${cls.tingkat ?? ""} - ${cls.namaKelas}` : "-"
            const mapelLabel = mapel ? mapel.namaMapel : "-"
            const guruLabel = guruRec ? guruRec.namaLengkap : "-"

            const isFilled = j.status === "selesai"

            return (
              <Card key={j.id} className={`p-5 transition-all duration-300 rounded-[22px] bg-white dark:bg-slate-900/40 border border-slate-200/85 dark:border-slate-800/85 hover:shadow-lg hover:-translate-y-0.5 ${isFilled ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-500"}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isFilled ? "bg-emerald-500 border-emerald-500 text-white" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"}`}>
                    {isFilled ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Badges metadata */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="bg-blue-50/60 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/40 text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">
                        {classLabel}
                      </span>
                      <span className="bg-violet-50/60 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border border-violet-100/60 dark:border-violet-900/40 text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">
                        {mapelLabel}
                      </span>
                      {isAdmin && (
                        <span className="bg-orange-50/60 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100/60 dark:border-orange-900/40 text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">
                          Guru: {guruLabel}
                        </span>
                      )}
                    </div>

                    {/* Title & Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-250 tracking-tight leading-snug">
                        {j.judulJurnal || "Tanpa Judul"}
                      </h4>
                      {j.status === "selesai" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">
                          Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/40">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Content Preview if available */}
                    {(j.materiKonten || j.tujuanPembelajaran) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-1">
                        {j.tujuanPembelajaran && (
                          <p className="line-clamp-1"><strong className="text-slate-700 dark:text-slate-300">Tujuan:</strong> {j.tujuanPembelajaran}</p>
                        )}
                        {j.materiKonten && (
                          <p className="line-clamp-1"><strong className="text-slate-700 dark:text-slate-300">Materi:</strong> {j.materiKonten}</p>
                        )}
                      </div>
                    )}

                    {/* Bottom row (meta dates) */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-450 dark:text-slate-500 pt-1 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> {fmtDate(j.tanggal)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {fmtTime(j.jamMulai)} - {fmtTime(j.jamSelesai)}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl flex items-center justify-center cursor-pointer shadow-sm flex-shrink-0" />}>
                      <MoreVertical className="h-4 w-4 text-slate-405" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={() => { setEditItem(j); setFormOpen(true) }} className="gap-2">
                        <Pencil className="h-4 w-4 text-muted-foreground" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(j.id)} className="text-destructive gap-2">
                        <Trash2 className="h-4 w-4" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <JurnalFormDialog
        open={formOpen}
        item={editItem}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        onSaved={() => {
          setFormOpen(false)
          setEditItem(null)
        }}
        defaultGuruId={isAdmin ? (adminGuruFilter && !editItem ? adminGuruFilter : undefined) : (currentGuruId || undefined)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jurnal?</AlertDialogTitle>
            <AlertDialogDescription>Jurnal yang sudah dihapus tidak bisa dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="!h-10 !rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer bg-rose-600 hover:bg-rose-700 text-white border-none">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
