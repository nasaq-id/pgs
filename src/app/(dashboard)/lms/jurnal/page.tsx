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
import { Plus, Search, BookOpen, MoreVertical, Pencil, Trash2, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"
import JurnalFormDialog from "@/components/jurnal/JurnalFormDialog"

export default function JurnalMengajarPage() {
  const [kelasFilter, setKelasFilter] = useState("all")
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split("T")[0])
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: kelasList } = api.kelas.getAll.useQuery({})
  const { data: jurnalList, isLoading } = api.lms.getJurnal.useQuery({
    kelasId: kelasFilter !== "all" ? kelasFilter : undefined,
    tanggal: tanggal ? new Date(tanggal + "T00:00:00") : undefined,
  })

  const deleteJurnal = api.lms.deleteJurnal.useMutation()

  const filtered = (jurnalList || []).filter((j) => {
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

  const fmtTime = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  const fmtDate = (d: Date | string) => {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  }

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
