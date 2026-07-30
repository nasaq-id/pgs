"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Loader2, Search, X, Megaphone, CalendarDays, Eye, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch, SwitchThumb } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { useSession } from "next-auth/react"

const TARGET_LABEL: Record<string, string> = {
  semua: "Semua",
  guru: "Guru",
  siswa: "Siswa",
  orang_tua: "Orang Tua",
}

const TARGET_BADGE: Record<string, string> = {
  semua: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-200/50 dark:border-teal-900/30 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-full",
  guru: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-full",
  siswa: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-full",
  orang_tua: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-full",
}

interface PengumumanRecord {
  id: string
  judul: string
  konten: string | null
  target: "semua" | "guru" | "siswa" | "orang_tua"
  tanggalPublish: string | null
  published: boolean
  createdAt: string
}

interface FormState {
  id?: string
  judul: string
  konten: string
  target: string
  tanggalPublish: string
  published: boolean
}

const emptyForm: FormState = {
  judul: "",
  konten: "",
  target: "semua",
  tanggalPublish: new Date().toISOString().split("T")[0],
  published: true,
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default function PengumumanPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === "super_admin" || role === "admin_sekolah" || role === "tu"

  const [tab, setTab] = useState(isAdmin ? "kelola" : "pengumuman")
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTarget, setFilterTarget] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<PengumumanRecord | null>(null)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const utils = api.useUtils()

  const { data: pengumumanList, isLoading } = api.pengumuman.getAll.useQuery(
    {
      search: search || undefined,
      filterStatus: (filterStatus as any) || undefined,
      filterTarget: (filterTarget as any) || undefined,
    },
    { enabled: isAdmin },
  )

  const { data: publishedList, isLoading: loadingPublished } = api.pengumuman.getPublished.useQuery(
    {},
    { enabled: !isAdmin || tab === "pengumuman" },
  )

  const { data: counts } = api.pengumuman.getCounts.useQuery(undefined, { enabled: isAdmin })

  const createMutation = api.pengumuman.create.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil ditambahkan")
      utils.pengumuman.getAll.invalidate()
      utils.pengumuman.getPublished.invalidate()
      utils.pengumuman.getCounts.invalidate()
      utils.notifikasi.getAll.invalidate()
      utils.notifikasi.getRecent.invalidate()
      utils.notifikasi.getUnreadCount.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan pengumuman"),
  })

  const updateMutation = api.pengumuman.update.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil diperbarui")
      utils.pengumuman.getAll.invalidate()
      utils.pengumuman.getPublished.invalidate()
      utils.pengumuman.getCounts.invalidate()
      utils.notifikasi.getAll.invalidate()
      utils.notifikasi.getRecent.invalidate()
      utils.notifikasi.getUnreadCount.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui pengumuman"),
  })

  const removeMutation = api.pengumuman.remove.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil dihapus")
      utils.pengumuman.getAll.invalidate()
      utils.pengumuman.getPublished.invalidate()
      utils.pengumuman.getCounts.invalidate()
      utils.notifikasi.getAll.invalidate()
      utils.notifikasi.getRecent.invalidate()
      utils.notifikasi.getUnreadCount.invalidate()
    },
    onError: () => toast.error("Gagal menghapus pengumuman"),
  })

  const openCreateForm = () => {
    setFormData(emptyForm)
    setFormOpen(true)
  }

  const openEditForm = (r: PengumumanRecord) => {
    setFormData({
      id: r.id,
      judul: r.judul,
      konten: r.konten ?? "",
      target: r.target,
      tanggalPublish: r.tanggalPublish
        ? new Date(r.tanggalPublish).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      published: r.published,
    })
    setFormOpen(true)
  }

  const openDetail = (r: PengumumanRecord) => {
    setSelectedDetail(r)
    setDetailOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.judul.trim()) return
    const payload = {
      judul: formData.judul.trim(),
      konten: formData.konten.trim() || null,
      target: formData.target as "semua" | "guru" | "siswa" | "orang_tua",
      tanggalPublish: formData.tanggalPublish || null,
      published: formData.published,
      sekolahId: "",
    }
    if (formData.id) {
      await updateMutation.mutateAsync({ id: formData.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    setFormOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const records = (pengumumanList ?? []) as PengumumanRecord[]
  const publishedRecords = (publishedList ?? []) as PengumumanRecord[]
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-3 text-left">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-5 rounded-3xl bg-card border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5 uppercase">
            <Megaphone className="h-6 w-6 text-teal-600 animate-pulse" />
            Pengumuman
          </h2>
          <p className="text-xs text-slate-450 font-bold mt-1">
            {isAdmin ? "Kelola, buat, dan publikasikan pengumuman sekolah" : "Daftar pengumuman terbaru dan terhangat dari sekolah"}
          </p>
        </div>
      </div>

      {isAdmin && (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <div className="flex justify-center">
            <TabsList className="bg-slate-100/85 dark:bg-slate-900/60 p-1 rounded-2xl w-full max-w-md flex gap-2 border border-slate-200/50 dark:border-slate-800 shadow-inner">
              <TabsTrigger value="pengumuman" className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer flex items-center justify-center gap-1.5">
                <Megaphone className="w-4 h-4" />
                <span>Pengumuman</span>
              </TabsTrigger>
              <TabsTrigger value="kelola" className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-teal-650 data-[state=active]:text-teal-400 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer flex items-center justify-center gap-1.5">
                <Settings className="w-4 h-4" />
                <span>Kelola</span>
                {counts && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-350">
                    {counts.draft > 0 ? `${counts.draft} draft` : counts.total}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pengumuman">
            <PublishedView records={publishedRecords} loading={loadingPublished} onDetail={openDetail} />
          </TabsContent>

          <TabsContent value="kelola">
            <AdminView
              records={records}
              isLoading={isLoading}
              search={search}
              setSearch={setSearch}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterTarget={filterTarget}
              setFilterTarget={setFilterTarget}
              openCreateForm={openCreateForm}
              openEditForm={openEditForm}
              setDeleteId={setDeleteId}
              openDetail={openDetail}
            />
          </TabsContent>
        </Tabs>
      )}

      {!isAdmin && (
        <PublishedView records={publishedRecords} loading={loadingPublished} onDetail={openDetail} />
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) setFormOpen(false) }}>
        <DialogContent className="max-w-lg p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {formData.id ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
            </h3>
            <button 
              type="button" 
              onClick={() => setFormOpen(false)} 
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Judul Pengumuman</Label>
              <Input 
                value={formData.judul} 
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })} 
                placeholder="Tulis judul pengumuman yang jelas..." 
                className="rounded-xl border-slate-200 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50" 
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Isi / Konten Pengumuman</Label>
              <Textarea 
                value={formData.konten} 
                onChange={(e) => setFormData({ ...formData, konten: e.target.value })} 
                placeholder="Tulis isi pengumuman secara rinci di sini..." 
                className="rounded-xl border-slate-200 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 min-h-[140px]" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Target Penerima</Label>
                <Select 
                  value={formData.target} 
                  onValueChange={(v) => setFormData({ ...formData, target: v || "semua" })}
                  options={[
                    { value: "semua", label: "Semua Role" },
                    { value: "guru", label: "Guru" },
                    { value: "siswa", label: "Siswa" },
                    { value: "orang_tua", label: "Orang Tua" }
                  ]}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="semua">Semua Role</SelectItem>
                    <SelectItem value="guru">Guru</SelectItem>
                    <SelectItem value="siswa">Siswa</SelectItem>
                    <SelectItem value="orang_tua">Orang Tua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Tanggal Publikasi</Label>
                <Input 
                  type="date" 
                  value={formData.tanggalPublish} 
                  onChange={(e) => setFormData({ ...formData, tanggalPublish: e.target.value })} 
                  className="rounded-xl border-slate-200 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50" 
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-150">
              <div className="space-y-0.5 text-left">
                <Label className="block text-[9px] font-black text-slate-700 uppercase tracking-wider">Status Penerbitan</Label>
                <span className="text-[10px] text-slate-450 font-bold">{formData.published ? "Pengumuman langsung aktif diterbitkan" : "Simpan sebagai draft terlebih dahulu"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.published} onCheckedChange={(v: boolean) => setFormData({ ...formData, published: v })}>
                  <SwitchThumb />
                </Switch>
                <Label className="cursor-pointer text-xs font-bold text-slate-700">{formData.published ? "Published" : "Draft"}</Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button 
              type="button" 
              onClick={() => setFormOpen(false)} 
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-80"
            >
              Batal
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={saving || !formData.judul.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 h-[38px]"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <span>{formData.id ? "Simpan Perubahan" : "Terbitkan"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          {selectedDetail && (
            <div className="p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={TARGET_BADGE[selectedDetail.target] ?? ""} variant="secondary">
                      {TARGET_LABEL[selectedDetail.target] ?? selectedDetail.target}
                    </Badge>
                    {selectedDetail.published ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-250/20 text-[9px] font-black uppercase tracking-wider">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-650 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200/50 text-[9px] font-black uppercase tracking-wider">
                        Draft
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-snug">{selectedDetail.judul}</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setDetailOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer self-start"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto custom-scroll text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedDetail.konten || "Tidak ada rincian konten untuk pengumuman ini."}
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  Tanggal Rilis: {formatDate(selectedDetail.tanggalPublish)}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
        </div>
      )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-0 shadow-2xl max-w-md text-left">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black text-slate-800 uppercase tracking-widest">Hapus Pengumuman</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 font-bold">
              Apakah Anda yakin ingin menghapus pengumuman ini secara permanen? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2.5">
            <AlertDialogCancel 
              disabled={removeMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={removeMutation.isPending} 
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-rose-500/5 cursor-pointer disabled:opacity-80 transition-all duration-300 transform active:scale-95 border-0"
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Published View (User-facing) ──
function PublishedView({
  records,
  loading,
  onDetail,
}: {
  records: PengumumanRecord[]
  loading: boolean
  onDetail: (r: PengumumanRecord) => void
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!records.length) {
    return (
      <Card className="p-16 rounded-3xl flex flex-col items-center justify-center text-center border border-slate-200 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
        <div className="h-16 w-16 rounded-2xl bg-slate-50 border flex items-center justify-center mb-4">
          <Megaphone className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Belum ada pengumuman</h3>
        <p className="text-xs text-slate-450 font-bold mt-1.5">Pengumuman resmi dari sekolah akan muncul di sini.</p>
      </Card>
    )
  }

  const featured = records[0]
  const remaining = records.slice(1)

  return (
    <div className="space-y-6">
      {/* Featured Announcement Card */}
      {featured && (
        <Card className="overflow-hidden border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.02] via-transparent to-indigo-500/[0.01] rounded-3xl shadow-[0_12px_40px_rgba(20,184,166,0.03)] relative p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-transparent rounded-bl-full pointer-events-none opacity-50" />
          
          <div className="flex-1 space-y-3.5 z-10 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-wider border border-teal-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                Pengumuman Terbaru
              </span>
              <Badge className={TARGET_BADGE[featured.target] ?? ""} variant="secondary">
                {TARGET_LABEL[featured.target] ?? featured.target}
              </Badge>
              <span className="text-[11px] text-slate-450 font-bold flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateShort(featured.tanggalPublish)}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-800 leading-snug tracking-tight hover:text-teal-650 transition-colors cursor-pointer" onClick={() => onDetail(featured)}>
              {featured.judul}
            </h3>

            {featured.konten && (
              <p className="text-sm leading-relaxed text-slate-500 line-clamp-3">
                {featured.konten}
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={() => onDetail(featured)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span>Baca Selengkapnya</span>
                <ChevronRightIcon className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Animated Megaphone Icon */}
          <div className="hidden md:flex shrink-0 items-center justify-center z-10">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Megaphone className="h-10 w-10 text-white animate-pulse" />
            </div>
          </div>
        </Card>
      )}

      {/* Remaining Announcements Grid */}
      {remaining.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {remaining.map((r) => (
            <button
              key={r.id}
              onClick={() => onDetail(r)}
              className="group text-left bg-card hover:bg-slate-50/[0.3] dark:hover:bg-slate-900/[0.2] border border-slate-200/80 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between min-h-[140px] cursor-pointer"
            >
              <div className="space-y-2.5 w-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={TARGET_BADGE[r.target] ?? ""} variant="secondary">
                      {TARGET_LABEL[r.target] ?? r.target}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-450 font-bold flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDateShort(r.tanggalPublish)}
                  </span>
                </div>
                
                <h4 className="font-bold text-slate-800 group-hover:text-teal-650 transition-colors line-clamp-2 leading-snug tracking-tight text-sm">
                  {r.judul}
                </h4>
                
                {r.konten && (
                  <p className="text-xs text-slate-450 line-clamp-2 leading-relaxed">
                    {r.konten}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-end pt-3 mt-auto text-[10px] font-black text-slate-400 group-hover:text-teal-650 transition-colors uppercase tracking-wider gap-1">
                <span>Detail</span>
                <ChevronRightIcon className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function AdminView({
  records,
  isLoading,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  filterTarget,
  setFilterTarget,
  openCreateForm,
  openEditForm,
  setDeleteId,
  openDetail,
}: {
  records: PengumumanRecord[]
  isLoading: boolean
  search: string
  setSearch: (v: string) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterTarget: string
  setFilterTarget: (v: string) => void
  openCreateForm: () => void
  openEditForm: (r: PengumumanRecord) => void
  setDeleteId: (id: string) => void
  openDetail: (r: PengumumanRecord) => void
}) {
  return (
    <Card className="p-6 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] bg-card text-left">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[300px]">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">Cari Pengumuman</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Judul atau isi pengumuman..." 
                  className="pl-9 h-10" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
              <Button type="button" variant="secondary" className="h-10 px-4">
                Cari
              </Button>
            </div>
          </div>
          
          <div className="w-32 space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">Status</Label>
            <Select 
              value={filterStatus} 
              onValueChange={(v) => setFilterStatus(v || "all")}
              options={[
                { value: "all", label: "Semua Status" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Draft" }
              ]}
            >
              <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-40 space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">Target Penerima</Label>
            <Select 
              value={filterTarget} 
              onValueChange={(v) => setFilterTarget(v || "")}
              options={[
                { value: " ", label: "Semua Target" },
                { value: "semua", label: "Semua Role" },
                { value: "guru", label: "Guru" },
                { value: "siswa", label: "Siswa" },
                { value: "orang_tua", label: "Orang Tua" }
              ]}
            >
              <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value=" ">Semua Target</SelectItem>
                <SelectItem value="semua">Semua Role</SelectItem>
                <SelectItem value="guru">Guru</SelectItem>
                <SelectItem value="siswa">Siswa</SelectItem>
                <SelectItem value="orang_tua">Orang Tua</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <button 
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer transition-all duration-300 transform active:scale-95 h-[38px] self-end"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Pengumuman</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : !records.length ? (
        <div className="text-center py-16 text-slate-400 font-semibold text-xs uppercase tracking-wider">
          {search || filterStatus !== "all" || filterTarget ? "Pengumuman tidak ditemukan" : "Belum ada pengumuman"}
        </div>
      ) : (
        <>
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-150 dark:border-slate-800">
              <TableRow>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Judul Pengumuman</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Target Penerima</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Tanggal Publish</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3 pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-200 max-w-[250px] truncate">{r.judul}</TableCell>
                  <TableCell>
                    <Badge className={TARGET_BADGE[r.target] ?? ""} variant="secondary">
                      {TARGET_LABEL[r.target] ?? r.target}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-650 dark:text-slate-450 font-mono whitespace-nowrap">{formatDateShort(r.tanggalPublish)}</TableCell>
                  <TableCell>
                    {r.published ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-250/20 text-[9px] font-black uppercase tracking-wider">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-650 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200/50 text-[9px] font-black uppercase tracking-wider">
                        Draft
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-2">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon" className="hover:bg-teal-50 dark:hover:bg-teal-950/20 hover:text-teal-600 rounded-lg" onClick={() => openDetail(r)} />}>
                          <Eye className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipPortal><TooltipPositioner><TooltipPopup>Lihat</TooltipPopup></TooltipPositioner></TooltipPortal>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon" className="hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 rounded-lg" onClick={() => openEditForm(r)} />}>
                          <Pencil className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipPortal><TooltipPositioner><TooltipPopup>Edit</TooltipPopup></TooltipPositioner></TooltipPortal>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon" className="text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg" onClick={() => setDeleteId(r.id)} />}>
                          <Trash2 className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipPortal><TooltipPositioner><TooltipPopup>Hapus</TooltipPopup></TooltipPositioner></TooltipPortal>
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
            <div key={r.id} className="neumo-card bg-background rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{r.judul}</p>
                  <Badge className={TARGET_BADGE[r.target] ?? ""} variant="secondary" style={{fontSize: "9px"}}>{TARGET_LABEL[r.target] ?? r.target}</Badge>
                </div>
                {r.published ? (
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-250/20 text-[9px] font-black uppercase tracking-wider">Published</span>
                ) : (
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-650 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200/50 text-[9px] font-black uppercase tracking-wider">Draft</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono mb-2">{formatDateShort(r.tanggalPublish)}</p>
              <div className="flex gap-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                <button onClick={() => openDetail(r)} className="rounded-lg p-1.5 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-teal-600 cursor-pointer"><Eye className="h-3.5 w-3.5" /></button>
                <button onClick={() => openEditForm(r)} className="rounded-lg p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteId(r.id)} className="rounded-lg p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </Card>
  )
}
