"use client"

import { useState, useRef, useEffect } from "react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, MoreVertical, Upload, Download, Loader2, KeyRound, FileSpreadsheet } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
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
  const [limit, setLimit] = useState(25)

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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close active dropdown action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

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
          <h2 className="text-3xl font-extrabold tracking-tight">Data Guru & Tendik</h2>
          <p className="text-sm text-muted-foreground">Kelola data guru dan tenaga kependidikan sekolah</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFileSelected}
          />
        </div>
      </div>

      <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 md:p-6 mb-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex items-center w-full md:max-w-xs lg:max-w-md">
            <Search className="absolute left-3.5 text-slate-400 w-4 h-4 shrink-0" />
            <input
              type="text"
              placeholder="Cari nama, NIP/NUPTK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-20 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 transition-all text-slate-700 dark:text-slate-350"
            />
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleSearch} 
              className="absolute right-1.5 h-8 rounded-xl font-bold text-xs uppercase cursor-pointer"
            >
              Cari
            </Button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <span>Tampil</span>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(0) }}>
              <SelectTrigger className="w-16 !h-8 text-xs font-bold !rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>data</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setImportModalOpen(true)}
              disabled={importing}
              className="flex-1 sm:flex-initial bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2 text-slate-500" />}
              <span>Impor</span>
            </button>

            <button
              onClick={() => setExportModalOpen(true)}
              disabled={exporting}
              className="flex-1 sm:flex-initial bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              <span>Ekspor</span>
            </button>
          </div>

          <button
            onClick={handleCreate}
            className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-teal-500/5 transition-all flex items-center justify-center cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Tambah Guru</span>
          </button>
        </div>

        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))
          ) : !guruList || guruList.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-8 text-center text-slate-400 font-semibold shadow-sm">
              Tidak ada data guru ditemukan
            </div>
          ) : (
            guruList.map((g) => {
              const isMenuOpen = activeMenuId === g.id
              return (
                <div key={g.id} className="glass-card rounded-[22px] border border-slate-200/85 dark:border-slate-800/85 p-4 shadow-sm space-y-3 relative text-left bg-white dark:bg-slate-900/40">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
                        {g.foto ? (
                          <img src={g.foto} alt={g.namaLengkap} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                            {g.namaLengkap.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-250 text-xs sm:text-sm leading-tight truncate">{g.namaLengkap}</h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">NIP/NUPTK: {g.nipnuptk || "—"}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase rounded-full border shrink-0",
                        g.active !== false
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30"
                          : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-100/50 dark:border-rose-900/30"
                      )}
                    >
                      {g.active !== false ? "Aktif" : "Non Aktif"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tugas Utama</span>
                      <p className="font-bold text-slate-700 dark:text-slate-350 mt-0.5 truncate">{g.tugasUtama || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">JP</span>
                      <p className="font-bold text-slate-750 dark:text-slate-300 mt-0.5">{g.jp ? `${g.jp} JP` : "—"}</p>
                    </div>
                  </div>

                  {g.tugasTambahan && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Tugas Tambahan</span>
                      <div className="flex flex-wrap gap-1">
                        {g.tugasTambahan.split(",").map((t, idx) => {
                          const colors = [
                            "bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border-purple-100/50 dark:border-purple-900/30",
                            "bg-pink-50 dark:bg-pink-950/20 text-pink-650 dark:text-pink-400 border-pink-100/50 dark:border-pink-900/30",
                            "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30",
                            "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30",
                            "bg-blue-50 dark:bg-blue-950/20 text-blue-650 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30",
                          ]
                          const color = colors[idx % colors.length]
                          return (
                            <span key={idx} className={cn("px-1.5 py-0.5 text-[8px] font-black uppercase rounded-md border", color)}>
                              {t.trim()}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Aksi:</span>
                    <div className="flex space-x-1.5 items-center">
                      <button
                        onClick={() => handleView(g)}
                        className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        title="Detail"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleEdit(g)}
                        className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === g.id ? null : g.id)
                          }}
                          className={cn(
                            "w-7 h-7 flex items-center justify-center border rounded-lg transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/20",
                            isMenuOpen
                              ? "border-slate-800 text-slate-800 dark:border-slate-650 dark:text-slate-200"
                              : "border-slate-200 dark:border-slate-800 text-slate-400 dark:border-slate-500"
                          )}
                        >
                          <MoreHorizontal size={14} strokeWidth={2.5} />
                        </button>
                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 bottom-full mb-2 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-50 min-w-[180px] p-1.5 space-y-1 block animate-fade-in text-left"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setResetId(g.id)
                                setResetName(g.namaLengkap)
                                setNewPassword("")
                                setShowPassword(false)
                              }}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-355 font-semibold text-xs transition-colors cursor-pointer text-left"
                            >
                              <KeyRound size={13} className="text-slate-400 shrink-0" />
                              <span>Reset Password</span>
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-850 my-1"></div>
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setDeleteId(g.id)
                              }}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-450 font-bold text-xs transition-colors cursor-pointer text-left"
                            >
                              <Trash2 size={13} className="text-rose-500 shrink-0" />
                              <span>Hapus Data</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-150 dark:border-slate-800">
              <TableRow>
                <TableHead className="w-12 text-center text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">NIP/NUPTK</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Nama</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Username</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Tugas Utama</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3 min-w-[200px]">Tugas Tambahan</TableHead>
                <TableHead className="text-center text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">JP</TableHead>
                <TableHead className="text-center text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-center w-24 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !guruList || guruList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold">
                    Tidak ada data guru ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                guruList.map((g, index) => {
                  const isMenuOpen = activeMenuId === g.id
                  return (
                    <TableRow key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                      <TableCell className="text-center font-bold text-slate-400 dark:text-slate-500 text-[11px]">
                        {page * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-bold text-xs tracking-wider text-slate-700 dark:text-slate-350 font-mono">
                        {g.nipnuptk || "—"}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
                            {g.foto ? (
                              <img src={g.foto} alt={g.namaLengkap} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                                {g.namaLengkap.substring(0, 2)}
                              </span>
                            )}
                          </div>
                          <span>{g.namaLengkap}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-650 dark:text-slate-400">
                        {g.usernameGuru || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 dark:text-slate-300">
                        {g.tugasUtama || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {g.tugasTambahan ? (
                          <div className="flex flex-wrap gap-1.5">
                            {g.tugasTambahan.split(",").map((t, idx) => {
                              const colors = [
                                "bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border-purple-100 dark:border-purple-900/30",
                                "bg-pink-50 dark:bg-pink-950/20 text-pink-650 dark:text-pink-400 border-pink-100 dark:border-pink-900/30",
                                "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
                                "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
                                "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
                              ]
                              const color = colors[idx % colors.length]
                              return (
                                <span key={idx} className={cn("px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border", color)}>
                                  {t.trim()}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-450 dark:text-slate-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                        {g.jp ? `${g.jp} JP` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "px-3 py-1 text-[9px] font-black uppercase rounded-full border whitespace-nowrap",
                            g.active !== false
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border-rose-100 dark:border-rose-900/30"
                          )}
                        >
                          {g.active !== false ? "Aktif" : "Non Aktif"}
                        </span>
                      </TableCell>
                      <TableCell className="relative text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === g.id ? null : g.id)
                          }}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border rounded-lg hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm mx-auto cursor-pointer focus:outline-none",
                            activeMenuId === g.id
                              ? "border-slate-800 text-slate-800 dark:border-slate-650 dark:text-slate-200"
                              : "border-slate-200 dark:border-slate-800 text-slate-400 dark:border-slate-500"
                          )}
                        >
                          <MoreHorizontal className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {activeMenuId === g.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-12 top-0 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 min-w-[210px] p-2 space-y-1 block animate-fade-in text-left"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                handleView(g)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                                <Eye size={14} strokeWidth={2.5} />
                              </div>
                              <span>Detail Lengkap</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                handleEdit(g)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-455 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                                <Pencil size={14} strokeWidth={2.5} />
                              </div>
                              <span>Edit Data</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setResetId(g.id)
                                setResetName(g.namaLengkap)
                                setNewPassword("")
                                setShowPassword(false)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                                <KeyRound size={14} strokeWidth={2.5} />
                              </div>
                              <span>Reset Password</span>
                            </button>

                            <div className="h-px bg-slate-100 dark:bg-slate-850 my-1 mx-2"></div>

                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setDeleteId(g.id)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-455 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors shrink-0">
                                <Trash2 size={14} strokeWidth={2.5} />
                              </div>
                              <span>Hapus Data</span>
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {guruList && guruList.length > 0 && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Total: {guruList.length} data ditampilkan
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800" disabled={page === 0} onClick={() => setPage(0)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationPages(page + 1, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={page + 1 === p ? "default" : "outline"}
                    size="icon"
                    className={`h-8 w-8 text-xs font-bold rounded-xl transition-all ${
                      page + 1 === p
                        ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm scale-105"
                        : "border-slate-200 dark:border-slate-800 text-slate-655 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => setPage((p as number) - 1)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>
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
