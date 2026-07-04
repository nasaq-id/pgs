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

  // Memo for selected class filter label to fix Radix/Base UI select trigger value display bugs
  const selectedKelasFilterLabel = useMemo(() => {
    if (kelasFilter === "all") return "Semua Kelas"
    const k = kelasList?.find((kl) => kl.id === kelasFilter)
    return k ? k.namaKelas : "Semua Kelas"
  }, [kelasFilter, kelasList])

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
              {guruStats.map((stat) => (
                <Card
                  key={stat.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${stat.isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    setAdminGuruFilter(stat.isSelected ? null : stat.id)
                    setKelasFilter("all")
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{stat.nama}</p>
                      {stat.nip && <p className="text-xs text-muted-foreground truncate">{stat.nip}</p>}
                    </div>
                    {stat.status === "complete" && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                    {stat.status === "partial" && <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />}
                    {stat.status === "none" && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                    {stat.status === "nojadwal" && <Clock className="h-5 w-5 text-muted-foreground shrink-0" />}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Jadwal</span>
                      <span className="font-medium">{stat.jadwalCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Selesai</span>
                      <span className="font-medium text-emerald-600">{stat.selesaiCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Draft</span>
                      <span className="font-medium text-amber-600">{stat.draftCount}</span>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stat.status === "complete" ? "bg-emerald-500" : stat.status === "partial" ? "bg-amber-500" : stat.status === "none" ? "bg-red-500" : "bg-muted-foreground/20"}`}
                      style={{ width: stat.jadwalCount > 0 ? `${Math.round((stat.selesaiCount / stat.jadwalCount) * 100)}%` : "0%" }}
                    />
                  </div>

                  {stat.jadwalCount > 0 && stat.totalJurnal < stat.jadwalCount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full h-7 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateJurnal(stat.id)
                      }}
                      disabled={generateJurnal.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 ${generateJurnal.isPending ? "animate-spin" : ""}`} />
                      Generate
                    </Button>
                  )}
                </Card>
              ))}
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

      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
          <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Semua Kelas">{selectedKelasFilterLabel || "Semua Kelas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasList?.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="h-9 w-[160px]" />
          </div>

          <div className="relative sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari jurnal..." className="pl-9 h-9 w-[200px]" />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Tidak ada jurnal</h3>
            <p className="text-sm text-muted-foreground">Belum ada jurnal untuk filter yang dipilih.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((j) => (
            <Card key={j.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base truncate">{j.judulJurnal || "Tanpa Judul"}</h3>
                    <Badge variant={j.status === "selesai" ? "default" : "secondary"} className="text-xs">
                      {j.status === "selesai" ? "Selesai" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{fmtDate(j.tanggal)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />{fmtTime(j.jamMulai)} - {fmtTime(j.jamSelesai)}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" />}>
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditItem(j); setFormOpen(true) }}>
                      <Pencil className="h-4 w-4 mr-2" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteId(j.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
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
