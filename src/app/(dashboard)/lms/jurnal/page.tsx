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
import { Plus, Search, BookOpen, MoreVertical, Pencil, Trash2, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Users } from "lucide-react"
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

  // Auto-generate Jurnal harian jika log-in sebagai guru
  useEffect(() => {
    if (isGuru && currentGuruId && !hasGenerated) {
      setHasGenerated(true)
      generateJurnal.mutate({
        guruId: currentGuruId,
        tanggal: new Date(),
      })
    }
  }, [currentGuruId, isGuru, hasGenerated])

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
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Jurnal Mengajar</h2>
          <p className="text-muted-foreground">Kelola jurnal mengajar harian</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditItem(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Buat Jurnal
        </Button>
      </div>

      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Monitoring Guru &mdash; {fmtDate(selectedDate)}</h3>
          </div>

          {guruStats.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {guruStats.map((stat) => {
                const borderLeftClass = {
                  complete: "border-l-4 border-l-emerald-500 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.06)]",
                  partial: "border-l-4 border-l-amber-500 shadow-[0_4px_20px_-2px_rgba(245,158,11,0.06)]",
                  none: "border-l-4 border-l-rose-500 shadow-[0_4px_20px_-2px_rgba(244,63,94,0.06)]",
                  nojadwal: "border-l-4 border-l-slate-300 dark:border-l-slate-700",
                }[stat.status as "complete" | "partial" | "none" | "nojadwal"] || ""

                const isSelectedClass = stat.isSelected
                  ? "ring-2 ring-[hsl(142_72%_40%)] border-transparent bg-gradient-to-br from-card to-emerald-50/10 dark:to-emerald-950/5 scale-[1.01]"
                  : "hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"

                return (
                  <Card
                    key={stat.id}
                    className={`p-4 cursor-pointer transition-all duration-300 rounded-2xl bg-card border border-border/50 ${borderLeftClass} ${isSelectedClass}`}
                    onClick={() => {
                      setAdminGuruFilter(stat.isSelected ? null : stat.id)
                      setKelasFilter("all")
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-foreground truncate">{stat.nama}</p>
                        {stat.nip && <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{stat.nip}</p>}
                      </div>
                      {stat.status === "complete" && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 text-[10px] h-5 px-1.5 font-semibold dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                          Lengkap
                        </Badge>
                      )}
                      {stat.status === "partial" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50 text-[10px] h-5 px-1.5 font-semibold dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                          Sebagian
                        </Badge>
                      )}
                      {stat.status === "none" && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 text-[10px] h-5 px-1.5 font-semibold dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50">
                          Kosong
                        </Badge>
                      )}
                      {stat.status === "nojadwal" && (
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-50 text-[10px] h-5 px-1.5 font-medium dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                          Libur
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-1 divide-x divide-border/40 text-center bg-muted/20 dark:bg-muted/5 py-1.5 rounded-xl border border-border/30">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Jadwal</p>
                        <p className="font-bold text-xs text-foreground mt-0.5">{stat.jadwalCount}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Selesai</p>
                        <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{stat.selesaiCount}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Draft</p>
                        <p className="font-bold text-xs text-amber-600 dark:text-amber-400 mt-0.5">{stat.draftCount}</p>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>Progress Input</span>
                        <span>{stat.jadwalCount > 0 ? `${Math.round((stat.selesaiCount / stat.jadwalCount) * 100)}%` : "0%"}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stat.status === "complete" ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                            stat.status === "partial" ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
                            stat.status === "none" ? "bg-gradient-to-r from-rose-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" :
                            "bg-muted-foreground/20"
                          }`}
                          style={{ width: stat.jadwalCount > 0 ? `${Math.round((stat.selesaiCount / stat.jadwalCount) * 100)}%` : "0%" }}
                        />
                      </div>
                    </div>

                    {stat.jadwalCount > 0 && stat.totalJurnal < stat.jadwalCount && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3.5 w-full h-8 text-[11px] font-semibold gap-1.5 rounded-xl border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all bg-emerald-50/30 dark:bg-emerald-950/10 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerateJurnal(stat.id)
                        }}
                        disabled={generateJurnal.isPending}
                      >
                        <RefreshCw className={`h-3 w-3 ${generateJurnal.isPending ? "animate-spin" : ""}`} />
                        Generate Jurnal
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          )}

          {adminGuruFilter && selectedGuru && (
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Menampilkan jurnal untuk:</span>
                  <span className="font-semibold">{selectedGuru.namaLengkap}</span>
                  <Badge variant="outline" className="text-xs">{fmtDate(selectedDate)}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAdminGuruFilter(null)}>
                    Tampilkan Semua
                  </Button>
                  <Button size="sm" variant="default" onClick={() => { setEditItem(null); setFormOpen(true) }}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Jurnal
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <Card className="p-3 bg-card border border-border/50 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
          <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v ?? "all")}>
            <SelectTrigger className="w-[200px] h-9 rounded-xl">
              <SelectValue placeholder="Semua Kelas">{selectedKelasFilterLabel || "Semua Kelas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasList?.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.tingkat ?? ""} - {k.namaKelas}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex items-center gap-2 bg-muted/10 border border-border/60 rounded-xl px-2.5 h-9">
            <Calendar className="h-4 w-4 text-muted-foreground/80" />
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="h-full border-none shadow-none focus-visible:ring-0 p-0 w-[130px] bg-transparent" />
          </div>

          <div className="relative sm:ml-auto w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul jurnal..." className="pl-9.5 h-9 rounded-xl w-full" />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3.5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 border-dashed border-2 border-border/60 rounded-2xl shadow-none bg-muted/5">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/65 flex items-center justify-center mb-4 border border-border/20">
              <BookOpen className="h-7 w-7 text-muted-foreground/75" />
            </div>
            <h3 className="text-lg font-bold mb-1.5 text-foreground">Tidak Ada Jurnal</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Belum ada jurnal mengajar harian yang terinput atau cocok dengan filter hari ini.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((j) => {
            const cls = kelasMap.get(j.kelasId)
            const mapel = mapelMap.get(j.mataPelajaranId)
            const guruRec = guruMap.get(j.guruId)

            const classLabel = cls ? `${cls.tingkat ?? ""} - ${cls.namaKelas}` : "-"
            const mapelLabel = mapel ? mapel.namaMapel : "-"
            const guruLabel = guruRec ? guruRec.namaLengkap : "-"

            const leftBorder = j.status === "selesai"
              ? "border-l-4 border-l-emerald-500 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.04)]"
              : "border-l-4 border-l-amber-500 shadow-[0_4px_20px_-2px_rgba(245,158,11,0.04)]"

            return (
              <Card key={j.id} className={`p-5 transition-all duration-300 rounded-2xl bg-card border border-border/50 hover:shadow-md hover:-translate-y-0.5 ${leftBorder}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Badges metadata */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant="outline" className="bg-blue-50/50 text-blue-600 border-blue-100/80 hover:bg-blue-50/50 text-[10px] h-5 px-2 rounded-lg font-medium dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50">
                        {classLabel}
                      </Badge>
                      <Badge variant="outline" className="bg-violet-50/50 text-violet-600 border-violet-100/80 hover:bg-violet-50/50 text-[10px] h-5 px-2 rounded-lg font-medium dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/50">
                        {mapelLabel}
                      </Badge>
                      {isAdmin && (
                        <Badge variant="outline" className="bg-orange-50/50 text-orange-600 border-orange-100/80 hover:bg-orange-50/50 text-[10px] h-5 px-2 rounded-lg font-medium dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50">
                          Guru: {guruLabel}
                        </Badge>
                      )}
                    </div>

                    {/* Title & Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base text-foreground tracking-tight leading-snug">
                        {j.judulJurnal || "Tanpa Judul"}
                      </h4>
                      {j.status === "selesai" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">
                          Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/40">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Content Preview if available */}
                    {(j.materiKonten || j.tujuanPembelajaran) && (
                      <div className="text-xs text-muted-foreground bg-muted/20 dark:bg-muted/5 p-3 rounded-xl border border-border/40 space-y-1">
                        {j.tujuanPembelajaran && (
                          <p className="line-clamp-1"><strong className="text-foreground/80">Tujuan:</strong> {j.tujuanPembelajaran}</p>
                        )}
                        {j.materiKonten && (
                          <p className="line-clamp-1"><strong className="text-foreground/80">Materi:</strong> {j.materiKonten}</p>
                        )}
                      </div>
                    )}

                    {/* Bottom row (meta dates) */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" /> {fmtDate(j.tanggal)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/70" /> {fmtTime(j.jamMulai)} - {fmtTime(j.jamSelesai)}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-xl flex-shrink-0" />}>
                      <MoreVertical className="h-4 w-4" />
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
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
