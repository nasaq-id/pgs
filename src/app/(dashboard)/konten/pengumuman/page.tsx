"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Loader2, Search, X, Megaphone, CalendarDays, Eye, Bell } from "lucide-react"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  semua: "bg-secondary text-secondary-foreground",
  guru: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  siswa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  orang_tua: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
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
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan pengumuman"),
  })

  const updateMutation = api.pengumuman.update.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil diperbarui")
      utils.pengumuman.getAll.invalidate()
      utils.pengumuman.getPublished.invalidate()
      utils.pengumuman.getCounts.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui pengumuman"),
  })

  const removeMutation = api.pengumuman.remove.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman berhasil dihapus")
      utils.pengumuman.getAll.invalidate()
      utils.pengumuman.getPublished.invalidate()
      utils.pengumuman.getCounts.invalidate()
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pengumuman</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Kelola dan lihat pengumuman sekolah" : "Pengumuman terbaru dari sekolah"}
        </p>
      </div>

      {isAdmin && (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="rounded-2xl glass-card p-1">
            <TabsTrigger value="pengumuman" className="rounded-xl">Pengumuman</TabsTrigger>
            <TabsTrigger value="kelola" className="rounded-xl">
              Kelola
              {counts && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted">
                  {counts.draft > 0 ? `${counts.draft} draft` : counts.total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{formData.id ? "Edit Pengumuman" : "Buat Pengumuman"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Judul</Label>
              <Input value={formData.judul} onChange={(e) => setFormData({ ...formData, judul: e.target.value })} placeholder="Judul pengumuman" />
            </div>
            <div>
              <Label>Konten</Label>
              <Textarea value={formData.konten} onChange={(e) => setFormData({ ...formData, konten: e.target.value })} placeholder="Isi pengumuman..." className="min-h-[120px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target</Label>
                <Select value={formData.target} onValueChange={(v) => setFormData({ ...formData, target: v || "semua" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua</SelectItem>
                    <SelectItem value="guru">Guru</SelectItem>
                    <SelectItem value="siswa">Siswa</SelectItem>
                    <SelectItem value="orang_tua">Orang Tua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tgl Publish</Label>
                <Input type="date" value={formData.tanggalPublish} onChange={(e) => setFormData({ ...formData, tanggalPublish: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.published} onCheckedChange={(v: boolean) => setFormData({ ...formData, published: v })}>
                <SwitchThumb />
              </Switch>
              <Label className="cursor-pointer">{formData.published ? "Published" : "Draft"}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.judul.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {formData.id ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl">
          {selectedDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={TARGET_BADGE[selectedDetail.target] ?? ""} variant="secondary">
                    {TARGET_LABEL[selectedDetail.target] ?? selectedDetail.target}
                  </Badge>
                  <Badge variant={selectedDetail.published ? "default" : "outline"} className={selectedDetail.published ? "bg-green-600" : ""}>
                    {selectedDetail.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{selectedDetail.judul}</DialogTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(selectedDetail.tanggalPublish)}</span>
                </div>
              </DialogHeader>
              <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                {selectedDetail.konten || "Tidak ada konten"}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={removeMutation.isPending} className="bg-destructive">
              {removeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Hapus
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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!records.length) {
    return (
      <Card className="p-12 rounded-3xl flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Megaphone className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">Belum ada pengumuman</h3>
        <p className="text-sm text-muted-foreground mt-1">Pengumuman yang dipublikasikan akan muncul di sini</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <button
          key={r.id}
          onClick={() => onDetail(r)}
          className="w-full text-left glass-card rounded-2xl p-5 clickable transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className={TARGET_BADGE[r.target] ?? ""} variant="secondary" style={{ fontSize: "10px", padding: "0 6px" }}>
                  {TARGET_LABEL[r.target] ?? r.target}
                </Badge>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDateShort(r.tanggalPublish)}
                </span>
              </div>
              <h3 className="font-semibold text-foreground leading-snug">{r.judul}</h3>
              {r.konten && (
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{r.konten}</p>
              )}
            </div>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <ChevronRightIcon className="h-4 w-4 text-primary" />
            </div>
          </div>
        </button>
      ))}
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

// ── Admin View (CRUD) ──
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
    <Card className="p-5 rounded-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari pengumuman..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "all")}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTarget} onValueChange={(v) => setFilterTarget(v || "")}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Target" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Semua</SelectItem>
              <SelectItem value="semua">Semua Role</SelectItem>
              <SelectItem value="guru">Guru</SelectItem>
              <SelectItem value="siswa">Siswa</SelectItem>
              <SelectItem value="orang_tua">Orang Tua</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> Buat Pengumuman
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{ [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : !records.length ? (
        <div className="text-center py-16 text-muted-foreground">
          {search || filterStatus !== "all" || filterTarget ? "Tidak ditemukan" : "Belum ada pengumuman"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[250px] truncate">{r.judul}</TableCell>
                  <TableCell>
                    <Badge className={TARGET_BADGE[r.target] ?? ""} variant="secondary" style={{ fontSize: "10px" }}>
                      {TARGET_LABEL[r.target] ?? r.target}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateShort(r.tanggalPublish)}</TableCell>
                  <TableCell>
                    {r.published ? (
                      <Badge variant="default" className="bg-green-600 text-[10px]">Published</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => openDetail(r)} />}>
                          <Eye className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipPortal><TooltipPositioner><TooltipPopup>Lihat</TooltipPopup></TooltipPositioner></TooltipPortal>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => openEditForm(r)} />}>
                          <Pencil className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipPortal><TooltipPositioner><TooltipPopup>Edit</TooltipPopup></TooltipPositioner></TooltipPortal>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(r.id)} />}>
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
      )}
    </Card>
  )
}
