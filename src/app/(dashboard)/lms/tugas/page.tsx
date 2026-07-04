"use client"

import { useState, useMemo } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, ClipboardList, MoreVertical, Pencil, Trash2, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"
import TugasFormDialog from "@/components/tugas/TugasFormDialog"

const JENIS_COLORS: Record<string, string> = {
  "Tugas Harian": "bg-blue-500/10 text-blue-700",
  "PR (Pekerjaan Rumah)": "bg-green-500/10 text-green-700",
  "Proyek": "bg-purple-500/10 text-purple-700",
  "Latihan": "bg-orange-500/10 text-orange-700",
  "Ulangan": "bg-red-500/10 text-red-700",
  "Kuis": "bg-cyan-500/10 text-cyan-700",
}

export default function TugasPage() {
  const [kelasFilter, setKelasFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: tugasList, isLoading } = api.lms.getTugas.useQuery({
    kelasId: kelasFilter !== "all" ? kelasFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as "aktif" | "ditutup") : undefined,
  })

  const kelasMap = useMemo(() => new Map((kelasList ?? []).map((k) => [k.id, k])), [kelasList])
  const mapelMap = useMemo(() => new Map((mapelList ?? []).map((m) => [m.id, m])), [mapelList])

  const deleteTugas = api.lms.deleteTugas.useMutation()
  const updateTugas = api.lms.updateTugas.useMutation()

  const filtered = (tugasList || []).filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (t.judulTugas || "").toLowerCase().includes(q)
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteTugas.mutateAsync({ id: deleteId })
      toast.success("Tugas berhasil dihapus")
      setDeleteId(null)
    } catch {
      toast.error("Gagal menghapus tugas")
    }
  }

  const handleStatusChange = async (item: any, status: "aktif" | "ditutup") => {
    try {
      await updateTugas.mutateAsync({ id: item.id, data: { status } })
      toast.success(`Status diubah menjadi "${status}"`)
    } catch {
      toast.error("Gagal mengubah status")
    }
  }

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tugas</h2>
          <p className="text-muted-foreground">Kelola penugasan & pekerjaan rumah siswa</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditItem(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" /> Buat Tugas
        </Button>
      </div>

      <div className="glass-card rounded-2xl p-4 shadow-sm border border-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
          <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px] h-9 rounded-xl">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasList?.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.tingkat ?? ""} - {k.namaKelas}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[160px] h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="ditutup">Ditutup</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative sm:ml-auto w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas..." className="pl-9.5 h-9 rounded-xl w-full" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3.5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card border-dashed border-2 border-border/60 rounded-2xl p-16 flex flex-col items-center justify-center text-center bg-muted/5">
          <div className="h-16 w-16 rounded-2xl bg-muted/65 flex items-center justify-center mb-4 border border-border/20">
            <ClipboardList className="h-7 w-7 text-muted-foreground/75" />
          </div>
          <h3 className="text-lg font-bold mb-1.5 text-foreground">Belum Ada Tugas</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Buat tugas baru untuk memantau pekerjaan rumah siswa dengan tombol di atas.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((t) => {
            const deadlineStr = t.deadline ? new Date(t.deadline).toISOString().split("T")[0] : ""
            const isOverdue = t.status === "aktif" && deadlineStr && deadlineStr < today

            const cls = kelasMap.get(t.kelasId)
            const mapel = mapelMap.get(t.mataPelajaranId)

            const classLabel = cls ? `${cls.tingkat ?? ""} - ${cls.namaKelas}` : "-"
            const mapelLabel = mapel ? mapel.namaMapel : "-"

            const leftBorder = isOverdue
              ? "border-l-4 border-l-rose-500 shadow-[0_4px_20px_-2px_rgba(244,63,94,0.04)]"
              : t.status === "aktif"
                ? "border-l-4 border-l-emerald-500 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.04)]"
                : "border-l-4 border-l-slate-300 dark:border-l-slate-700"

            return (
              <div key={t.id} className={`glass-card rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${leftBorder}`}>
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
                      {t.jenisTugas && (
                        <Badge variant="outline" className={`text-[10px] h-5 px-2 rounded-lg font-semibold border-0 ${JENIS_COLORS[t.jenisTugas] || "bg-muted text-foreground"}`}>
                          {t.jenisTugas}
                        </Badge>
                      )}
                    </div>

                    {/* Title & Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base text-foreground tracking-tight leading-snug">
                        {t.judulTugas}
                      </h4>
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/40">
                          Melewati Deadline
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          t.status === "aktif"
                            ? "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40"
                            : "text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                        }`}>
                          {t.status === "aktif" ? "Aktif" : "Ditutup"}
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    {t.deskripsi && (
                      <p className="text-xs text-muted-foreground bg-muted/20 dark:bg-muted/5 p-3 rounded-xl border border-border/40 line-clamp-2">
                        {t.deskripsi}
                      </p>
                    )}

                    {/* Bottom dates meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" /> Diberikan: {fmtDate(t.tanggalDiberikan)}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${isOverdue ? "text-rose-600 dark:text-rose-400" : ""}`}>
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/70" /> Deadline: {fmtDate(t.deadline)}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted rounded-xl flex-shrink-0" />}>
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => { setEditItem(t); setFormOpen(true) }} className="gap-2">
                        <Pencil className="h-4 w-4 text-muted-foreground" /> Edit
                      </DropdownMenuItem>
                      {t.status === "aktif" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(t, "ditutup")} className="gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" /> Tutup Tugas
                        </DropdownMenuItem>
                      )}
                      {t.status === "ditutup" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(t, "aktif")} className="gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" /> Aktifkan Kembali
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="text-destructive gap-2">
                        <Trash2 className="h-4 w-4" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TugasFormDialog
        open={formOpen}
        item={editItem}
        onClose={() => { setFormOpen(false); setEditItem(null) }}
        onSaved={() => { setFormOpen(false); setEditItem(null) }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tugas?</AlertDialogTitle>
            <AlertDialogDescription>Tugas yang dihapus tidak dapat dikembalikan.</AlertDialogDescription>
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
