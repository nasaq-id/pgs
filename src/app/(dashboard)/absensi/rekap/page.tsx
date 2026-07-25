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
} from "lucide-react"
import { toast } from "sonner"

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
        start = new Date(year, 0, 1) // 1 Jan
        end = new Date(year, 5, 30) // 30 Jun
        label = `Semester Genap ${year - 1}/${year}`
      }
    } else {
      start = customStart ? new Date(customStart + "T00:00:00") : new Date()
      end = customEnd ? new Date(customEnd + "T23:59:59") : new Date()
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

  // Calculate Overall Statistics
  const stats = useMemo(() => {
    const list = activeTab === "siswa" ? filteredSiswaSummary : filteredGuruSummary
    const totalCount = list.length
    let totalHadir = 0
    let totalTerlambat = 0
    let totalIzin = 0
    let totalSakit = 0
    let totalAlpha = 0

    list.forEach((item) => {
      totalHadir += item.hadirCount
      totalTerlambat += item.terlambatCount
      totalIzin += item.izinCount
      totalSakit += item.sakitCount
      totalAlpha += item.alphaCount
    })

    const totalAttendanceEntries = totalHadir + totalTerlambat + totalIzin + totalSakit + totalAlpha
    const avgPercentage =
      totalCount > 0
        ? Math.round(list.reduce((acc, curr) => acc + curr.persentaseHadir, 0) / totalCount)
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
  }, [activeTab, filteredSiswaSummary, filteredGuruSummary])

  // Export to Excel (CSV)
  const handleExportCSV = () => {
    const isSiswa = activeTab === "siswa"
    const dataList = isSiswa ? filteredSiswaSummary : filteredGuruSummary

    if (dataList.length === 0) {
      toast.error("Tidak ada data presensi untuk diexport")
      return
    }

    const headers = isSiswa
      ? ["No", "NISN", "Nama Siswa", "Kelas", "Total Presensi Hari", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase Kehadiran (%)"]
      : ["No", "NIP / NUPTK", "Nama Guru", "Total Presensi Hari", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase Kehadiran (%)"]

    const rows = dataList.map((item: any, index: number) => {
      if (isSiswa) {
        return [
          index + 1,
          `"${item.nisn || "-"}"`,
          `"${item.namaLengkap}"`,
          `"${item.kelasNama}"`,
          item.totalHari,
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
          item.totalHari,
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

      // Sub-header bar (teal)
      const subH = 8
      doc.setFillColor(13, 148, 136)
      doc.rect(0, kopH, pageW, subH, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      const titleText = `REKAP PRESENSI ${isSiswa ? "SISWA" : "GURU"} — ${dateRangeLabel.toUpperCase()}`
      doc.text(titleText, pageW / 2, kopH + 5.5, { align: "center" })

      // Info line
      const infoY = kopH + subH + 4
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
        ? [["No", "NISN", "Nama Siswa", "Kelas", "Total Hari", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase (%)"]]
        : [["No", "NIP/NUPTK", "Nama Guru", "Total Hari", "Hadir (H)", "Terlambat (T)", "Izin (I)", "Sakit (S)", "Alpha (A)", "Persentase (%)"]]

      const rows = dataList.map((item: any, i: number) => {
        if (isSiswa) {
          return [
            i + 1,
            item.nisn || "-",
            item.namaLengkap,
            item.kelasNama,
            item.totalHari,
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
            item.totalHari,
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
        margin: { left: 14, right: 14 },
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
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Laporan & Evaluasi</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Rekap Presensi
          </h2>
          <p className="text-muted-foreground text-xs mt-1">
            Rekapitulasi tingkat kehadiran siswa dan guru secara mingguan, bulanan, atau per semester.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="rounded-2xl h-10 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs font-bold gap-2 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </Button>
          <Button
            onClick={handleExportPDF}
            className="bg-slate-800 hover:bg-slate-900 text-white rounded-2xl h-10 text-xs font-bold gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Cetak PDF</span>
          </Button>
        </div>
      </div>

      {/* Main Tab Switcher (Hidden on print) */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSearchQuery(""); }} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="bg-slate-100/85 dark:bg-slate-900/60 p-1 rounded-2xl w-full max-w-md flex gap-2 border border-slate-200/50 dark:border-slate-800 shadow-inner">
            <TabsTrigger value="siswa" className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span>Siswa</span>
            </TabsTrigger>
            <TabsTrigger value="guru" className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span>Guru</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Filter Card Section (Hidden on print) */}
      <div className="neumo-card bg-background rounded-[24px] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Filter className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Filter Periode & Subjek Presensi
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Tipe Periode */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Tipe Periode
            </Label>
            <Select value={periodeType} onValueChange={(v) => v && setPeriodeType(v as PeriodeType)}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mingguan">Mingguan (7 Hari Terakhir)</SelectItem>
                <SelectItem value="bulanan">Bulanan</SelectItem>
                <SelectItem value="semester">Semester</SelectItem>
                <SelectItem value="kustom">Rentang Tanggal Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Periode Pickers */}
          {periodeType === "bulanan" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pilih Bulan</Label>
                <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
                   <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {BULAN_LIST.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tahun</Label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40"
                />
              </div>
            </>
          )}

          {periodeType === "semester" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Pilih Semester</Label>
                <Select value={selectedSemester} onValueChange={(v) => v && setSelectedSemester(v as any)}>
                   <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ganjil">Semester Ganjil (Juli - Desember)</SelectItem>
                    <SelectItem value="genap">Semester Genap (Januari - Juni)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tahun Pelajaran</Label>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40"
                />
              </div>
            </>
          )}

          {periodeType === "kustom" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40"
                />
              </div>
            </>
          )}

          {/* 3. Subjek Filter (Siswa vs Guru) */}
          {activeTab === "siswa" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Filter Kelas</Label>
                <Select
                  value={kelasFilter}
                  onValueChange={(v) => {
                    setKelasFilter(v ?? "all")
                    setSiswaFilter("all")
                  }}
                >
                   <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Filter Siswa Specific</Label>
                <Select value={siswaFilter} onValueChange={(v) => setSiswaFilter(v ?? "all")}>
                   <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
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
              </div>
            </>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Filter Guru Specific</Label>
              <Select value={guruFilter} onValueChange={(v) => setGuruFilter(v ?? "all")}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold">
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
            </div>
          )}
        </div>
      </div>

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="neumo-card bg-background rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Total {activeTab === "siswa" ? "Siswa" : "Guru"}
            </span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 block">
              {stats.totalSubjek}
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            {activeTab === "siswa" ? <GraduationCap className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
          </div>
        </div>

        <div className="neumo-card bg-background rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rata-rata Kehadiran</span>
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400 block">
              {stats.avgPercentage}%
            </span>
          </div>
          <div className="w-10 h-10 bg-teal-50 dark:bg-teal-950/40 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="neumo-card bg-background rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Terlambat / Izin</span>
            <span className="text-2xl font-black text-amber-500 dark:text-amber-400 block">
              {stats.totalTerlambat + stats.totalIzin + stats.totalSakit}
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-500 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="neumo-card bg-background rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Alpha (Tanpa Ket)</span>
            <span className="text-2xl font-black text-rose-500 dark:text-rose-400 block">
              {stats.totalAlpha}
            </span>
          </div>
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-500 dark:text-rose-400">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="neumo-card bg-background rounded-[24px] overflow-hidden">
        {/* Search Bar (Hidden on print) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari nama ${activeTab === "siswa" ? "siswa" : "guru"}...`}
                className="pl-9 h-10"
              />
            </div>
            <Button type="button" variant="secondary" className="h-10 px-4">
              Cari
            </Button>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            Periode: <strong className="text-slate-800 dark:text-slate-200">{dateRangeLabel}</strong>
          </div>
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
                <th className="py-3.5 px-4 text-center">Total Hari</th>
                <th className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400">Hadir (H)</th>
                <th className="py-3.5 px-4 text-center text-amber-600 dark:text-amber-400">Terlambat (T)</th>
                <th className="py-3.5 px-4 text-center text-blue-600 dark:text-blue-400">Izin (I)</th>
                <th className="py-3.5 px-4 text-center text-orange-600 dark:text-orange-400">Sakit (S)</th>
                <th className="py-3.5 px-4 text-center text-rose-600 dark:text-rose-400">Alpha (A)</th>
                <th className="py-3.5 px-4 text-center">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
              {(isLoadingSiswa && activeTab === "siswa") || (isLoadingGuru && activeTab === "guru") ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={10} className="p-4">
                      <Skeleton className="h-6 w-full rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : (activeTab === "siswa" ? filteredSiswaSummary : filteredGuruSummary).length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-muted-foreground">
                    Tidak ada data rekap presensi ditemukan untuk periode dan filter ini.
                  </td>
                </tr>
              ) : (
                (activeTab === "siswa" ? filteredSiswaSummary : filteredGuruSummary).map((item: any, idx: number) => {
                  const isHighAtt = item.persentaseHadir >= 90
                  const isMedAtt = item.persentaseHadir >= 75 && item.persentaseHadir < 90

                  return (
                    <tr key={item.siswaId || item.guruId} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
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
                        {item.totalHari}
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
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
