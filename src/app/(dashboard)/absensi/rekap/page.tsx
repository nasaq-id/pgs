"use client"

import { useState, useMemo } from "react"
import { api } from "@/lib/trpc/client"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { drawGlobalKop, type SekolahKopData } from "@/lib/pdf-helper"
import jsPDF from "jspdf"
import { autoTable } from "jspdf-autotable"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  ClipboardCheck,
  Users,
  UserCheck,
  GraduationCap,
  Calendar,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserX,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { parseLocalDate } from "@/lib/utils"

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

function formatHariEfektifPertama(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatHariLiburPendek(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    weekday: "short",
  })
}

type TabType = "siswa" | "guru"
type PeriodeType = "mingguan" | "bulanan" | "semester" | "kustom"

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

export default function RekapPresensiPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>("siswa")
  const [periodeType, setPeriodeType] = useState<PeriodeType>("bulanan")
  
  // Date states
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()))
  const [selectedSemester, setSelectedSemester] = useState<"ganjil" | "genap">("ganjil")
  const [customStart, setCustomStart] = useState<string>(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  )
  const [customEnd, setCustomEnd] = useState<string>(now.toISOString().split("T")[0])

  // Filters
  const [kelasFilter, setKelasFilter] = useState<string>("all")
  const [siswaFilter, setSiswaFilter] = useState<string>("all")
  const [guruFilter, setGuruFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(25)

  const [selectedPerson, setSelectedPerson] = useState<{
    id: string
    name: string
    type: "siswa" | "guru"
  } | null>(null)

  // Queries for options
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 200 })
  const { data: siswaList } = api.siswa.getAll.useQuery(
    { kelasId: kelasFilter !== "all" ? kelasFilter : undefined, limit: 1000 },
    { enabled: activeTab === "siswa" }
  )
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 500 }, { enabled: activeTab === "guru" })

  const utils = api.useUtils()

  // Calculate Date Range based on Period Type
  const { startDate, endDate, dateRangeLabel } = useMemo(() => {
    let start: Date
    let end: Date
    let label = ""

    const year = Number(selectedYear) || now.getFullYear()

    if (periodeType === "mingguan") {
      // Current week range (last 7 days)
      end = new Date()
      start = new Date()
      start.setDate(end.getDate() - 6)
      label = `Mingguan (${start.toLocaleDateString("id-ID")} - ${end.toLocaleDateString("id-ID")})`
    } else if (periodeType === "bulanan") {
      const monthIdx = (Number(selectedMonth) || 1) - 1
      start = new Date(year, monthIdx, 1)
      end = new Date(year, monthIdx + 1, 0)
      const monthName = BULAN_LIST.find((m) => m.value === selectedMonth)?.label || ""
      label = `Bulan ${monthName} ${year}`
    } else if (periodeType === "semester") {
      if (selectedSemester === "ganjil") {
        start = new Date(year, 6, 1) // 1 Juli
        end = new Date(year, 11, 31) // 31 Des
        label = `Semester Ganjil ${year}/${year + 1}`
      } else {
        start = new Date(year + 1, 0, 1) // 1 Jan tahun depan
        end = new Date(year + 1, 5, 30) // 30 Jun tahun depan
        label = `Semester Genap ${year}/${year + 1}`
      }
    } else {
      start = customStart ? parseLocalDate(customStart) : new Date()
      if (customEnd) {
        const e = parseLocalDate(customEnd)
        e.setHours(23, 59, 59, 999)
        end = e
      } else {
        end = new Date()
      }
      label = `Periode ${start.toLocaleDateString("id-ID")} - ${end.toLocaleDateString("id-ID")}`
    }

    return { startDate: start, endDate: end, dateRangeLabel: label }
  }, [periodeType, selectedMonth, selectedYear, selectedSemester, customStart, customEnd])

  // Fetch Rekap Data
  const { data: rekapSiswaData, isLoading: isLoadingSiswa } = api.absensi.getRekapSiswa.useQuery(
    {
      kelasId: kelasFilter !== "all" ? kelasFilter : undefined,
      siswaId: siswaFilter !== "all" ? siswaFilter : undefined,
      tanggalMulai: startDate,
      tanggalSelesai: endDate,
    },
    { enabled: activeTab === "siswa" }
  )

  const { data: rekapGuruData, isLoading: isLoadingGuru } = api.absensi.getRekapGuru.useQuery(
    {
      guruId: guruFilter !== "all" ? guruFilter : undefined,
      tanggalMulai: startDate,
      tanggalSelesai: endDate,
    },
    { enabled: activeTab === "guru" }
  )

  // Filtered Rows for display
  const filteredSiswaSummary = useMemo(() => {
    if (!rekapSiswaData?.summary) return []
    if (!searchQuery.trim()) return rekapSiswaData.summary
    const q = searchQuery.toLowerCase()
    return rekapSiswaData.summary.filter(
      (s) =>
        s.namaLengkap.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.toLowerCase().includes(q)) ||
        s.kelasNama.toLowerCase().includes(q)
    )
  }, [rekapSiswaData, searchQuery])

  const filteredGuruSummary = useMemo(() => {
    if (!rekapGuruData?.summary) return []
    if (!searchQuery.trim()) return rekapGuruData.summary
    const q = searchQuery.toLowerCase()
    return rekapGuruData.summary.filter(
      (g) =>
        g.namaLengkap.toLowerCase().includes(q) ||
        (g.nipnuptk && g.nipnuptk.toLowerCase().includes(q))
    )
  }, [rekapGuruData, searchQuery])

  // Paginated data
  const activeList = activeTab === "siswa" ? filteredSiswaSummary : filteredGuruSummary
  const totalPages = Math.ceil(activeList.length / limit)
  const paginatedData = activeList.slice(page * limit, (page + 1) * limit)
  const hasMore = activeList.length > (page + 1) * limit

  // Guru mode Jam Pelajaran (JP): kolom & satuan rekap jadi JP
  const isGuruJP = activeTab === "guru" && !!rekapGuruData?.isPerJP

  // Info hari efektif periode aktif (dinamis dari data kalender akademik)
  const hariEfektifInfo = useMemo(() => {
    const isSiswa = activeTab === "siswa"
    const data = isSiswa ? rekapSiswaData : rekapGuruData
    const loading = isSiswa ? isLoadingSiswa : isLoadingGuru
    const pertama = data?.hariEfektifPertama ?? null
    const awalLibur: string[] = data?.hariEfektifAwalLibur ?? []
    const hariEfektif = data?.hariEfektif ?? 0
    const awalLiburText = awalLibur.length === 0
      ? null
      : `${awalLibur.slice(0, 4).map(formatHariLiburPendek).join(", ")}${awalLibur.length > 4 ? " …" : ""} libur`
    return { loading, pertama, awalLiburText, hariEfektif }
  }, [activeTab, rekapSiswaData, rekapGuruData, isLoadingSiswa, isLoadingGuru])

  const selectedPersonLogs = useMemo(() => {
    if (!selectedPerson) return []
    const logs = selectedPerson.type === "siswa" ? rekapSiswaData?.logs : rekapGuruData?.logs
    if (!logs) return []
    return logs.filter((log: any) => (log.siswaId || log.guruId) === selectedPerson.id)
  }, [selectedPerson, rekapSiswaData, rekapGuruData])

  // Calculate Overall Statistics
  const stats = useMemo(() => {
    const totalCount = activeList.length
    let totalHadir = 0
    let totalTerlambat = 0
    let totalIzin = 0
    let totalSakit = 0
    let totalAlpha = 0

    activeList.forEach((item) => {
      totalHadir += item.hadirCount
      totalTerlambat += item.terlambatCount
      totalIzin += item.izinCount
      totalSakit += item.sakitCount
      totalAlpha += item.alphaCount
    })

    const totalAttendanceEntries = totalHadir + totalTerlambat + totalIzin + totalSakit + totalAlpha
    const avgPercentage =
      totalCount > 0
        ? Math.round(activeList.reduce((acc, curr) => acc + curr.persentaseHadir, 0) / totalCount)
        : 0

    return {
      totalSubjek: totalCount,
      totalHadir,
      totalTerlambat,
      totalIzin,
      totalSakit,
      totalAlpha,
      totalAttendanceEntries,
      avgPercentage,
    }
  }, [activeList])

  // Export to Excel (CSV)
  const handleExportCSV = () => {
    const isSiswa = activeTab === "siswa"
    const dataList = isSiswa ? filteredSiswaSummary : filteredGuruSummary

    if (dataList.length === 0) {
      toast.error("Tidak ada data presensi untuk diexport")
      return
    }

    const headers = isSiswa
      ? ["No", "NISN", "Nama Siswa", "Kelas", "Hari Efektif", "Hari Tercatat", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase Kehadiran (%)"]
      : isGuruJP
      ? ["No", "NIP / NUPTK", "Nama Guru", "Target JP", "JP Tercatat", "Hadir (JP)", "Terlambat (JP)", "Izin (JP)", "Sakit (JP)", "Alpha (JP)", "Persentase Kehadiran (%)"]
      : ["No", "NIP / NUPTK", "Nama Guru", "Hari Efektif", "Hari Tercatat", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase Kehadiran (%)"]

    const rows = dataList.map((item: any, index: number) => {
      if (isSiswa) {
        return [
          index + 1,
          `"${item.nisn || "-"}"`,
          `"${item.namaLengkap}"`,
          `"${item.kelasNama}"`,
          item.hariEfektif,
          item.hariTercatat,
          item.hadirCount,
          item.terlambatCount,
          item.izinCount,
          item.sakitCount,
          item.alphaCount,
          `"${item.persentaseHadir}%"`,
        ]
      } else if (isGuruJP) {
        return [
          index + 1,
          `"${item.nipnuptk || "-"}"`,
          `"${item.namaLengkap}"`,
          item.targetJP ?? item.hariEfektif,
          item.hariTercatat,
          item.hadirCount,
          item.terlambatCount,
          item.izinCount,
          item.sakitCount,
          item.alphaCount,
          `"${item.persentaseHadir}%"`,
        ]
      } else {
        return [
          index + 1,
          `"${item.nipnuptk || "-"}"`,
          `"${item.namaLengkap}"`,
          item.hariEfektif,
          item.hariTercatat,
          item.hadirCount,
          item.terlambatCount,
          item.izinCount,
          item.sakitCount,
          item.alphaCount,
          `"${item.persentaseHadir}%"`,
        ]
      }
    })

    const titleRow = [`REKAP PRESENSI ${isSiswa ? "SISWA" : "GURU"} - ${dateRangeLabel.toUpperCase()}`]
    const csvContent = [titleRow.join(","), "", headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `rekap-presensi-${activeTab}-${dateRangeLabel.replace(/[^a-zA-Z0-9]/g, "-")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Laporan Rekap Presensi berhasil di-export ke Excel (CSV)")
  }

  // Handle Export PDF (jsPDF + autoTable)
  const handleExportPDF = async () => {
    const isSiswa = activeTab === "siswa"
    const dataList = isSiswa ? filteredSiswaSummary : filteredGuruSummary

    if (dataList.length === 0) {
      toast.error("Tidak ada data presensi untuk diexport")
      return
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

    try {
      const sekolah = await utils.client.lembaga.getSekolah.query()

      let logoBase64: string | null = null
      if (sekolah?.logo) {
        logoBase64 = await urlToBase64(sekolah.logo)
      }

      let customKopBase64: string | null = null
      if (sekolah?.useCustomKop && sekolah?.customKopGambar) {
        customKopBase64 = await urlToBase64(sekolah.customKopGambar)
      }

      const doc = new jsPDF("landscape", "mm", "a4")
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()

      // Render Kop: Custom Kop or Standard Kop
      const useCustomKop = sekolah?.useCustomKop && customKopBase64
      const kopH = useCustomKop ? (sekolah?.customKopTinggi || 35) : 24

      if (useCustomKop && customKopBase64) {
        try {
          doc.addImage(customKopBase64, "JPEG", 0, 0, pageW, kopH)
        } catch {
          try {
            doc.addImage(customKopBase64, "PNG", 0, 0, pageW, kopH)
          } catch {}
        }
      } else {
        drawGlobalKop(doc, sekolah as unknown as SekolahKopData)
      }

      // Title (white background, no teal bar)
      const subHeaderY = kopH + 10
      doc.setTextColor(30, 41, 59) // slate-800
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      const titleText = `REKAP PRESENSI ${isSiswa ? "SISWA" : "GURU"} — ${dateRangeLabel.toUpperCase()}`
      doc.text(titleText, pageW / 2, subHeaderY + 5, { align: "center" })

      // Info line
      const infoY = subHeaderY + 10
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      const now = new Date()
      const hari = now.toLocaleDateString("id-ID", { weekday: "long" })
      const tglCetak = `${hari}, ${now.toLocaleDateString("id-ID")}`
      doc.text(`Dicetak pada: ${tglCetak}`, pageW - 14, infoY, { align: "right" })
      doc.text(`Total: ${dataList.length} ${isSiswa ? "siswa" : "guru"}`, 14, infoY)

      // Table header & body
      const head = isSiswa
        ? [["No", "NISN", "Nama Siswa", "Kelas", "Hari Efektif", "Hari Tercatat", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase (%)"]]
        : isGuruJP
        ? [["No", "NIP/NUPTK", "Nama Guru", "Target JP", "JP Tercatat", "Hadir (JP)", "Terlambat (JP)", "Izin (JP)", "Sakit (JP)", "Alpha (JP)", "Persentase (%)"]]
        : [["No", "NIP/NUPTK", "Nama Guru", "Hari Efektif", "Hari Tercatat", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase (%)"]]

      const rows = dataList.map((item: any, i: number) => {
        if (isSiswa) {
          return [
            i + 1,
            item.nisn || "-",
            item.namaLengkap,
            item.kelasNama,
            item.hariEfektif,
            item.hariTercatat,
            item.hadirCount,
            item.terlambatCount,
            item.izinCount,
            item.sakitCount,
            item.alphaCount,
            `${item.persentaseHadir}%`,
          ]
        } else if (isGuruJP) {
          return [
            i + 1,
            item.nipnuptk || "-",
            item.namaLengkap,
            item.targetJP ?? item.hariEfektif,
            item.hariTercatat,
            item.hadirCount,
            item.terlambatCount,
            item.izinCount,
            item.sakitCount,
            item.alphaCount,
            `${item.persentaseHadir}%`,
          ]
        } else {
          return [
            i + 1,
            item.nipnuptk || "-",
            item.namaLengkap,
            item.hariEfektif,
            item.hariTercatat,
            item.hadirCount,
            item.terlambatCount,
            item.izinCount,
            item.sakitCount,
            item.alphaCount,
            `${item.persentaseHadir}%`,
          ]
        }
      })

      autoTable(doc, {
        startY: infoY + 4,
        head,
        body: rows,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.25,
          textColor: [50, 50, 50],
          valign: "middle",
        },
        headStyles: {
          fillColor: [13, 148, 136],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: isSiswa
          ? {
              0: { cellWidth: 12, halign: "center" },
              1: { cellWidth: 24, halign: "center" },
              2: { cellWidth: 50 },
              3: { cellWidth: 28, halign: "center" },
              4: { cellWidth: 18, halign: "center" },
              5: { cellWidth: 18, halign: "center" },
              6: { cellWidth: 22, halign: "center" },
              7: { cellWidth: 16, halign: "center" },
              8: { cellWidth: 16, halign: "center" },
              9: { cellWidth: 16, halign: "center" },
              10: { cellWidth: 26, halign: "center" },
            }
          : {
              0: { cellWidth: 12, halign: "center" },
              1: { cellWidth: 30, halign: "center" },
              2: { cellWidth: 55 },
              3: { cellWidth: 20, halign: "center" },
              4: { cellWidth: 20, halign: "center" },
              5: { cellWidth: 24, halign: "center" },
              6: { cellWidth: 18, halign: "center" },
              7: { cellWidth: 18, halign: "center" },
              8: { cellWidth: 18, halign: "center" },
              9: { cellWidth: 28, halign: "center" },
            },
        margin: { top: 15, bottom: 15, left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer on every page
          doc.setFontSize(7)
          doc.setTextColor(150, 150, 150)
          doc.text(
            `Halaman ${doc.internal.pages.length - 1}`,
            pageW / 2,
            pageH - 6,
            { align: "center" }
          )
        },
      })

      // Signature on last page
      const finalY = (doc as any).lastAutoTable?.finalY || infoY + 20
      const sigY = finalY + 20

      if (sigY + 40 > pageH - 20) {
        doc.addPage()
      }

      const sigTopY = sigY + 20 > pageH - 20 ? 30 : sigY
      const leftX = pageW * 0.25
      const rightX = pageW * 0.72

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(50, 50, 50)

      // Left: Kepala Sekolah
      doc.text("Mengetahui,", leftX, sigTopY, { align: "center" })
      doc.setFont("helvetica", "bold")
      doc.text("Kepala Sekolah / Madin", leftX, sigTopY + 5, { align: "center" })
      doc.setFont("helvetica", "normal")
      doc.text("( ............................................ )", leftX, sigTopY + 25, { align: "center" })
      doc.setFontSize(7)
      doc.text("NIP: ....................................", leftX, sigTopY + 30, { align: "center" })

      // Right: Penanggung Jawab
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Penanggung Jawab Absensi,", rightX, sigTopY, { align: "center" })
      doc.setFont("helvetica", "bold")
      doc.text(isSiswa ? "Wali Kelas" : "Staff Tata Usaha", rightX, sigTopY + 5, { align: "center" })
      doc.setFont("helvetica", "normal")
      doc.text("( ............................................ )", rightX, sigTopY + 25, { align: "center" })
      doc.setFontSize(7)
      doc.text("NIP: ....................................", rightX, sigTopY + 30, { align: "center" })

      const filename = `rekap-presensi-${activeTab}-${dateRangeLabel.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`
      doc.save(filename)

      toast.success("PDF berhasil diunduh!")
    } catch (err) {
      console.error("PDF export error:", err)
      toast.error("Gagal generate PDF")
    }
  }

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Rekap Presensi</h2>
          <p className="text-sm text-muted-foreground">Rekapitulasi tingkat kehadiran siswa dan guru</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 cursor-pointer border-slate-200 hover:bg-slate-50 font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="gap-2 cursor-pointer border-slate-200 hover:bg-slate-50 font-semibold"
          >
            <Download className="h-4 w-4 text-teal-600" />
            <span>Cetak PDF</span>
          </Button>
        </div>
      </div>

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            {activeTab === "siswa" ? <GraduationCap className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Total {activeTab === "siswa" ? "Siswa" : "Guru"}
            </span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {isLoadingSiswa || isLoadingGuru ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                stats.totalSubjek
              )}
            </h3>
          </div>
        </div>
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Rata-rata Kehadiran</span>
            <h3 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-0.5">
              {isLoadingSiswa || isLoadingGuru ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                `${stats.avgPercentage}%`
              )}
            </h3>
          </div>
        </div>
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Terlambat / Izin / Sakit</span>
            <h3 className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-0.5">
              {isLoadingSiswa || isLoadingGuru ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                stats.totalTerlambat + stats.totalIzin + stats.totalSakit
              )}
            </h3>
          </div>
        </div>
        <div className="neumo-card bg-background rounded-[22px] p-5 flex items-center space-x-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 rounded-xl shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Alpha</span>
            <h3 className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-0.5">
              {isLoadingSiswa || isLoadingGuru ? (
                <Skeleton className="h-7 w-16 rounded" />
              ) : (
                stats.totalAlpha
              )}
            </h3>
          </div>
        </div>
      </div>

      {/* Tab Switcher + Info Hari Efektif */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSearchQuery(""); setPage(0); }} className="w-full">
        <div className="relative flex flex-col md:flex-row items-center justify-center gap-3 mb-6">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="siswa" className="flex-1">
              <GraduationCap className="w-4 h-4" />
              <span>Siswa</span>
            </TabsTrigger>
            <TabsTrigger value="guru" className="flex-1">
              <UserCheck className="w-4 h-4" />
              <span>Guru</span>
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-col items-start gap-0.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/40 px-3 py-1.5 w-full md:w-auto md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
            {hariEfektifInfo.loading ? (
              <Skeleton className="h-3.5 w-48 rounded" />
            ) : !hariEfektifInfo.pertama ? (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hari efektif periode ini: tidak ada</span>
            ) : (
              <>
                <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  Hari efektif {hariEfektifInfo.hariEfektif} hari · dimulai {formatHariEfektifPertama(hariEfektifInfo.pertama)}
                </span>
                {hariEfektifInfo.awalLiburText && (
                  <span className="text-[9px] font-bold text-teal-600/70 dark:text-teal-400/60 normal-case">
                    {hariEfektifInfo.awalLiburText}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </Tabs>

      {/* Filter Card + Search + Table */}
      <div className="neumo-card bg-background rounded-[26px] p-5 md:p-6 space-y-5">
        {/* Row 1: Search + Period Label */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:max-w-xs lg:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder={`Cari nama ${activeTab === "siswa" ? "siswa" : "guru"}...`}
                className="pl-9 h-10"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="text-xs text-muted-foreground font-medium">
              Periode: <strong className="text-slate-800 dark:text-slate-200">{dateRangeLabel}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
              <span>Tampil</span>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-16 !h-8 text-xs font-bold !rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>data</span>
            </div>
          </div>
        </div>

        {/* Row 2: Period Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <Select value={periodeType} onValueChange={(v) => { v && setPeriodeType(v as PeriodeType); setPage(0); }}>
            <SelectTrigger className="w-44 !h-10 !rounded-2xl text-xs font-bold">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mingguan">Mingguan (7 Hari Terakhir)</SelectItem>
              <SelectItem value="bulanan">Bulanan</SelectItem>
              <SelectItem value="semester">Semester</SelectItem>
              <SelectItem value="kustom">Rentang Tanggal Custom</SelectItem>
            </SelectContent>
          </Select>

          {periodeType === "bulanan" && (
            <>
              <Select value={selectedMonth} onValueChange={(v) => { if (v) setSelectedMonth(v); setPage(0); }}>
                <SelectTrigger className="w-40 !h-10 !rounded-2xl text-xs font-bold">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {BULAN_LIST.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setPage(0); }}
                className="w-24 !h-10 !rounded-2xl text-xs font-bold"
                placeholder="Tahun"
              />
            </>
          )}

          {periodeType === "semester" && (
            <>
              <Select value={selectedSemester} onValueChange={(v) => { if (v) setSelectedSemester(v as any); setPage(0); }}>
                <SelectTrigger className="w-48 !h-10 !rounded-2xl text-xs font-bold">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ganjil">Semester Ganjil (Juli - Desember)</SelectItem>
                  <SelectItem value="genap">Semester Genap (Januari - Juni)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setPage(0); }}
                className="w-24 !h-10 !rounded-2xl text-xs font-bold"
                placeholder="Tahun"
              />
            </>
          )}

          {periodeType === "kustom" && (
            <>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setPage(0); }}
                className="w-40 !h-10 !rounded-2xl text-xs font-bold"
              />
              <span className="text-xs text-muted-foreground">s/d</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setPage(0); }}
                className="w-40 !h-10 !rounded-2xl text-xs font-bold"
              />
            </>
          )}

          {activeTab === "siswa" ? (
            <>
              <Select value={kelasFilter} onValueChange={(v) => { setKelasFilter(v ?? "all"); setSiswaFilter("all"); setPage(0); }}>
                <SelectTrigger className="w-44 !h-10 !rounded-2xl text-xs font-bold">
                  <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {kelasList?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.tingkat ? `Kelas ${k.tingkat} - ` : ""}{k.namaKelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={siswaFilter} onValueChange={(v) => { setSiswaFilter(v ?? "all"); setPage(0); }}>
                <SelectTrigger className="w-44 !h-10 !rounded-2xl text-xs font-bold">
                  <SelectValue placeholder="Semua Siswa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Siswa</SelectItem>
                  {siswaList?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.namaLengkap} {s.nisn ? `(${s.nisn})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Select value={guruFilter} onValueChange={(v) => { setGuruFilter(v ?? "all"); setPage(0); }}>
              <SelectTrigger className="w-44 !h-10 !rounded-2xl text-xs font-bold">
                <SelectValue placeholder="Semua Guru" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Guru</SelectItem>
                {guruList?.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.namaLengkap} {g.nipnuptk ? `(NIP: ${g.nipnuptk})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                {activeTab === "siswa" ? (
                  <>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">NISN</th>
                    <th className="py-3.5 px-4">Kelas</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-4">Nama Guru</th>
                    <th className="py-3.5 px-4">NIP / NUPTK</th>
                  </>
                )}
                 <th className="py-3.5 px-4 text-center">{isGuruJP ? "Target JP" : "Hari Efektif"}</th>
                 <th className="py-3.5 px-4 text-center text-indigo-600 dark:text-indigo-400">{isGuruJP ? "JP Tercatat" : "Hari Tercatat"}</th>
                <th className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400">{isGuruJP ? "Hadir (JP)" : "Hadir (H)"}</th>
                <th className="py-3.5 px-4 text-center text-amber-600 dark:text-amber-400">{isGuruJP ? "Terlambat (JP)" : "Terlambat (T)"}</th>
                <th className="py-3.5 px-4 text-center text-blue-600 dark:text-blue-400">{isGuruJP ? "Izin (JP)" : "Izin (I)"}</th>
                <th className="py-3.5 px-4 text-center text-orange-600 dark:text-orange-400">{isGuruJP ? "Sakit (JP)" : "Sakit (S)"}</th>
                <th className="py-3.5 px-4 text-center text-rose-600 dark:text-rose-400">{isGuruJP ? "Alpha (JP)" : "Alpha (A)"}</th>
                <th className="py-3.5 px-4 text-center">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
              {(isLoadingSiswa && activeTab === "siswa") || (isLoadingGuru && activeTab === "guru") ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={12} className="p-4">
                      <Skeleton className="h-6 w-full rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-muted-foreground">
                    Tidak ada data rekap presensi ditemukan untuk periode dan filter ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item: any, idx: number) => {
                  const isHighAtt = item.persentaseHadir >= 90
                  const isMedAtt = item.persentaseHadir >= 75 && item.persentaseHadir < 90
                  const presentCount = isGuruJP
                    ? item.hadirCount + item.terlambatCount + item.sakitCount + item.izinCount
                    : item.hadirCount + item.terlambatCount
                  const denominator = isGuruJP ? (item.targetJP ?? item.hariEfektif) : item.hariEfektif
                  const unitLabel = isGuruJP ? "JP" : "Hari"
                  const progressPercent = denominator > 0 ? Math.min(Math.round((presentCount / denominator) * 100), 100) : 0

                  return (
                    <tr
                      key={item.siswaId || item.guruId}
                      onClick={() => setSelectedPerson({ id: item.siswaId || item.guruId, name: item.namaLengkap, type: activeTab })}
                      className="hover:bg-slate-55/60 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center text-slate-400">{page * limit + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {item.namaLengkap}
                      </td>
                      {activeTab === "siswa" ? (
                        <>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{item.nisn || "-"}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase">
                              {item.kelasNama}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{item.nipnuptk || "-"}</td>
                      )}
                      <td className="py-3 px-4 text-center font-extrabold text-slate-700 dark:text-slate-300">
                        {isGuruJP ? (item.targetJP ?? item.hariEfektif) : item.hariEfektif}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10">
                        {item.hariTercatat}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-600 font-bold bg-emerald-50/30 dark:bg-emerald-950/10">
                        {item.hadirCount}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-600 font-bold">
                        {item.terlambatCount}
                      </td>
                      <td className="py-3 px-4 text-center text-blue-600 font-bold">
                        {item.izinCount}
                      </td>
                      <td className="py-3 px-4 text-center text-orange-600 font-bold">
                        {item.sakitCount}
                      </td>
                      <td className="py-3 px-4 text-center text-rose-600 font-bold bg-rose-50/30 dark:bg-rose-950/10">
                        {item.alphaCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              isHighAtt
                                ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60"
                                : isMedAtt
                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300/60"
                                : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300/60"
                            }`}
                          >
                            {item.persentaseHadir}%
                          </span>
                          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                            {denominator > 0 ? `${presentCount} / ${denominator} ${unitLabel}` : "-"}
                          </span>
                          {denominator > 0 && (
                            <div className="mt-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden max-w-[80px]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isHighAtt ? "bg-emerald-500" : isMedAtt ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {activeList.length > 0 && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Total: {activeList.length} data ditampilkan
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

      {/* Dialog Detail Log Kehadiran */}
      <Dialog open={!!selectedPerson} onOpenChange={(v) => { if (!v) setSelectedPerson(null); }}>
        <DialogContent className="max-w-2xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left z-[9999]">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                Detail Log Kehadiran
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">
                {selectedPerson?.name} ({selectedPerson?.type === "siswa" ? "Siswa" : "Guru"})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPerson(null)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer border border-slate-200/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
            {/* List log */}
            {selectedPersonLogs.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8 font-semibold">
                Tidak ada log presensi detail untuk periode ini.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedPersonLogs.map((log: any) => {
                  const logDate = new Date(log.tanggal).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                  
                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 flex-1 text-left">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{logDate}</p>
                        <p className="text-slate-450 dark:text-slate-400 font-semibold text-[11px]">
                          Jam Masuk: <span className="font-mono text-slate-600 dark:text-slate-400">{log.jamMasuk ? new Date(log.jamMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
                          {" • "}
                          Jam Pulang: <span className="font-mono text-slate-600 dark:text-slate-400">{log.jamPulang ? new Date(log.jamPulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
                        </p>
                        {log.keterangan && (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-850/50 text-slate-600 dark:text-slate-350 border border-slate-200/20 font-semibold leading-relaxed">
                            <span className="font-bold block text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-wide mb-0.5">Alasan/Keterangan:</span>
                            {log.keterangan}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            log.status === "hadir"
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : log.status === "terlambat"
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : log.status === "izin" || log.status === "sakit"
                              ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {log.status === "hadir" ? "Hadir" : log.status === "terlambat" ? "Terlambat" : log.status === "izin" ? "Izin" : log.status === "sakit" ? "Sakit" : "Alpha"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
