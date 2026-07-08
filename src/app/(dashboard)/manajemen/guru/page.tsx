"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Upload, Download, Loader2, KeyRound, FileSpreadsheet } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import GuruFormDialog from "@/components/guru/GuruFormDialog"
import GuruDetailDialog from "@/components/guru/GuruDetailDialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"

interface GuruItem {
  id: string
  nipnuptk: string | null
  nik: string | null
  namaLengkap: string
  jenisKelamin: string | null
  tempatLahir: string | null
  tanggalLahir: Date | string | null
  alamat: string | null
  noHp: string | null
  email: string | null
  pendidikanTerakhir: string | null
  statusKepegawaian: string | null
  kategoriPegawai: string | null
  tugasUtama: string | null
  tugasTambahan: string | null
  mulaiBertugas: Date | string | null
  akhirBertugas: Date | string | null
  jp: number | null
  foto: string | null
  active: boolean | null
  usernameGuru: string | null
}

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export default function GuruPage() {
  const [search, setSearch] = useState("")
  const [querySearch, setQuerySearch] = useState("")
  const [page, setPage] = useState(0)
  const limit = 25

  const { data: guruList, isLoading } = api.guru.getAll.useQuery({
    search: querySearch || undefined,
    limit,
    offset: page * limit,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingGuru, setEditingGuru] = useState<GuruItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetName, setResetName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const [importPreviewData, setImportPreviewData] = useState<any[] | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const removeMutation = api.guru.remove.useMutation({
    onSuccess: () => {
      toast.success("Data guru berhasil dihapus")
      setDeleteId(null)
    },
    onError: () => toast.error("Gagal menghapus data guru"),
  })

  const resetPasswordMutation = api.guru.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password guru berhasil direset")
      setResetId(null)
      setResetName("")
      setNewPassword("")
      setShowPassword(false)
    },
    onError: () => toast.error("Gagal mereset password guru"),
  })

  const bulkCreateMutation = api.guru.bulkCreate.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.length} data guru berhasil diimport`)
      setImporting(false)
      setImportPreviewOpen(false)
      setImportPreviewData(null)
      utils.guru.getAll.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengimport data guru")
      setImporting(false)
    },
  })

  const utils = api.useUtils()

  const handleSearch = () => {
    setPage(0)
    setQuerySearch(search)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleCreate = () => {
    setEditingGuru(null)
    setFormOpen(true)
  }

  const handleEdit = (g: GuruItem) => {
    setEditingGuru(g)
    setFormOpen(true)
  }

  const handleView = (g: GuruItem) => {
    setDetailId(g.id)
    setDetailOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
  }

  const handleResetPassword = async () => {
    if (!resetId || !newPassword) return
    await resetPasswordMutation.mutateAsync({ id: resetId, password: newPassword })
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
    utils.guru.getAll.invalidate()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const [res, sekolah, aktifTa] = await Promise.all([
        utils.client.guru.getAllExport.query({ search: querySearch || undefined }),
        utils.client.lembaga.getSekolah.query(),
        utils.client.lembaga.getActiveTahunAjaran.query(),
      ])

      const keys = [
        "No", "NIP/NUPTK", "NIK", "Nama Lengkap", "Jenis Kelamin",
        "Tempat Lahir", "Tanggal Lahir", "Alamat", "No HP", "Email",
        "Pendidikan Terakhir", "Status Kepegawaian", "Kategori Pegawai",
        "Tugas Utama", "Tugas Tambahan", "Username", "Status",
      ]

      const dataRows = res.map((g: any, i: number) => [
        i + 1,
        g.nipnuptk || "",
        g.nik || "",
        g.namaLengkap || "",
        g.jenisKelamin === "L" ? "Laki-laki" : g.jenisKelamin === "P" ? "Perempuan" : "",
        g.tempatLahir || "",
        g.tanggalLahir ? new Date(g.tanggalLahir).toLocaleDateString("id-ID") : "",
        g.alamat || "",
        g.noHp || "",
        g.email || "",
        g.pendidikanTerakhir || "",
        g.statusKepegawaian || "",
        g.kategoriPegawai || "",
        g.tugasUtama || "",
        g.tugasTambahan || "",
        g.usernameGuru || "",
        g.active !== false ? "Aktif" : "Non Aktif",
      ])

      const taLabel = aktifTa?.namaTahunAjaran ? ` Tahun Ajaran ${aktifTa.namaTahunAjaran}${aktifTa.semester ? ` Semester ${aktifTa.semester.charAt(0).toUpperCase() + aktifTa.semester.slice(1)}` : ""}` : ""
      const titleText = `Data Guru${taLabel}`

      const totalCols = keys.length
      const headerRows: (string | number)[][] = [
        [sekolah?.namaSekolah || "SEKOLAH"],
        [sekolah?.alamat || ""],
        [titleText],
        [],
        keys,
      ]

      const wb = XLSX.utils.book_new()
      const aoa = [...headerRows, ...dataRows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
      ]

      ws["!cols"] = keys.map((key) => ({
        wch: Math.max(key.length, 12),
      }))

      ws["!rows"] = [
        { hpt: 30 },
        { hpt: 18 },
        { hpt: 22 },
        { hpt: 8 },
        { hpt: 18 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Data Guru")
      XLSX.writeFile(wb, `data_guru_${new Date().toISOString().split("T")[0]}.xlsx`)
      toast.success(`Data berhasil diexport (${res.length} guru)`)
    } catch {
      toast.error("Gagal mengexport data")
    } finally {
      setExporting(false)
    }
  }

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportModalOpen(false)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false })

      const mapped = rows.map((row: any) => ({
        namaLengkap: String(row["Nama"] || "").trim(),
        usernameGuru: String(row["Username"] || "").trim() || undefined,
        jenisKelamin: (String(row["Jenis Kelamin"] || "").trim() === "Laki-laki" ? "L" : String(row["Jenis Kelamin"] || "").trim() === "Perempuan" ? "P" : undefined) as "L" | "P" | undefined,
        passwordGuru: String(row["Password"] || "").trim(),
      })).filter((r) => r.namaLengkap)

      if (mapped.length === 0) {
        toast.error("Tidak ada data valid ditemukan di file Excel")
        return
      }

      setImportPreviewData(mapped)
      setImportPreviewOpen(true)
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleImportConfirm = async () => {
    if (!importPreviewData) return
    setImporting(true)
    setImportPreviewOpen(false)
    try {
      await bulkCreateMutation.mutateAsync({ data: importPreviewData })
      setImportPreviewData(null)
    } catch {
      // error handled by mutation
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const template = [
      ["Nama", "Username", "Jenis Kelamin", "Password"],
      ["John Doe", "johndoe", "Laki-laki", "password123"],
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(template)
    ws["!cols"] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, "Template Guru")
    XLSX.writeFile(wb, "template_import_guru.xlsx")
    toast.success("Template berhasil didownload")
  }

  const hasMore = guruList ? guruList.length >= limit : false
  const totalPages = hasMore ? page + 2 : page + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Guru & Tendik</h2>
          <p className="text-muted-foreground">Kelola data guru dan tenaga kependidikan</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFileSelected}
          />
          <Button variant="outline" className="gap-2" onClick={() => setImportModalOpen(true)} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setExportModalOpen(true)} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Guru
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Cari nama, NIP/NUPTK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="max-w-sm"
            />
            <Button variant="secondary" size="sm" onClick={handleSearch}>
              Cari
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead className="min-w-[130px]">NIP/NUPTK</TableHead>
                <TableHead className="min-w-[160px]">Nama Lengkap</TableHead>
                <TableHead className="min-w-[130px]">Tugas Utama</TableHead>
                <TableHead className="min-w-[50px]">JK</TableHead>
                <TableHead className="min-w-[110px]">No HP</TableHead>
                <TableHead className="min-w-[90px]">Status</TableHead>
                <TableHead className="text-right w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !guruList || guruList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada data guru
                  </TableCell>
                </TableRow>
              ) : (
                guruList.map((g, index) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-muted-foreground text-sm">{page * limit + index + 1}</TableCell>
                    <TableCell className="font-mono text-sm tracking-wider">{g.nipnuptk || "-"}</TableCell>
                    <TableCell className="font-medium">{g.namaLengkap}</TableCell>
                    <TableCell>{g.tugasUtama || "-"}</TableCell>
                    <TableCell>{g.jenisKelamin === "L" ? "L" : g.jenisKelamin === "P" ? "P" : "-"}</TableCell>
                    <TableCell>{g.noHp || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={g.active !== false ? "default" : "secondary"} className={g.active !== false ? "bg-green-600 text-white" : ""}>
                        {g.active !== false ? "Aktif" : "Non Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger
                            delay={0}
                            render={
                              <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center hover:bg-muted rounded-md" />
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipPositioner>
                              <TooltipPopup>Aksi</TooltipPopup>
                            </TooltipPositioner>
                          </TooltipPortal>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleView(g)} className="gap-2 clickable">
                            <Eye className="h-4 w-4" /> Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(g)} className="gap-2 clickable">
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => { setResetId(g.id); setResetName(g.namaLengkap); setNewPassword(""); setShowPassword(false) }}
                            className="gap-2 clickable"
                          >
                            <KeyRound className="h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(g.id)}
                            className="gap-2 clickable text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {guruList && guruList.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {guruList.length} data
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationPages(page + 1, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="px-1.5 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={page + 1 === p ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setPage((p as number) - 1)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <GuruFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingGuru}
        onSuccess={handleFormSuccess}
      />

      {detailId && (
        <GuruDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          guruId={detailId}
        />
      )}

      <Dialog open={importModalOpen} onOpenChange={(open) => { if (!open) setImportModalOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Import Data Guru</DialogTitle>
            <DialogDescription>Import data guru dari file Excel</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              onClick={() => { setImportModalOpen(false); setTimeout(() => fileInputRef.current?.click(), 100) }}
              className="group flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110 shrink-0">
                <Upload className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Import Excel</p>
                <p className="text-xs text-muted-foreground mt-0.5">File .xlsx atau .xls — preview data sebelum import</p>
              </div>
            </button>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)}>Batal</Button>
            </div>
            <div className="border-t border-border pt-3">
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5" />
                Download Template Excel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importPreviewOpen} onOpenChange={(open) => { if (!open) { setImportPreviewOpen(false); setImportPreviewData(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Data Import</DialogTitle>
            <DialogDescription>
              {importPreviewData ? `${importPreviewData.length} data guru akan diimport. Pastikan data sudah sesuai.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Jenis Kelamin</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreviewData?.slice(0, 50).map((d: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{d.namaLengkap}</TableCell>
                    <TableCell>{d.usernameGuru || "-"}</TableCell>
                    <TableCell>{d.jenisKelamin === "L" ? "Laki-laki" : d.jenisKelamin === "P" ? "Perempuan" : "-"}</TableCell>
                    <TableCell>••••••</TableCell>
                  </TableRow>
                ))}
                {importPreviewData && importPreviewData.length > 50 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">
                      ... dan {importPreviewData.length - 50} data lainnya
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="!p-0 !bg-transparent !border-0 pt-4">
            <Button variant="outline" onClick={() => { setImportPreviewOpen(false); setImportPreviewData(null) }}>Batal</Button>
            <Button onClick={handleImportConfirm} disabled={importing}>
              {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengimport...</> : `Import ${importPreviewData?.length || 0} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Data Guru</DialogTitle>
            <DialogDescription>Pilih format file untuk mengexport data guru</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              onClick={() => { setExportModalOpen(false); handleExport() }}
              disabled={exporting}
              className="group flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110 shrink-0">
                <FileSpreadsheet className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Excel</p>
                <p className="text-xs text-muted-foreground mt-0.5">.xlsx — Semua data guru lengkap</p>
              </div>
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setExportModalOpen(false)}>Batal</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!resetId} onOpenChange={(open) => { if (!open) { setResetId(null); setResetName(""); setNewPassword(""); setShowPassword(false) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password Guru</AlertDialogTitle>
            <AlertDialogDescription>
              Reset password untuk <strong>{resetName}</strong>. Password baru akan menggantikan password yang lama.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password Baru</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPasswordMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending || !newPassword}
            >
              {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Hapus Data Guru"
        description="Apakah Anda yakin ingin menghapus data guru ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        loading={removeMutation.isPending}
      />
    </div>
  )
}
