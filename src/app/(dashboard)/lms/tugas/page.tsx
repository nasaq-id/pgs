"use client"

import { useState } from "react"
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

  const { data: kelasList } = api.kelas.getAll.useQuery({})
  const { data: tugasList, isLoading } = api.lms.getTugas.useQuery({
    kelasId: kelasFilter !== "all" ? kelasFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as "aktif" | "ditutup") : undefined,
  })

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

      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
          <Select value={kelasFilter} onValueChange={(v) => setKelasFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasList?.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="ditutup">Ditutup</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas..." className="pl-9 h-9 w-[200px]" />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Belum Ada Tugas</h3>
            <p className="text-sm text-muted-foreground">Buat tugas baru dengan tombol di atas.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const deadlineStr = t.deadline ? new Date(t.deadline).toISOString().split("T")[0] : ""
            const isOverdue = t.status === "aktif" && deadlineStr && deadlineStr < today

            return (
              <Card key={t.id} className={`p-4 hover:shadow-md transition-shadow ${isOverdue ? "border-destructive/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base truncate">{t.judulTugas}</h3>
                      {isOverdue ? (
                        <Badge variant="destructive" className="text-xs">Melewati Deadline</Badge>
                      ) : (
                        <Badge variant={t.status === "aktif" ? "default" : "secondary"} className="text-xs">
                          {t.status === "aktif" ? "Aktif" : "Ditutup"}
                        </Badge>
                      )}
                      {t.jenisTugas && (
                        <Badge variant="outline" className={`text-xs border-0 ${JENIS_COLORS[t.jenisTugas] || "bg-muted text-foreground"}`}>
                          {t.jenisTugas}
                        </Badge>
                      )}
                    </div>
                    {t.deskripsi && <p className="text-sm text-muted-foreground line-clamp-2">{t.deskripsi}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Diberikan: {fmtDate(t.tanggalDiberikan)}</span>
                      <span className={`inline-flex items-center gap-1 font-medium ${isOverdue ? "text-destructive" : ""}`}>
                        <Clock className="h-3 w-3" />Deadline: {fmtDate(t.deadline)}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" />}>
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditItem(t); setFormOpen(true) }}>
                        <Pencil className="h-4 w-4 mr-2" />Edit
                      </DropdownMenuItem>
                      {t.status === "aktif" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(t, "ditutup")}>
                          <Clock className="h-4 w-4 mr-2" />Tutup Tugas
                        </DropdownMenuItem>
                      )}
                      {t.status === "ditutup" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(t, "aktif")}>
                          <Clock className="h-4 w-4 mr-2" />Aktifkan Kembali
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
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
