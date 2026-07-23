"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { api } from "@/lib/trpc/client"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Upload, Download, Loader2, KeyRound, FileSpreadsheet, FileText, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import SiswaFormDialog from "@/components/siswa/SiswaFormDialog"
import MutasiFormDialog from "@/components/siswa/MutasiFormDialog"
import SiswaDetailDialog from "@/components/siswa/SiswaDetailDialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { formatKelasLabel } from "@/components/jadwal/constants"
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

interface SiswaItem {
  id: string
  nisn: string | null
  nisLokal: string | null
  namaLengkap: string
  jenisKelamin: string | null
  tempatLahir: string | null
  tanggalLahir: Date | string | null
  nik: string | null
  agama: string | null
  alamat: string | null
  status: string | null
  foto: string | null
  kelasId: string | null
  emailSiswa: string | null
  noHpOrtu: string | null
  namaAyah: string | null
  namaIbu: string | null
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

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export default function SiswaPage() {
  const [search, setSearch] = useState("")
  const [querySearch, setQuerySearch] = useState("")
  const [activeTab, setActiveTab] = useState<"aktif" | "mutasi_keluar" | "tidak_aktif">("aktif")
  const [subStatus, setSubStatus] = useState<"aktif" | "aktif_tanpa_rombel">("aktif")
  const [kelasFilter, setKelasFilter] = useState("")
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(25)

  const { data: kelasList } = api.kelas.getAll.useQuery({})

  const uniqueTingkat = useMemo(() => {
    if (!kelasList) return []
    const setT = new Set<string>()
    kelasList.forEach((k) => {
      if (k.tingkat) setT.add(k.tingkat)
    })
    return Array.from(setT).sort()
  }, [kelasList])

  const tingkatHint = uniqueTingkat.length > 0 ? `Tingkat Terdaftar: ${uniqueTingkat.join(", ")}` : ""
  const importInstructionHeader = "PANDUAN IMPOR: (1) Kolom 'Tingkat' diisi dengan angka tingkat (contoh: 7, 8, 9 atau 1, 2, 3). (2) Kolom 'Kelas' diisi dengan nama rombel saja (contoh: A, B, C) atau nama kelas lengkap (contoh: 7A, 7B). Pastikan Rombel sudah didaftarkan terlebih dahulu di menu Rombel."

  const resolveTingkatDanKelasToKelasId = useCallback((tingkat: string, kelasInput: string): string | null => {
    if (!kelasList || !tingkat || !kelasInput) return null
    const normTingkat = tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "").trim().toLowerCase()
    const normKelas = kelasInput.trim().toUpperCase()
    const match = kelasList.find((k) => {
      if (!k.tingkat) return false
      const kt = k.tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "").trim().toLowerCase()
      if (kt !== normTingkat) return false
      const kn = k.namaKelas.trim().toUpperCase()
      return kn === normKelas || kn === `${normTingkat}${normKelas}`
    })
    return match?.id || null
  }, [kelasList])

  const queryStatus = activeTab === "aktif" ? subStatus : activeTab

  const { data: siswaList, isLoading } = api.siswa.getAll.useQuery({
    search: querySearch || undefined,
    status: queryStatus || undefined,
    kelasId: kelasFilter || undefined,
    limit,
    offset: page * limit,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [mutasiOpen, setMutasiOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState<SiswaItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetName, setResetName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkSetKelasOpen, setBulkSetKelasOpen] = useState(false)
  const [targetKelasId, setTargetKelasId] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importMode, setImportMode] = useState<"quick" | "regular" | null>(null)
  const [importPreviewData, setImportPreviewData] = useState<any[] | null>(null)
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
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

  const utils = api.useUtils()

  const removeMutation = api.siswa.remove.useMutation({
    onSuccess: () => {
      toast.success("Data siswa berhasil dihapus")
      setDeleteId(null)
      utils.siswa.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus data siswa"),
  })

  const resetPasswordMutation = api.siswa.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password siswa berhasil direset")
      setResetId(null)
      setResetName("")
      setNewPassword("")
      setShowPassword(false)
    },
    onError: () => toast.error("Gagal mereset password siswa"),
  })

  const bulkRemoveMutation = api.siswa.bulkRemove.useMutation({
    onSuccess: () => {
      toast.success("Data siswa berhasil dihapus")
      setBulkDeleteOpen(false)
      setSelectedIds([])
      utils.siswa.getAll.invalidate()
    },
    onError: () => toast.error("Gagal menghapus data siswa"),
  })

  const bulkSetKelasMutation = api.siswa.bulkSetKelas.useMutation({
    onSuccess: () => {
      toast.success("Siswa berhasil dipindahkan ke kelas")
      setBulkSetKelasOpen(false)
      setSelectedIds([])
      utils.siswa.getAll.invalidate()
      utils.kelas.getAll.invalidate() // Invalidate Rombel view count too
    },
    onError: (err) => toast.error(err.message || "Gagal mengatur kelas siswa"),
  })

  const bulkCreateMutation = api.siswa.bulkCreate.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.length} data siswa berhasil diimport`)
      setImporting(false)
      utils.siswa.getAll.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengimport data siswa")
      setImporting(false)
    },
  })

  const handleSearch = () => {
    setPage(0)
    setQuerySearch(search)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleCreate = () => {
    setEditingSiswa(null)
    setFormOpen(true)
  }

  const handleEdit = (s: SiswaItem) => {
    setEditingSiswa(s)
    setFormOpen(true)
  }

  const handleView = (s: SiswaItem) => {
    setDetailId(s.id)
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
    utils.siswa.getAll.invalidate()
  }

  const handleSelectAll = () => {
    if (!siswaList) return
    if (selectedIds.length === siswaList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(siswaList.map((s) => s.id))
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleBulkDelete = async () => {
    await bulkRemoveMutation.mutateAsync({ ids: selectedIds })
  }

  const handleBulkSetKelas = async () => {
    await bulkSetKelasMutation.mutateAsync({
      ids: selectedIds,
      kelasId: targetKelasId === "unassigned" ? null : targetKelasId,
    })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const [res, sekolah, aktifTa] = await Promise.all([
        utils.client.siswa.getAllExport.query({ search: querySearch || undefined }),
        utils.client.lembaga.getSekolah.query(),
        utils.client.lembaga.getActiveTahunAjaran.query(),
      ])

      const keys = [
        "No", "NISN", "NIS", "Nama Siswa", "JK", "Kelas",
        "Tempat Lahir", "Tanggal Lahir", "Nama Ayah", "Nama Ibu",
        "Alamat", "No HP/WA",
      ]

      const dataRows = res.map((s: any, i: number) => [
        i + 1,
        s.nisn || "",
        s.nisLokal || "",
        s.namaLengkap || "",
        s.jenisKelamin === "L" ? "Laki-laki" : s.jenisKelamin === "P" ? "Perempuan" : "",
        s.namaKelas || "",
        s.tempatLahir || "",
        toDdMmYyyy(s.tanggalLahir),
        s.namaAyah || "",
        s.namaIbu || "",
        s.alamat || "",
        s.noHpWhatsapp || s.noHpOrtu || "",
      ])

      const taLabel = aktifTa?.namaTahunAjaran ? ` Tahun Ajaran ${aktifTa.namaTahunAjaran}${aktifTa.semester ? ` Semester ${aktifTa.semester.charAt(0).toUpperCase() + aktifTa.semester.slice(1)}` : ""}` : ""
      const titleText = `Data Siswa${taLabel}`

      const headerRows: (string | number)[][] = [
        [sekolah?.namaSekolah || "SEKOLAH"],
        [sekolah?.alamat || ""],
        [titleText],
        [],
        keys,
      ]
      const totalCols = keys.length

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
        { hpt: 30 }, // row 0: school name
        { hpt: 18 }, // row 1: address
        { hpt: 22 }, // row 2: title
        { hpt: 8 },  // row 3: spacer
        { hpt: 18 }, // row 4: header
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Data Siswa")
      XLSX.writeFile(wb, `data_siswa_${new Date().toISOString().split("T")[0]}.xlsx`)
      toast.success(`Data berhasil diexport (${res.length} siswa)`)
    } catch {
      toast.error("Gagal mengexport data")
    } finally {
      setExporting(false)
    }
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
        utils.client.siswa.getAllExport.query({ search: querySearch || undefined }),
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

      const rows: (string | number)[][] = res.map((s: any, i: number) => [
        i + 1,
        s.nisn || "-",
        s.nisLokal || "-",
        s.namaLengkap || "-",
        s.jenisKelamin === "L" ? "Laki-laki" : s.jenisKelamin === "P" ? "Perempuan" : "-",
        s.namaKelas || "-",
        s.tempatLahir || "-",
        toDdMmYyyy(s.tanggalLahir),
        s.namaAyah || "-",
        s.namaIbu || "-",
        s.alamat || "-",
        s.noHpWhatsapp || s.noHpOrtu || "-",
      ])

      const head = [["No", "NISN", "NIS", "Nama Siswa", "JK", "Kelas", "Tempat Lahir", "Tanggal Lahir", "Nama Ayah", "Nama Ibu", "Alamat", "No HP/WA"]]

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
      const titleText = `Data Siswa${taLabel}`

      // Teal Theme for Sub-header Bar
      const subHeaderH = 8
      doc.setFillColor(13, 148, 136) // teal-600
      doc.rect(0, kopH, pageW, subHeaderH, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8.5)
      doc.setFont("helvetica", "bold")
      doc.text(titleText, pageW / 2, kopH + 5.5, { align: "center" })

      const infoY = kopH + subHeaderH + 4
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      const now = new Date()
      const hari = now.toLocaleDateString("id-ID", { weekday: "long" })
      const tglStr = `Diexport pada: ${hari}, ${toDdMmYyyy(now)}`
      doc.text(tglStr, pageW - 14, infoY, { align: "right" })
      doc.text(`Total data: ${res.length} siswa`, 14, infoY)

      autoTable(doc, {
        startY: infoY + 4,
        head,
        body: rows,
        styles: {
          fontSize: 5.5,
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.25,
          textColor: [50, 50, 50],
          valign: "middle",
        },
        headStyles: {
          fillColor: [13, 148, 136], // Teal-600 instead of Blue
          textColor: [255, 255, 255],
          fontSize: 6.5,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 22, halign: "center" },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 45 },
          4: { cellWidth: 14, halign: "center" },
          5: { cellWidth: 20, halign: "center" },
          6: { cellWidth: 28 },
          7: { cellWidth: 22, halign: "center" },
          8: { cellWidth: 32 },
          9: { cellWidth: 32 },
          10: { cellWidth: 42 },
          11: { cellWidth: 26 },
        },
        margin: { top: 15, bottom: 15 },
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

      doc.save(`data_siswa_${new Date().toISOString().split("T")[0]}.pdf`)
      toast.success("PDF berhasil diexport")
    } catch {
      toast.error("Gagal mengexport PDF")
    } finally {
      setExportingPdf(false)
    }
  }

  const validateImportData = (data: any[], mode: "quick" | "regular") => {
    const errors: string[] = []
    data.forEach((row, i) => {
      const line = i + 2
      if (!row.namaLengkap) errors.push(`Baris ${line}: Nama Lengkap wajib diisi`)
      if (!row.nisLokal) errors.push(`Baris ${line}: NIS Lokal wajib diisi`)
      if (!row.jenisKelamin) errors.push(`Baris ${line}: Jenis Kelamin wajib diisi (Laki-laki/Perempuan)`)
      if (!row.tingkat) {
        errors.push(`Baris ${line}: Tingkat wajib diisi (contoh: 7 atau Kelas 7)`)
      }
      if (!row.kelasNameInput) {
        errors.push(`Baris ${line}: Kelas wajib diisi (contoh: A, B, atau 7A)`)
      }
      if (row.tingkat && row.kelasNameInput) {
        const resolvedId = resolveTingkatDanKelasToKelasId(row.tingkat, row.kelasNameInput)
        if (!resolvedId) {
          errors.push(`Baris ${line}: Rombel dengan Tingkat "${row.tingkat}" dan Kelas "${row.kelasNameInput}" tidak terdaftar di sistem. Silakan daftarkan Rombel tersebut terlebih dahulu di menu Rombel.`)
        }
      }
      if (mode === "regular") {
        if (!row.nik) errors.push(`Baris ${line}: NIK wajib diisi untuk Regular Import`)
        if (!row.tempatLahir) errors.push(`Baris ${line}: Tempat Lahir wajib diisi untuk Regular Import`)
        if (!row.tanggalLahir) errors.push(`Baris ${line}: Tanggal Lahir wajib diisi (dd/mm/yyyy) untuk Regular Import`)
        if (!row.namaAyah) errors.push(`Baris ${line}: Nama Ayah wajib diisi untuk Regular Import`)
        if (!row.namaIbu) errors.push(`Baris ${line}: Nama Ibu wajib diisi untuk Regular Import`)
      }
    })
    return errors
  }

  const parseAndMap = (data: any[], mode: "quick" | "regular") => {
    const mapped = data.map((row: any) => {
      let tglLahir: Date | undefined
      if (row["Tanggal Lahir"]) {
        const raw = String(row["Tanggal Lahir"]).trim()
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
          const [d, m, y] = raw.split("/")
          tglLahir = new Date(Number(y), Number(m) - 1, Number(d))
        } else {
          const parsed = new Date(raw)
          if (!isNaN(parsed.getTime())) tglLahir = parsed
        }
      }

      const rawTingkat = String(row["Tingkat"] || row.tingkat || row.Tingkat || "").trim()
      const rawKelas = String(row["Kelas"] || row.kelas || row.Kelas || "").trim()
      const kelasId = resolveTingkatDanKelasToKelasId(rawTingkat, rawKelas)

      return {
        tingkat: rawTingkat || undefined,
        kelasNameInput: rawKelas || undefined,
        kelasId,
        nisn: String(row.NISN || row.nisn || "").trim(),
        nisLokal: String(row["NIS Lokal"] || row.NISLokal || row.NIS || row.nis || "").trim(),
        namaLengkap: String(row["Nama Lengkap"] || row.NamaLengkap || row.Nama || row.nama || "").trim(),
        jenisKelamin: (String(row["Jenis Kelamin"] || row.JenisKelamin || row["jenis kelamin"] || "").trim() === "Laki-laki" || String(row["Jenis Kelamin"] || row.JenisKelamin || row["jenis kelamin"] || "").trim() === "L" ? "L" : String(row["Jenis Kelamin"] || row.JenisKelamin || row["jenis kelamin"] || "").trim() === "Perempuan" || String(row["Jenis Kelamin"] || row.JenisKelamin || row["jenis kelamin"] || "").trim() === "P" ? "P" : undefined) as "L" | "P" | undefined,
        tempatLahir: String(row["Tempat Lahir"] || "").trim() || undefined,
        tanggalLahir: tglLahir || undefined,
        nik: String(row.NIK || "").trim() || undefined,
        agama: String(row.Agama || "").trim() || undefined,
        alamat: String(row.Alamat || "").trim() || undefined,
        noHpWhatsapp: String(row["No HP/WA"] || "").trim() || undefined,
        emailSiswa: String(row.Email || "").trim() || undefined,
        status: (String(row.Status || "aktif").trim().toLowerCase() as "aktif" | "lulus" | "pindah" | "keluar") || "aktif",
        hobi: String(row.Hobi || "").trim() || undefined,
        citacita: String(row["Cita-cita"] || "").trim() || undefined,
        pembiayaanSekolah: String(row["Pembiayaan Sekolah"] || "").trim() || undefined,
        noKartuKeluarga: String(row["No KK"] || "").trim() || undefined,
        namaKepalaKeluarga: String(row["Nama Kepala Keluarga"] || "").trim() || undefined,
        namaAyah: String(row["Nama Ayah"] || "").trim() || undefined,
        statusAyah: String(row["Status Ayah"] || "").trim() || undefined,
        nikAyah: String(row["NIK Ayah"] || "").trim() || undefined,
        tempatLahirAyah: String(row["Tempat Lahir Ayah"] || "").trim() || undefined,
        pendidikanAyah: String(row["Pendidikan Ayah"] || "").trim() || undefined,
        pekerjaanAyah: String(row["Pekerjaan Ayah"] || "").trim() || undefined,
        penghasilanAyah: String(row["Penghasilan Ayah"] || "").trim() || undefined,
        noHpAyah: String(row["No HP Ayah"] || "").trim() || undefined,
        namaIbu: String(row["Nama Ibu"] || "").trim() || undefined,
        statusIbu: String(row["Status Ibu"] || "").trim() || undefined,
        nikIbu: String(row["NIK Ibu"] || "").trim() || undefined,
        tempatLahirIbu: String(row["Tempat Lahir Ibu"] || "").trim() || undefined,
        pendidikanIbu: String(row["Pendidikan Ibu"] || "").trim() || undefined,
        pekerjaanIbu: String(row["Pekerjaan Ibu"] || "").trim() || undefined,
        penghasilanIbu: String(row["Penghasilan Ibu"] || "").trim() || undefined,
        noHpIbu: String(row["No HP Ibu"] || "").trim() || undefined,
        usernameSiswa: row.Username || row.username || row.UsernameSiswa || row.usernameSiswa ? String(row.Username || row.username || row.UsernameSiswa || row.usernameSiswa).trim() : undefined,
        passwordSiswa: row.Password || row.password || row.PasswordSiswa || row.passwordSiswa ? String(row.Password || row.password || row.PasswordSiswa || row.passwordSiswa).trim() : undefined,
        
        provinsiAyah: row["Provinsi Ayah"] ? String(row["Provinsi Ayah"]).trim() : undefined,
        kabupatenKotaAyah: row["Kabupaten/Kota Ayah"] ? String(row["Kabupaten/Kota Ayah"]).trim() : undefined,
        kecamatanAyah: row["Kecamatan Ayah"] ? String(row["Kecamatan Ayah"]).trim() : undefined,
        kelurahanDesaAyah: row["Desa/Kelurahan Ayah"] ? String(row["Desa/Kelurahan Ayah"]).trim() : undefined,
        rtAyah: row["RT Ayah"] ? String(row["RT Ayah"]).trim() : undefined,
        rwAyah: row["RW Ayah"] ? String(row["RW Ayah"]).trim() : undefined,
        alamatLengkapAyah: row["Alamat Ayah"] ? String(row["Alamat Ayah"]).trim() : undefined,
        kodePosAyah: row["Kode Pos Ayah"] ? String(row["Kode Pos Ayah"]).trim() : undefined,

        provinsiIbu: row["Provinsi Ibu"] ? String(row["Provinsi Ibu"]).trim() : undefined,
        kabupatenKotaIbu: row["Kabupaten/Kota Ibu"] ? String(row["Kabupaten/Kota Ibu"]).trim() : undefined,
        kecamatanIbu: row["Kecamatan Ibu"] ? String(row["Kecamatan Ibu"]).trim() : undefined,
        kelurahanDesaIbu: row["Desa/Kelurahan Ibu"] ? String(row["Desa/Kelurahan Ibu"]).trim() : undefined,
        rtIbu: row["RT Ibu"] ? String(row["RT Ibu"]).trim() : undefined,
        rwIbu: row["RW Ibu"] ? String(row["RW Ibu"]).trim() : undefined,
        alamatLengkapIbu: row["Alamat Ibu"] ? String(row["Alamat Ibu"]).trim() : undefined,
        kodePosIbu: row["Kode Pos Ibu"] ? String(row["Kode Pos Ibu"]).trim() : undefined,
      }
    }).filter((r) => r.namaLengkap && r.nisLokal)

    const errors = validateImportData(mapped, mode)
    if (errors.length > 0) {
      const msg = errors.slice(0, 5).join("\n") + (errors.length > 5 ? `\n... dan ${errors.length - 5} error lainnya` : "")
      toast.error(msg, { duration: 8000 })
      return null
    }
    return mapped
  }

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !importMode) return
    setImportModalOpen(false)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false })
      const mapped = parseAndMap(rows, importMode)

      if (!mapped) return

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

  const handleDownloadQuickTemplate = () => {
    const headers = [
      "NISN", "NIS Lokal", "Nama Lengkap", "Jenis Kelamin", "Tingkat", "Kelas", "Username", "Password"
    ]
    const sampleTingkat = uniqueTingkat[0] || "7"

    const aoa: any[][] = []
    aoa.push([importInstructionHeader])
    aoa.push(headers)
    aoa.push([
      "1234567890", "12345", "Contoh Nama Siswa", "Laki-laki", sampleTingkat, "A", "siswa123", "password123"
    ])

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    ws["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 16 }
    ]

    const mergeEnd = { r: 0, c: headers.length - 1 }
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: mergeEnd }]

    // Apply text format to all cells
    const ref = XLSX.utils.decode_range(ws["!ref"] || "A1:H3")
    for (let r = ref.s.r; r <= ref.e.r; r++) {
      for (let c = ref.s.c; c <= ref.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (ws[addr]) {
          ws[addr].t = "s"
          ws[addr].z = "@"
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template Quick")
    XLSX.writeFile(wb, "template_quick_impor_siswa.xlsx")
    toast.success("Template Quick Import berhasil didownload")
  }

  const handleDownloadTemplate = () => {
    const headers = [
      "NISN", "NIS Lokal", "Nama Lengkap", "Jenis Kelamin", "Tingkat", "Kelas", "Tempat Lahir",
      "Tanggal Lahir", "NIK", "Agama", "Alamat", "No HP/WA", "Email", "Status",
      "Hobi", "Cita-cita", "Pembiayaan Sekolah", "No KK", "Nama Kepala Keluarga",
      "Nama Ayah", "Status Ayah", "NIK Ayah", "Tempat Lahir Ayah",
      "Pendidikan Ayah", "Pekerjaan Ayah", "Penghasilan Ayah", "No HP Ayah",
      "Provinsi Ayah", "Kabupaten/Kota Ayah", "Kecamatan Ayah", "Desa/Kelurahan Ayah", "RT Ayah", "RW Ayah", "Alamat Ayah", "Kode Pos Ayah",
      "Nama Ibu", "Status Ibu", "NIK Ibu", "Tempat Lahir Ibu",
      "Pendidikan Ibu", "Pekerjaan Ibu", "Penghasilan Ibu", "No HP Ibu",
      "Provinsi Ibu", "Kabupaten/Kota Ibu", "Kecamatan Ibu", "Desa/Kelurahan Ibu", "RT Ibu", "RW Ibu", "Alamat Ibu", "Kode Pos Ibu",
    ]

    const sampleTingkat = uniqueTingkat[0] || "7"

    const aoa: any[][] = []
    aoa.push([importInstructionHeader])
    aoa.push(headers)
    aoa.push([
      "1234567890", "12345", "Contoh Nama Siswa", "Laki-laki", sampleTingkat, "A", "Jakarta",
      "01/01/2010", "3171234567890123", "Islam", "Jl. Contoh No. 1", "08123456789",
      "siswa@sekolah.sch.id", "aktif", "Membaca", "Dokter", "Swasta",
      "1234567890123456", "Ayah Contoh", "Masih Hidup", "3171234567890123", "Jakarta",
      "SMA", "Karyawan Swasta", "Rp 3.000.000 - Rp 5.000.000", "08123456788",
      "Provinsi Contoh", "Kabupaten Contoh", "Kecamatan Contoh", "Desa Contoh", "01", "02", "Jl. Ayah No. 5", "12345",
      "Ibu Contoh", "Masih Hidup", "3171234567890124", "Jakarta",
      "SMA", "Ibu Rumah Tangga", "Kurang dari Rp 1.000.000", "08123456787",
      "Provinsi Contoh", "Kabupaten Contoh", "Kecamatan Contoh", "Desa Contoh", "01", "02", "Jl. Ibu No. 5", "12345",
    ])

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    ws["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 10 },
      { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 28 }, { wch: 16 },
      { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
      { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 20 },
      { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 12 },
      { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 14 },
      { wch: 20 }, { wch: 22 }, { wch: 16 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
      { wch: 10 }, { wch: 28 }, { wch: 12 },
    ]

    const totalCols = headers.length
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }]

    const colRange = XLSX.utils.decode_range(ws["!ref"] || `A1:AX3`)
    for (let r = colRange.s.r; r <= colRange.e.r; r++) {
      for (let c = colRange.s.c; c <= colRange.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (ws[addr]) {
          ws[addr].t = "s"
          ws[addr].z = "@"
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa")
    XLSX.writeFile(wb, "template_import_siswa.xlsx")
    toast.success("Template berhasil didownload")
  }

  const hasMore = siswaList ? siswaList.length >= limit : false
  const totalPages = hasMore ? page + 2 : page + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Data Siswa</h2>
          <p className="text-sm text-muted-foreground">Kelola data siswa sekolah secara berkala</p>
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

      {/* Tabs Menu */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl mb-6 overflow-x-auto w-full scrollbar-none border border-slate-200/50 dark:border-slate-800">
        {[
          { id: "aktif", label: "Data Siswa Aktif" },
          { id: "mutasi_keluar", label: "Mutasi Keluar" },
          { id: "tidak_aktif", label: "Alumni / Tidak Aktif" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any)
              setPage(0)
            }}
            className={`flex-1 shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/20 dark:border-slate-700/50"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 md:p-6 mb-6 space-y-5">
        {/* Row 1: Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input on the Left */}
          <div className="relative flex items-center w-full md:max-w-xs lg:max-w-md">
            <Search className="absolute left-3.5 text-slate-400 w-4 h-4 shrink-0" />
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
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

          {/* Filters on the Right (Status/Sub-status, Class, Row Limit) */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {activeTab === "aktif" && (
              <Select value={subStatus} onValueChange={(v) => { setSubStatus(v as any); setPage(0) }}>
                <SelectTrigger className="w-40 !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40">
                  <SelectValue placeholder="Status Aktif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Semua Status Aktif</SelectItem>
                  <SelectItem value="aktif_tanpa_rombel">Aktif Tanpa Rombel</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Select value={kelasFilter} onValueChange={(v) => { setKelasFilter(v ?? ""); setPage(0) }}>
              <SelectTrigger className="w-44 !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40">
                <SelectValue placeholder="Semua Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kelas</SelectItem>
                {kelasList?.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
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
        </div>

        {/* Row 2: CSV Operations & Add Student */}
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
              className="flex-1 sm:flex-initial bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              <span>Ekspor</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === "mutasi_keluar") {
                setMutasiOpen(true)
              } else {
                handleCreate()
              }
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-teal-500/5 transition-all flex items-center justify-center cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>{activeTab === "mutasi_keluar" ? "Catat Mutasi" : activeTab === "tidak_aktif" ? "Catat Alumni" : "Tambah Siswa"}</span>
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-teal-500/[0.04] dark:bg-teal-500/[0.02] border border-teal-500/20 dark:border-teal-500/10 rounded-2xl p-3 px-5 flex-wrap gap-3">
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
              ⚡ {selectedIds.length} siswa terpilih
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTargetKelasId("unassigned")
                  setBulkSetKelasOpen(true)
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Atur Rombel / Kelas
              </button>
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus {selectedIds.length} Data
              </button>
            </div>
          </div>
        )}

        {/* Mobile Card List View (Visible on mobile, hidden on desktop) */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ))
          ) : !siswaList || siswaList.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-8 text-center text-slate-400 font-semibold shadow-sm">
              Tidak ada data siswa ditemukan
            </div>
          ) : (
            siswaList.map((s) => {
              const currentKelas = kelasList?.find(k => k.id === s.kelasId)?.namaKelas
              return (
                <div key={s.id} className="glass-card rounded-[22px] border border-slate-200/85 dark:border-slate-800/85 p-4 shadow-sm space-y-3 relative text-left bg-white dark:bg-slate-900/40">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => handleSelectItem(s.id)}
                      className="accent-teal-600 cursor-pointer mt-2 shrink-0"
                    />
                    <div className="flex justify-between items-start flex-1 min-w-0">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
                        {s.foto ? (
                          <img src={s.foto} alt={s.namaLengkap} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                            {s.namaLengkap.substring(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-slate-250 text-xs sm:text-sm leading-tight truncate">{s.namaLengkap}</h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">NIS: {s.nisLokal || "—"} | NISN: {s.nisn || "—"}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase rounded-full border shrink-0",
                        s.status === "aktif"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30"
                          : s.status === "lulus"
                          ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30"
                          : s.status === "pindah" || s.status === "keluar"
                          ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30"
                          : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/30"
                      )}
                    >
                      {s.status === "aktif"
                        ? "Aktif"
                        : s.status === "lulus"
                        ? "Lulus"
                        : s.status === "pindah"
                        ? "Pindah"
                        : s.status === "keluar"
                        ? "Keluar"
                        : s.status || "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kelas</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                        {s.kelasId && currentKelas ? currentKelas : (
                          <span className="text-slate-400 font-medium text-[10px] uppercase">Belum Masuk Kelas</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kontak Wali</span>
                      <p className="font-semibold text-slate-700 dark:text-slate-350 mt-0.5 truncate">{s.noHpOrtu || "—"}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Aksi:</span>
                    <div className="flex space-x-1.5 items-center">
                      <button
                        onClick={() => handleView(s)}
                        className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        title="Detail"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleEdit(s)}
                        className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="w-7 h-7 flex items-center justify-center border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/20">
                          <MoreHorizontal size={14} strokeWidth={2.5} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => { setResetId(s.id); setResetName(s.namaLengkap) }} className="gap-2 clickable text-xs">
                            <KeyRound className="h-3.5 w-3.5" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(s.id)}
                            className="gap-2 clickable text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Table View (Visible on desktop, hidden on mobile) */}
        <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-150 dark:border-slate-800">
              <TableRow>
                <TableHead className="w-10 text-center py-3">
                  <input
                    type="checkbox"
                    checked={!!siswaList && siswaList.length > 0 && selectedIds.length === siswaList.length}
                    onChange={handleSelectAll}
                    className="accent-teal-600 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="w-12 text-center text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">No</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">NISN</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">NIS</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Nama Siswa</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Kelas</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3 text-center">Jenis Kelamin</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Tempat, Tanggal Lahir</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Nama Ayah</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Nama Ibu</TableHead>
                <TableHead className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-center w-24 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider py-3">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 12 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !siswaList || siswaList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-20 text-slate-400 dark:text-slate-500 font-semibold">
                    Tidak ada data siswa ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                siswaList.map((s, index) => {
                  const currentKelas = kelasList?.find(k => k.id === s.kelasId)?.namaKelas
                  return (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => handleSelectItem(s.id)}
                          className="accent-teal-600 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-400 dark:text-slate-500 text-[11px]">
                        {page * limit + index + 1}
                      </TableCell>
                      <TableCell className="font-bold text-xs tracking-wider text-slate-700 dark:text-slate-350 font-mono">
                        {s.nisn || "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-xs tracking-wider text-slate-650 dark:text-slate-400 font-mono">
                        {s.nisLokal || "—"}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 shadow-inner">
                            {s.foto ? (
                              <img src={s.foto} alt={s.namaLengkap} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                                {s.namaLengkap.substring(0, 2)}
                              </span>
                            )}
                          </div>
                          <span>{s.namaLengkap}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.kelasId && currentKelas ? (
                          <span className="font-bold text-slate-700 dark:text-slate-300">{currentKelas}</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/50 dark:border-slate-750 rounded-full text-[9px] font-black uppercase whitespace-nowrap">
                            Belum Masuk Kelas
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs text-slate-600 dark:text-slate-350">
                        {s.jenisKelamin === "L" ? "L" : s.jenisKelamin === "P" ? "P" : "—"}
                      </TableCell>
                      <TableCell className="text-xs leading-relaxed text-slate-650 dark:text-slate-450 whitespace-normal">
                        {s.tempatLahir ? `${s.tempatLahir}, ` : ""}
                        {s.tanggalLahir
                          ? new Date(s.tanggalLahir).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-650 dark:text-slate-400">
                        {s.namaAyah || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-650 dark:text-slate-400">
                        {s.namaIbu || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-3 py-1 text-[9px] font-black uppercase rounded-full border whitespace-nowrap",
                            s.status === "aktif"
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                              : s.status === "lulus"
                              ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30"
                              : s.status === "pindah" || s.status === "keluar"
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30"
                          )}
                        >
                          {s.status === "aktif"
                            ? "Aktif"
                            : s.status === "lulus"
                            ? "Lulus"
                            : s.status === "pindah"
                            ? "Pindah"
                            : s.status === "keluar"
                            ? "Keluar"
                            : s.status || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="relative text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenuId(activeMenuId === s.id ? null : s.id)
                          }}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border rounded-lg hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm mx-auto cursor-pointer focus:outline-none",
                            activeMenuId === s.id
                              ? "border-slate-800 text-slate-800 dark:border-slate-650 dark:text-slate-200"
                              : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                          )}
                        >
                          <MoreHorizontal className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {activeMenuId === s.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-12 top-0 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 min-w-[210px] p-2 space-y-1 block animate-fade-in text-left"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                handleView(s)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors shrink-0">
                                <Eye size={14} strokeWidth={2.5} />
                              </div>
                              <span>Detail Lengkap</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                handleEdit(s)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                                <Pencil size={14} strokeWidth={2.5} />
                              </div>
                              <span>Edit Data</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null)
                                setResetId(s.id)
                                setResetName(s.namaLengkap)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-300 font-semibold text-xs transition-colors group cursor-pointer text-left"
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
                                setDeleteId(s.id)
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-450 font-semibold text-xs transition-colors group cursor-pointer text-left"
                            >
                              <div className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-450 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors shrink-0">
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

        {/* Pagination Section */}
        {siswaList && siswaList.length > 0 && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Total: {siswaList.length} data ditampilkan
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
                        : "border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                Export Data Siswa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pilih format dokumen untuk mengekspor seluruh daftar siswa aktif
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => { setExportModalOpen(false); handleExport() }}
                disabled={exporting}
                className="group flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-400/40 hover:bg-emerald-500/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-110 shadow-sm border border-emerald-500/20">
                  <FileSpreadsheet className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-885 dark:text-slate-200">Unduh Excel (.xlsx)</p>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-[150px] mx-auto">
                    Berisi lembar data terperinci semua kolom siswa
                  </p>
                </div>
              </button>

              <button
                onClick={() => { setExportModalOpen(false); handleExportPdf() }}
                disabled={exportingPdf}
                className="group flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-rose-400/40 hover:bg-rose-500/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-transform duration-300 group-hover:scale-110 shadow-sm border border-rose-500/20">
                  <FileText className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-885 dark:text-slate-200">Unduh PDF (.pdf)</p>
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

      <Dialog open={importModalOpen} onOpenChange={(open) => { if (!open) setImportMode(null); setImportModalOpen(open) }}>
        <DialogContent className="sm:max-w-lg rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-6 text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            <DialogHeader className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">
                IMPORT WIZARD
              </span>
              <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
                Import Data Siswa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Unggah file Excel (.xlsx) untuk menambahkan data siswa secara cepat
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => { setImportMode("quick"); setImportModalOpen(false); setTimeout(() => fileInputRef.current?.click(), 100) }}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-4 transition-all duration-300 hover:shadow-md hover:border-emerald-400/40 hover:bg-emerald-500/5 cursor-pointer text-left"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-110 shrink-0 border border-emerald-500/20 shadow-sm">
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Mode Quick Import</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Import dengan kolom wajib (NISN, NIS Lokal, Nama, JK, Tingkat, Kelas, User, Pass). Cepat & instan.
                  </p>
                </div>
              </button>

              <button
                onClick={() => { setImportMode("regular"); setImportModalOpen(false); setTimeout(() => fileInputRef.current?.click(), 100) }}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-4 transition-all duration-300 hover:shadow-md hover:border-teal-400/40 hover:bg-teal-500/5 cursor-pointer text-left"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-teal-550/10 text-teal-600 dark:text-teal-450 transition-transform duration-300 group-hover:scale-110 shrink-0 border border-teal-500/20 shadow-sm">
                  <Eye className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Mode Regular Import</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Import data profil lengkap siswa beserta detail ayah, ibu, wali & alamat lengkap.
                  </p>
                </div>
              </button>
            </div>

            <div className="rounded-2xl p-3 bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 text-xs">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mb-1 uppercase tracking-wider">💡 PANDUAN PENTING TINGKAT & KELAS</span>
              <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                Untuk mencegah error impor, harap pastikan data di Excel ditulis sesuai format berikut:
              </p>
              <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
                <li><strong>Kolom Tingkat</strong>: Isikan angka tingkat saja (contoh: <code>7</code>, <code>8</code>, <code>9</code>).</li>
                <li><strong>Kolom Kelas</strong>: Isikan nama rombel (contoh: <code>A</code>, <code>B</code>) atau kelas lengkap (contoh: <code>7A</code>, <code>7B</code>).</li>
                <li>Pastikan Rombel/Kelas tujuan sudah dibuat di menu <strong>Manajemen Rombel / Kelas</strong> sebelum melakukan impor.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setImportModalOpen(false); setImportMode(null) }}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </Button>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
                  Unduh File Template Excel:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900/60 font-extrabold cursor-pointer"
                    onClick={handleDownloadQuickTemplate}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Template Quick</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs font-extrabold cursor-pointer"
                    onClick={handleDownloadTemplate}
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Template Regular</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={importPreviewOpen} onOpenChange={(open) => { if (!open) { setImportPreviewOpen(false); setImportPreviewData(null); setImportMode(null) } }}>
        <DialogContent className={cn(
          "rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-6 text-left flex flex-col max-h-[90vh]",
          importMode === "quick" ? "sm:max-w-md" : "sm:max-w-5xl"
        )}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col h-full space-y-4"
          >
            {importMode === "quick" ? (
              <>
                <DialogHeader className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-650 dark:text-emerald-400">
                    QUICK IMPORT PREVIEW
                  </span>
                  <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
                    Konfirmasi Import Cepat
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Periksa ringkasan baris data siswa yang siap dimasukkan
                  </DialogDescription>
                </DialogHeader>

                {importPreviewData && (
                  <div className="space-y-4 pt-3">
                    <div className="flex items-center gap-3.5 rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/20 shadow-xs">
                      <div className="size-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">
                        <Upload className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-850 dark:text-slate-150">
                          {importPreviewData.length} Siswa Ditemukan
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          Semua baris valid & siap diimport
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 p-3 max-h-52 overflow-y-auto space-y-2">
                      {importPreviewData.slice(0, 10).map((d, i) => {
                        const kls = kelasList?.find((k) => k.id === d.kelasId)
                        return (
                        <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">{i + 1}.</span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-350 truncate">{d.namaLengkap}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {kls && (
                              <span className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md">
                                {kls.namaKelas}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              NISN: {d.nisn || "-"}
                            </span>
                          </div>
                        </div>
                      )})}
                      {importPreviewData.length > 10 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-1 font-semibold">
                          + {importPreviewData.length - 10} data siswa lainnya
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <DialogFooter className="!p-0 !bg-transparent !border-0 pt-4 flex gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => { setImportPreviewOpen(false); setImportPreviewData(null); setImportMode(null) }}
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
                      <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Proses...</>
                    ) : (
                      <span>Konfirmasi Import</span>
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">
                    REGULAR IMPORT PREVIEW
                  </span>
                  <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
                    Review Lembar Data Siswa
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Berikut pratinjau data lengkap siswa hasil parsing Excel. Silakan periksa kembali sebelum menyimpan.
                  </DialogDescription>
                </DialogHeader>

                {/* Neomorphic Summary Stats Cards inside Preview */}
                {importPreviewData && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                    <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL DATA</span>
                      <span className="text-lg font-black text-slate-850 dark:text-slate-150 block">
                        {importPreviewData.length} Baris
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">LAKI-LAKI (L)</span>
                      <span className="text-lg font-black text-teal-600 block">
                        {importPreviewData.filter((d) => d.jenisKelamin === "L").length} Siswa
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PEREMPUAN (P)</span>
                      <span className="text-lg font-black text-rose-600 block">
                        {importPreviewData.filter((d) => d.jenisKelamin === "P").length} Siswa
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-0.5 shadow-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">STATUS VALID</span>
                      <span className="text-lg font-black text-emerald-600 block flex items-center gap-1">
                        100% Valid
                      </span>
                    </div>
                  </div>
                )}

                {/* Scrollable Data Table Preview with restricted height to prevent overlaps */}
                <div className="overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 mt-2 bg-slate-50/30 max-h-[42vh] min-h-[220px] w-full">
                  <Table>
                    <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-10 text-[10px] font-black text-slate-450 uppercase py-3">NO</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">NISN</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">NIS LOKAL</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">NAMA LENGKAP</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">L/P</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">KELAS</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-450 uppercase py-3">ALAMAT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreviewData?.slice(0, 100).map((d, i) => {
                        const kls = kelasList?.find((k) => k.id === d.kelasId)
                        return (
                        <TableRow key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                          <TableCell className="text-muted-foreground font-semibold text-xs py-2.5">{i + 1}</TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400 py-2.5">{d.nisn || "-"}</TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400 py-2.5">{d.nisLokal || "-"}</TableCell>
                          <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200 py-2.5">{d.namaLengkap}</TableCell>
                          <TableCell className="py-2.5">
                            <Badge className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-md",
                              d.jenisKelamin === "L"
                                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 border-teal-200"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200"
                            )}>
                              {d.jenisKelamin || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-teal-600 dark:text-teal-400 py-2.5">
                            {kls ? kls.namaKelas : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-[200px] truncate py-2.5">{d.alamat || "-"}</TableCell>
                        </TableRow>
                      )})}
                      {importPreviewData && importPreviewData.length > 100 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-450 text-xs py-4 font-bold">
                            ... dan {importPreviewData.length - 100} data siswa lainnya tidak ditampilkan di preview
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <DialogFooter className="!p-0 !bg-transparent !border-0 pt-3 flex gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => { setImportPreviewOpen(false); setImportPreviewData(null); setImportMode(null) }}
                    className="rounded-xl text-xs font-bold px-4 cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleImportConfirm}
                    disabled={importing}
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider px-5 shadow-md cursor-pointer"
                  >
                    {importing ? (
                      <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <span>Import {importPreviewData?.length || 0} Data</span>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>

      <SiswaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingSiswa}
        onSuccess={handleFormSuccess}
      />

      <MutasiFormDialog
        open={mutasiOpen}
        onOpenChange={setMutasiOpen}
        onSuccess={handleFormSuccess}
      />

      {detailId && (
        <SiswaDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          siswaId={detailId}
        />
      )}

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Hapus Data Siswa Terpilih"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} data siswa yang terpilih? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleBulkDelete}
        loading={bulkRemoveMutation.isPending}
      />

      <Dialog open={bulkSetKelasOpen} onOpenChange={setBulkSetKelasOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Rombel / Kelas Sekaligus</DialogTitle>
            <DialogDescription>
              Pilih rombongan belajar (kelas) baru untuk {selectedIds.length} siswa terpilih.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilih Rombel / Kelas Tujuan
              </label>
              <Select
                value={targetKelasId ?? ""}
                onValueChange={(val) => setTargetKelasId(val || null)}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue placeholder="Pilih kelas..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">-- Keluarkan dari Kelas (Kosongkan Rombel) --</SelectItem>
                  {kelasList?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {formatKelasLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkSetKelasOpen(false)}
              disabled={bulkSetKelasMutation.isPending}
            >
              Batal
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleBulkSetKelas}
              disabled={bulkSetKelasMutation.isPending || !targetKelasId}
            >
              {bulkSetKelasMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Hapus Data Siswa"
        description="Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        loading={removeMutation.isPending}
      />

      <AlertDialog open={!!resetId} onOpenChange={(open) => { if (!open) { setResetId(null); setResetName(""); setNewPassword(""); setShowPassword(false) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password Siswa</AlertDialogTitle>
            <AlertDialogDescription>
              Masukkan password baru untuk <strong>{resetName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password baru"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10"
              autoFocus
            />
            <Tooltip>
              <TooltipTrigger
                delay={0}
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipPositioner>
                  <TooltipPopup>{showPassword ? "Sembunyikan password" : "Tampilkan password"}</TooltipPopup>
                </TooltipPositioner>
              </TooltipPortal>
            </Tooltip>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPasswordMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={!newPassword || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mereset...</>
              ) : (
                "Reset Password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
