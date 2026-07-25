"use client"

import { useState, useRef, useEffect } from "react"
import { api } from "@/lib/trpc/client"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, MoreVertical, Upload, Download, Loader2, KeyRound, FileSpreadsheet, FileText, RefreshCw, Users, UserCheck, UserX } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import GuruFormDialog from "@/components/guru/GuruFormDialog"
import GuruDetailDialog from "@/components/guru/GuruDetailDialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import { autoTable } from "jspdf-autotable"
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
  const [sortOption, setSortOption] = useState<"name_asc" | "name_desc" | "nip_desc" | "nip_asc">("name_asc")
  const [statusFilter, setStatusFilter] = useState<string>("")

  const sortBy = sortOption.startsWith("nip") ? "nipnuptk" : "namaLengkap"
  const sortOrder = sortOption.endsWith("desc") ? "desc" : "asc"

  const { data: guruList, isLoading } = api.guru.getAll.useQuery({
    search: querySearch || undefined,
    statusKepegawaian: statusFilter || undefined,
    sortBy,
    sortOrder,
    limit,
    offset: page * limit,
  })
  const statsQuery = api.guru.getStats.useQuery()

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
  const [exportingPdf, setExportingPdf] = useState(false)
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

  const toDdMmYyyy = (d: any) => {
    if (!d) return ""
    const date = new Date(d)
    if (isNaN(date.getTime())) return ""
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      const [res, sekolah, aktifTa] = await Promise.all([
        utils.client.guru.getAllExport.query({ search: querySearch || undefined }),
        utils.client.lembaga.getSekolah.query(),
        utils.client.lembaga.getActiveTahunAjaran.query(),
      ])

      let logoBase64: string | null = null
      if (sekolah?.logo) {
        logoBase64 = await urlToBase64(sekolah.logo)
      }

      let customKopBase64: string | null = null
      if (sekolah?.useCustomKop && sekolah?.customKopGambar) {
        customKopBase64 = await urlToBase64(sekolah.customKopGambar)
      }

      const rows: (string | number)[][] = res.map((g: any, i: number) => [
        i + 1,
        g.nipnuptk || "-",
        g.nik || "-",
        g.namaLengkap || "-",
        g.jenisKelamin === "L" ? "Laki-laki" : g.jenisKelamin === "P" ? "Perempuan" : "-",
        g.tempatLahir || "-",
        toDdMmYyyy(g.tanggalLahir),
        g.statusKepegawaian || "-",
        g.tugasUtama || "-",
        g.noHp || "-",
        g.email || "-",
        g.active !== false ? "Aktif" : "Non-Active",
      ])

      const head = [["No", "NIP/NUPTK", "NIK", "Nama Lengkap", "JK", "Tempat Lahir", "Tgl Lahir", "Status Pegawai", "Tugas Utama", "No HP", "Email", "Status"]]

      const doc = new jsPDF("landscape", "mm", "a4")
      const pageW = doc.internal.pageSize.getWidth()

      const useCustomKop = sekolah?.useCustomKop && customKopBase64
      const kopH = useCustomKop ? (sekolah?.customKopTinggi || 35) : 24
      const logoSize = 16
      const logoX = 14
      const logoY = 4
      const textLeftMargin = logoBase64 ? logoX + logoSize + 4 : 14

      if (useCustomKop && customKopBase64) {
        try {
          doc.addImage(customKopBase64, "JPEG", 0, 0, pageW, kopH)
        } catch {
          try {
            doc.addImage(customKopBase64, "PNG", 0, 0, pageW, kopH)
          } catch {}
        }
      } else {
        // Render Standard Double-Line White Header
        if (logoBase64) {
          try {
            doc.addImage(logoBase64, logoX, logoY, logoSize, logoSize)
          } catch {
            try {
              doc.addImage(logoBase64, "JPEG", logoX, logoY, logoSize, logoSize)
            } catch {}
          }
        }

        doc.setTextColor(30, 41, 59) // slate-800
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        const centerX = logoBase64 ? (pageW - textLeftMargin) / 2 + textLeftMargin : pageW / 2
        doc.text(sekolah?.namaSekolah || "SEKOLAH", centerX, 9, { align: "center" })

        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(71, 85, 105) // slate-600
        doc.text(sekolah?.alamat || "", centerX, 14, { align: "center" })

        if (sekolah?.npsn || sekolah?.telepon) {
          const infoParts = []
          if (sekolah.npsn) infoParts.push(`NPSN: ${sekolah.npsn}`)
          if (sekolah.telepon) infoParts.push(`Telp: ${sekolah.telepon}`)
          doc.text(infoParts.join(" | "), centerX, 18, { align: "center" })
        }

        // Double lines at the bottom of the kop
        doc.setLineWidth(0.8)
        doc.setDrawColor(30, 41, 59)
        doc.line(14, kopH - 2, pageW - 14, kopH - 2)
        doc.setLineWidth(0.2)
        doc.line(14, kopH - 1, pageW - 14, kopH - 1)
      }

      const taLabel = aktifTa?.namaTahunAjaran ? ` Tahun Ajaran ${aktifTa.namaTahunAjaran}${aktifTa.semester ? ` Semester ${aktifTa.semester.charAt(0).toUpperCase() + aktifTa.semester.slice(1)}` : ""}` : ""
      const titleText = `Data Guru & Tendik${taLabel}`

      // Title (white background, no teal bar)
      const subHeaderY = kopH + 10
      doc.setTextColor(30, 41, 59) // slate-800
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(titleText, pageW / 2, subHeaderY + 5, { align: "center" })

      const infoY = subHeaderY + 10
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      const now = new Date()
      const hari = now.toLocaleDateString("id-ID", { weekday: "long" })
      const tglStr = `Diexport pada: ${hari}, ${toDdMmYyyy(now)}`
      doc.text(tglStr, pageW - 14, infoY, { align: "right" })
      doc.text(`Total data: ${res.length} guru & tendik`, 14, infoY)

      autoTable(doc, {
        startY: infoY + 4,
        head,
        body: rows,
        styles: {
          fontSize: 6,
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.25,
          textColor: [50, 50, 50],
          valign: "middle",
        },
        headStyles: {
          fillColor: [13, 148, 136], // Teal-600
          textColor: [255, 255, 255],
          fontSize: 6.5,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [240, 253, 250],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 18, halign: "center" },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 36 },
          4: { cellWidth: 10, halign: "center" },
          5: { cellWidth: 22 },
          6: { cellWidth: 16, halign: "center" },
          7: { cellWidth: 22 },
          8: { cellWidth: 26 },
          9: { cellWidth: 20 },
          10: { cellWidth: 30 },
          11: { cellWidth: 14, halign: "center" },
        },
        margin: { top: 15, bottom: 15, left: 14, right: 14 },
        pageBreak: "auto",
        showFoot: "everyPage",
        footStyles: {
          fillColor: [245, 247, 250],
          textColor: [100, 100, 100],
          fontSize: 6,
          fontStyle: "italic",
          halign: "center",
        },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages()
          const pg = data.pageNumber
          doc.setFontSize(6)
          doc.setTextColor(150, 150, 150)
          doc.text(
            `Halaman ${pg} dari ${pageCount}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: "center" }
          )
        },
      })

      doc.save(`data_guru_${new Date().toISOString().split("T")[0]}.pdf`)
      toast.success(`Data berhasil diexport ke PDF (${res.length} guru & tendik)`)
    } catch (e) {
      console.error(e)
      toast.error("Gagal mengexport PDF data guru & tendik")
    } finally {
      setExportingPdf(false)
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 text-teal-650 dark:text-teal-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Pendidik & Tendik</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {statsQuery.isLoading ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                `${statsQuery.data?.active ?? 0} Staf`
              )}
            </h3>
          </div>
        </div>
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Guru Laki-laki</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {statsQuery.isLoading ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                `${statsQuery.data?.male ?? 0} Staf`
              )}
            </h3>
          </div>
        </div>
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-405 rounded-xl shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Guru Perempuan</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {statsQuery.isLoading ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                `${statsQuery.data?.female ?? 0} Staf`
              )}
            </h3>
          </div>
        </div>
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Semua Terdaftar</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {statsQuery.isLoading ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                `${statsQuery.data?.total ?? 0} Staf`
              )}
            </h3>
          </div>
        </div>
      </div>

      <div className="neumo-card bg-background rounded-[26px] p-5 md:p-6 mb-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:max-w-xs lg:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Cari nama, NIP/NUPTK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 h-10"
              />
            </div>
            <Button 
              variant="secondary" 
              onClick={handleSearch} 
              className="h-10 px-4"
            >
              Cari
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap ml-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Status:</span>
              <Select
                options={[
                  { value: "semua", label: "Semua Status" },
                  { value: "PNS", label: "PNS" },
                  { value: "PPPK", label: "PPPK" },
                  { value: "GTY", label: "GTY" },
                  { value: "GTT", label: "GTT" },
                  { value: "Honor", label: "Honor" },
                  { value: "Lainnya", label: "Lainnya" },
                ]}
                value={statusFilter || "semua"}
                onValueChange={(v) => { setStatusFilter(!v || v === "semua" ? "" : v); setPage(0) }}
              >
                <SelectTrigger className="w-36 !h-8 text-xs font-bold !rounded-xl">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Status</SelectItem>
                  <SelectItem value="PNS">PNS</SelectItem>
                  <SelectItem value="PPPK">PPPK</SelectItem>
                  <SelectItem value="GTY">GTY</SelectItem>
                  <SelectItem value="GTT">GTT</SelectItem>
                  <SelectItem value="Honor">Honor</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Urutkan:</span>
              <Select
                options={[
                  { value: "name_asc", label: "Alfabet (A - Z)" },
                  { value: "name_desc", label: "Alfabet (Z - A)" },
                  { value: "nip_desc", label: "NIP/NUPTK (Terbesar)" },
                  { value: "nip_asc", label: "NIP/NUPTK (Terkecil)" },
                ]}
                value={sortOption}
                onValueChange={(v: any) => { setSortOption(v || "name_asc"); setPage(0) }}
              >
                <SelectTrigger className="w-44 !h-8 text-xs font-bold !rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Alfabet (A - Z)</SelectItem>
                  <SelectItem value="name_desc">Alfabet (Z - A)</SelectItem>
                  <SelectItem value="nip_desc">NIP/NUPTK (Terbesar)</SelectItem>
                  <SelectItem value="nip_asc">NIP/NUPTK (Terkecil)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Tampil</span>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(0) }}>
                <SelectTrigger className="w-16 !h-8 text-xs font-bold !rounded-xl">
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
            <span>Tambah Guru / Tendik</span>
          </button>
        </div>

        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="neumo-card bg-background rounded-[22px] p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))
          ) : !guruList || guruList.length === 0 ? (
            <div className="neumo-card bg-background rounded-[22px] p-8 text-center text-slate-400 font-semibold">
              Tidak ada data guru ditemukan
            </div>
          ) : (
            guruList.map((g) => {
              const isMenuOpen = activeMenuId === g.id
              return (
                <div key={g.id} className="neumo-card bg-background rounded-[22px] p-4 space-y-3 relative text-left">
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
                            className={cn(
                              "absolute right-12 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 min-w-[210px] p-2 space-y-1 block animate-fade-in text-left",
                              index >= guruList.length - 3 ? "bottom-0" : "top-0"
                            )}
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
        <DialogContent className="sm:max-w-lg rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-6 text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            <DialogHeader className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">
                IMPORT GURU
              </span>
              <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
                Import Data Guru
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Unggah file Excel (.xlsx) untuk menambahkan data guru & tendik baru
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 pt-3">
              <button
                onClick={() => { setImportModalOpen(false); setTimeout(() => fileInputRef.current?.click(), 100) }}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-4 transition-all duration-300 hover:shadow-md hover:border-emerald-400/40 hover:bg-emerald-500/5 cursor-pointer text-left"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-110 shrink-0 border border-emerald-500/20 shadow-sm">
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Unggah Berkas Excel</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Mendukung format file .xlsx atau .xls dengan pratinjau data lengkap.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-4">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImportModalOpen(false)}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </Button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
                  Unduh File Template Excel:
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl gap-1.5 text-xs font-extrabold cursor-pointer hover:bg-slate-100"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Unduh Template Excel Guru</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={importPreviewOpen} onOpenChange={(open) => { if (!open) { setImportPreviewOpen(false); setImportPreviewData(null) } }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-6 text-left flex flex-col">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col h-full space-y-4"
          >
            <DialogHeader className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-650 dark:text-emerald-400">
                IMPORT GURU PREVIEW
              </span>
              <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
                Review Lembar Data Guru
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Berikut pratinjau data guru hasil parsing Excel. Pastikan data sudah sesuai.
              </DialogDescription>
            </DialogHeader>

            {/* Stats Cards */}
            {importPreviewData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL GURU</span>
                  <span className="text-lg font-black text-slate-850 dark:text-slate-150 block">
                    {importPreviewData.length} Baris
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">LAKI-LAKI (L)</span>
                  <span className="text-lg font-black text-teal-650 block">
                    {importPreviewData.filter((d: any) => d.jenisKelamin === "L").length} Orang
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PEREMPUAN (P)</span>
                  <span className="text-lg font-black text-rose-600 block">
                    {importPreviewData.filter((d: any) => d.jenisKelamin === "P").length} Orang
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">STATUS DATA</span>
                  <span className="text-lg font-black text-emerald-600 block">
                    Siap diimport
                  </span>
                </div>
              </div>
            )}

            {/* Table wrapper with height limit to prevent footer buttons overlap */}
            <div className="overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 mt-2 bg-slate-50/30 max-h-[42vh] min-h-[220px] w-full">
              <Table>
                <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10 text-[10px] font-black text-slate-450 uppercase py-3">NO</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">NAMA LENGKAP</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">USERNAME</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">L/P</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">NIP / NUPTK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreviewData?.slice(0, 100).map((d: any, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                      <TableCell className="text-muted-foreground font-semibold text-xs py-2.5">{i + 1}</TableCell>
                      <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200 py-2.5">{d.namaLengkap}</TableCell>
                      <TableCell className="font-mono text-xs py-2.5">{d.usernameGuru || "-"}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-md",
                          d.jenisKelamin === "L"
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 border-teal-200"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200"
                        )}>
                          {d.jenisKelamin === "L" ? "L" : d.jenisKelamin === "P" ? "P" : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs py-2.5">{d.nipnuptk || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {importPreviewData && importPreviewData.length > 100 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-450 text-xs py-4 font-bold">
                        ... dan {importPreviewData.length - 100} data guru lainnya tidak ditampilkan di preview
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="!p-0 !bg-transparent !border-0 pt-3 flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => { setImportPreviewOpen(false); setImportPreviewData(null) }}
                className="rounded-xl text-xs font-bold px-4 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                onClick={handleImportConfirm}
                disabled={importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider px-5 shadow-md cursor-pointer"
              >
                {importing ? (
                  <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Menyimpan...</>
                ) : (
                  <span>Import {importPreviewData?.length || 0} Guru</span>
                )}
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-6 text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            <DialogHeader className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">
                EXPORT DATA
              </span>
              <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
                Export Data Guru & Tendik
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pilih format dokumen untuk mengekspor data seluruh guru dan tenaga kependidikan
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => { setExportModalOpen(false); handleExport() }}
                disabled={exporting || exportingPdf}
                className="group flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-400/40 hover:bg-emerald-500/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-110 shadow-sm border border-emerald-500/20">
                  <FileSpreadsheet className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Unduh Excel (.xlsx)</p>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] mx-auto">
                    Semua data lengkap profil guru & tendik
                  </p>
                </div>
              </button>

              <button
                onClick={() => { setExportModalOpen(false); handleExportPdf() }}
                disabled={exporting || exportingPdf}
                className="group flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-rose-400/40 hover:bg-rose-500/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-transform duration-300 group-hover:scale-110 shadow-sm border border-rose-500/20">
                  <FileText className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Unduh PDF (.pdf)</p>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] mx-auto">
                    Laporan rekap cetak ringkas berformat tabel rapi
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportModalOpen(false)}
                className="rounded-xl text-xs font-bold px-4 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
              >
                Batal
              </Button>
            </div>
          </motion.div>
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
