"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Loader2, Search, X, CalendarDays, CalendarOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"

const TIPE_LABEL: Record<string, string> = {
  kegiatan: "Kegiatan",
  libur: "Libur",
  lainnya: "Lainnya",
}

const TIPE_BADGE: Record<string, string> = {
  kegiatan: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  libur: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  lainnya: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
}

const BULAN_LIST = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
]

function getBulanLabel(value: string) {
  return BULAN_LIST.find((b) => b.value === value)?.label ?? value
}

interface KalenderRecord {
  id: string
  judul: string
  deskripsi: string | null
  tanggalMulai: string
  tanggalSelesai: string | null
  tipe: "kegiatan" | "libur" | "lainnya"
  isLiburNasional: boolean
  warna: string | null
  createdAt: string
}

interface FormState {
  id?: string
  judul: string
  deskripsi: string
  tanggalMulai: string
  tanggalSelesai: string
  tipe: string
  warna: string
}

const emptyForm: FormState = {
  judul: "",
  deskripsi: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  tipe: "kegiatan",
  warna: "#3b82f6",
}

const HARI_MINGGUAN = [
  { key: "senin", label: "Senin" },
  { key: "selasa", label: "Selasa" },
  { key: "rabu", label: "Rabu" },
  { key: "kamis", label: "Kamis" },
  { key: "jumat", label: "Jumat" },
  { key: "sabtu", label: "Sabtu" },
  { key: "minggu", label: "Minggu" },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function toDateInputValue(dateStr: string | null) {
  if (!dateStr) return ""
  try {
    return new Date(dateStr).toISOString().split("T")[0]
  } catch {
    return ""
  }
}

export default function KalenderPage() {
  const [activeTab, setActiveTab] = useState<"agenda" | "libur" | "liburGuru">("agenda")
  const [search, setSearch] = useState("")
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString())
  const [filterBulan, setFilterBulan] = useState((new Date().getMonth() + 1).toString())
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [hariLibur, setHariLibur] = useState<string[]>(["sabtu", "minggu"])
  const [hariLiburGuru, setHariLiburGuru] = useState<string[]>(["sabtu", "minggu"])

  const tahun = filterTahun ? parseInt(filterTahun) : undefined
  const bulan = filterBulan ? parseInt(filterBulan) : undefined

  const { data: eventList, isLoading } = api.kalender.getAll.useQuery({
    search,
    tahun,
    bulan,
    limit: 200,
  })
  const utils = api.useUtils()

  const createMutation = api.kalender.create.useMutation({
    onSuccess: () => {
      toast.success("Event berhasil ditambahkan")
      utils.kalender.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan event"),
  })

  const updateMutation = api.kalender.update.useMutation({
    onSuccess: () => {
      toast.success("Event berhasil diperbarui")
      utils.kalender.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui event"),
  })

  const removeMutation = api.kalender.remove.useMutation({
    onSuccess: () => {
      toast.success("Event berhasil dihapus")
      utils.kalender.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus event"),
  })

  const seedMutation = api.kalender.seedLiburNasional.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} hari libur nasional berhasil ditambahkan`)
      utils.kalender.getAll.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan libur nasional"),
  })

  const kaldikQuery = api.pengaturanKalender.get.useQuery()
  const saveHariLibur = api.pengaturanKalender.setHariLiburMingguan.useMutation({
    onSuccess: () => {
      toast.success("Hari libur mingguan berhasil disimpan")
      utils.pengaturanKalender.get.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menyimpan hari libur"),
  })

  const saveHariLiburGuru = api.pengaturanKalender.setHariLiburMingguanGuru.useMutation({
    onSuccess: () => {
      toast.success("Hari libur mingguan guru berhasil disimpan")
      utils.pengaturanKalender.get.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menyimpan hari libur guru"),
  })

  const handleSaveHariLibur = async () => {
    if (hariLibur.length === 0) {
      toast.error("Minimal 1 hari libur harus dipilih")
      return
    }
    await saveHariLibur.mutateAsync({ hariLibur: hariLibur as any })
  }

  const handleSaveHariLiburGuru = async () => {
    if (hariLiburGuru.length === 0) {
      toast.error("Minimal 1 hari libur harus dipilih")
      return
    }
    await saveHariLiburGuru.mutateAsync({ hariLibur: hariLiburGuru as any })
  }

  const openCreateForm = () => {
    setFormData(emptyForm)
    setFormOpen(true)
  }

  const openEditForm = (r: KalenderRecord) => {
    setFormData({
      id: r.id,
      judul: r.judul,
      deskripsi: r.deskripsi ?? "",
      tanggalMulai: toDateInputValue(r.tanggalMulai),
      tanggalSelesai: toDateInputValue(r.tanggalSelesai),
      tipe: r.tipe,
      warna: r.warna ?? "#3b82f6",
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.judul.trim() || !formData.tanggalMulai) return
    const payload = {
      judul: formData.judul.trim(),
      deskripsi: formData.deskripsi.trim() || undefined,
      tanggalMulai: formData.tanggalMulai,
      tanggalSelesai: formData.tanggalSelesai || undefined,
      tipe: formData.tipe as "kegiatan" | "libur" | "lainnya",
      warna: formData.warna,
    }
    if (formData.id) {
      await updateMutation.mutateAsync({ id: formData.id, ...payload })
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

  const handleSeed = async () => {
    const year = new Date().getFullYear()
    seedMutation.mutate({ tahun: year })
  }

  useEffect(() => {
    if (kaldikQuery.data?.hariLiburMingguan) {
      setHariLibur(kaldikQuery.data.hariLiburMingguan as string[])
    }
    if (kaldikQuery.data?.hariLiburMingguanGuru) {
      setHariLiburGuru(kaldikQuery.data.hariLiburMingguanGuru as string[])
    }
  }, [kaldikQuery.data])

  const records = (eventList ?? []) as KalenderRecord[]
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Kalender Akademik</h2>
        <p className="text-sm text-muted-foreground">Kelola kegiatan sekolah dan hari libur</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="w-full overflow-x-auto scrollbar-none pb-1 flex justify-start mb-6">
          <TabsList className="bg-slate-100/85 dark:bg-slate-900/60 p-1 rounded-2xl w-max min-w-full flex gap-2 border border-slate-200/50 dark:border-slate-800 shadow-inner">
            <TabsTrigger
              value="agenda"
              className="flex-1 rounded-xl px-2 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 font-sans shrink-0"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Agenda & Event</span>
            </TabsTrigger>
            <TabsTrigger
              value="libur"
              className="flex-1 rounded-xl px-2 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 font-sans shrink-0"
            >
              <CalendarOff className="w-3.5 h-3.5" />
              <span>Libur Mingguan Siswa</span>
            </TabsTrigger>
            <TabsTrigger
              value="liburGuru"
              className="flex-1 rounded-xl px-2 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 font-sans shrink-0"
            >
              <CalendarOff className="w-3.5 h-3.5" />
              <span>Libur Mingguan Guru</span>
            </TabsTrigger>
          </TabsList>
        </div>

      <TabsContent value="agenda" className="focus-visible:outline-none">
      <div className="neumo-card bg-background rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari event..."
                  className="pl-9 h-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="button" variant="secondary" className="h-10 px-4">
                Cari
              </Button>
            </div>
            <Select value={filterBulan} onValueChange={(v) => setFilterBulan(v ?? "")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Bulan">{filterBulan ? getBulanLabel(filterBulan) : "Bulan"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BULAN_LIST.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Tahun"
              className="w-[100px]"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleSeed} disabled={seedMutation.isPending} className="h-10">
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CalendarDays className="h-4 w-4 mr-2" />
              )}
              Inisialisasi Libur Nasional {new Date().getFullYear()}
            </Button>
            <Button
              className="gap-2 h-10"
              style={{ backgroundColor: "hsl(142 72% 40%)" }}
              onClick={openCreateForm}
            >
              <Plus className="h-4 w-4" /> Tambah Event
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              {search ? "Tidak ditemukan" : "Belum ada event kalender"}
            </p>
          </div>
        ) : (
          <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Tanggal Selesai</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.warna ?? "#3b82f6" }} />
                        {r.judul}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={TIPE_BADGE[r.tipe] ?? ""} variant="secondary">
                        {TIPE_LABEL[r.tipe] ?? r.tipe}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(r.tanggalMulai)}</TableCell>
                    <TableCell>{r.tanggalSelesai ? formatDate(r.tanggalSelesai) : "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: r.warna ?? "#3b82f6" }} />
                        <span className="text-xs text-muted-foreground">{r.warna ?? "#3b82f6"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.isLiburNasional ? (
                        <Badge variant="outline" className="border-red-300 text-red-600">Libur Nasional</Badge>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger
                            render={<Button variant="ghost" size="icon" onClick={() => openEditForm(r)} />}
                          >
                            <Pencil className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipPositioner>
                              <TooltipPopup>Edit</TooltipPopup>
                            </TooltipPositioner>
                          </TooltipPortal>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDeleteId(r.id)}
                              />
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipPositioner>
                              <TooltipPopup>Hapus</TooltipPopup>
                            </TooltipPositioner>
                          </TooltipPortal>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.warna ?? "#3b82f6" }} />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{r.judul}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditForm(r)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className={TIPE_BADGE[r.tipe] ?? ""} variant="secondary" style={{fontSize: "9px"}}>{TIPE_LABEL[r.tipe] ?? r.tipe}</Badge>
                  {r.isLiburNasional ? (
                    <Badge variant="outline" className="border-red-300 text-red-600 text-[10px]">Libur Nasional</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Manual</Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                  <div className="flex justify-between"><span className="font-semibold">Mulai:</span><span>{formatDate(r.tanggalMulai)}</span></div>
                  <div className="flex justify-between"><span className="font-semibold">Selesai:</span><span>{r.tanggalSelesai ? formatDate(r.tanggalSelesai) : "-"}</span></div>
                  <div className="flex justify-between items-center"><span className="font-semibold">Warna:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: r.warna ?? "#3b82f6" }} />
                      <span className="text-muted-foreground">{r.warna ?? "#3b82f6"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
      </TabsContent>

      <TabsContent value="libur" className="focus-visible:outline-none">
        <div className="neumo-card bg-background rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <CalendarOff className="h-5 w-5 text-rose-500" />
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Hari Libur Mingguan Tetap (Siswa)</h3>
          </div>

          <div className="p-4 bg-rose-500/[0.03] border border-rose-500/10 rounded-2xl text-[11.5px] leading-relaxed text-rose-800 dark:text-rose-400 font-semibold">
            <p>
              Hari yang aktif (berwarna merah) ditetapkan sebagai hari libur mingguan <strong>siswa</strong> dan otomatis
              mengurangi hari efektif pada halaman rekap siswa.
            </p>
          </div>

          {kaldikQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {HARI_MINGGUAN.map((hari) => {
                  const isSelected = hariLibur.includes(hari.key)
                  return (
                    <button
                      key={hari.key}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setHariLibur(hariLibur.filter((h) => h !== hari.key))
                        } else {
                          setHariLibur([...hariLibur, hari.key])
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-250 border cursor-pointer select-none",
                        isSelected
                          ? "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900 text-rose-600 dark:text-rose-400 shadow-sm"
                          : "bg-background border-slate-200/60 dark:border-slate-800/80 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      )}
                    >
                      {hari.label}
                    </button>
                  )
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex justify-end">
                <button
                  className="h-10 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border-none px-6 flex items-center justify-center shadow-md shadow-teal-500/5 transition-all disabled:opacity-50"
                  onClick={handleSaveHariLibur}
                  disabled={saveHariLibur.isPending || kaldikQuery.isLoading}
                >
                  {saveHariLibur.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <span>Simpan Hari Libur</span>
                </button>
              </div>
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="liburGuru" className="focus-visible:outline-none">
        <div className="neumo-card bg-background rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <CalendarOff className="h-5 w-5 text-teal-500" />
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Hari Libur Mingguan Tetap (Guru)</h3>
          </div>

          <div className="p-4 bg-teal-500/[0.03] border border-teal-500/10 rounded-2xl text-[11.5px] leading-relaxed text-teal-800 dark:text-teal-400 font-semibold">
            <p>
              Hari yang aktif (berwarna hijau) ditetapkan sebagai hari libur mingguan <strong>guru</strong> dan otomatis
              mengurangi hari efektif pada rekap guru mode <strong>Jam Kerja</strong>. Mode <strong>Jam Pelajaran (JP)</strong> tidak
              terpengaruh — target JP tetap mengikuti jadwal mengajar.
            </p>
          </div>

          {kaldikQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {HARI_MINGGUAN.map((hari) => {
                  const isSelected = hariLiburGuru.includes(hari.key)
                  return (
                    <button
                      key={hari.key}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setHariLiburGuru(hariLiburGuru.filter((h) => h !== hari.key))
                        } else {
                          setHariLiburGuru([...hariLiburGuru, hari.key])
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-250 border cursor-pointer select-none",
                        isSelected
                          ? "bg-teal-50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-900 text-teal-600 dark:text-teal-400 shadow-sm"
                          : "bg-background border-slate-200/60 dark:border-slate-800/80 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      )}
                    >
                      {hari.label}
                    </button>
                  )
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex justify-end">
                <button
                  className="h-10 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border-none px-6 flex items-center justify-center shadow-md shadow-teal-500/5 transition-all disabled:opacity-50"
                  onClick={handleSaveHariLiburGuru}
                  disabled={saveHariLiburGuru.isPending || kaldikQuery.isLoading}
                >
                  {saveHariLiburGuru.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <span>Simpan Hari Libur</span>
                </button>
              </div>
            </>
          )}
        </div>
      </TabsContent>
      </Tabs>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center glass-overlay">
          <div className="glass-dialog rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="font-semibold text-foreground">
                {formData.id ? "Edit Event" : "Tambah Event"}
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Judul</Label>
                <Input
                  placeholder="Judul event"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="flex-1"
                />
              </div>

              <div className="flex items-start gap-4">
                <Label className="w-28 text-right flex-shrink-0 mt-2">Deskripsi</Label>
                <Textarea
                  placeholder="Deskripsi event (opsional)"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="flex-1 min-h-[80px]"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Tipe</Label>
                <Select
                  value={formData.tipe}
                  onValueChange={(v) => setFormData({ ...formData, tipe: v ?? "kegiatan" })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kegiatan">Kegiatan</SelectItem>
                    <SelectItem value="libur">Libur</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Warna</Label>
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="color"
                    value={formData.warna}
                    onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
                    className="h-9 w-9 rounded-lg border border-border bg-transparent cursor-pointer p-0.5"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{formData.warna}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Tgl Mulai</Label>
                <Input
                  type="date"
                  value={formData.tanggalMulai}
                  onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-28 text-right flex-shrink-0">Tgl Selesai</Label>
                <Input
                  type="date"
                  value={formData.tanggalSelesai}
                  onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer">
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !formData.judul.trim() || !formData.tanggalMulai}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Event</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus event ini? Tindakan ini tidak dapat dibatalkan.
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
