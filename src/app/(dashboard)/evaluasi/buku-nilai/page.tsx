"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Save,
  Loader2,
  FileSpreadsheet,
  Printer,
  Settings,
  Sparkles,
  BookOpen,
  Award,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  HelpCircle,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import jsPDF from "jspdf"
import { autoTable } from "jspdf-autotable"
import * as XLSX from "xlsx"

// Helper function to map class level to Fase
function getFaseFromTingkat(tingkat: string | null | undefined): string {
  if (!tingkat) return "Fase A"
  const clean = tingkat.trim().toUpperCase()
  if (["1", "2", "I", "II"].includes(clean)) return "Fase A"
  if (["3", "4", "III", "IV"].includes(clean)) return "Fase B"
  if (["5", "6", "V", "VI"].includes(clean)) return "Fase C"
  if (["7", "8", "9", "VII", "VIII", "IX"].includes(clean)) return "Fase D"
  if (["10", "X"].includes(clean)) return "Fase E"
  if (["11", "12", "XI", "XII"].includes(clean)) return "Fase F"

  if (clean.includes("10") || clean.includes("X")) return "Fase E"
  if (clean.includes("11") || clean.includes("XI") || clean.includes("12") || clean.includes("XII")) return "Fase F"
  if (clean.includes("7") || clean.includes("VII") || clean.includes("8") || clean.includes("VIII") || clean.includes("9") || clean.includes("IX")) return "Fase D"
  if (clean.includes("5") || clean.includes("V") || clean.includes("6") || clean.includes("VI")) return "Fase C"
  if (clean.includes("3") || clean.includes("III") || clean.includes("4") || clean.includes("IV")) return "Fase B"
  if (clean.includes("1") || clean.includes("I") || clean.includes("2") || clean.includes("II")) return "Fase A"

  return "Fase A"
}

// Helpers to draw vector logos inside PDF
function drawTutWuriLogo(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(30, 144, 255) // DodgerBlue
  doc.circle(x + size / 2, y + size / 2, size / 2, "F")
  
  doc.setFillColor(255, 215, 0) // Gold
  const cx = x + size / 2
  const cy = y + size / 2
  const r = size * 0.3
  
  doc.triangle(cx, cy - r, cx - r * 0.86, cy + r * 0.5, cx + r * 0.86, cy + r * 0.5, "F")
  doc.triangle(cx, cy + r, cx - r * 0.86, cy - r * 0.5, cx + r * 0.86, cy - r * 0.5, "F")

  doc.setFillColor(255, 255, 255)
  doc.circle(cx, cy, size * 0.15, "F")
  
  doc.setFont("helvetica", "bold")
  doc.setFontSize(4)
  doc.setTextColor(255, 255, 255)
  doc.text("TUT WURI", cx, cy - size * 0.22, { align: "center" })
}

function drawKemenagLogo(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(34, 139, 34) // ForestGreen
  doc.circle(x + size / 2, y + size / 2, size / 2, "F")

  doc.setFillColor(255, 215, 0) // Gold
  const cx = x + size / 2
  const cy = y + size / 2
  doc.circle(cx, cy, size * 0.35, "F")

  doc.setFillColor(34, 139, 34)
  doc.rect(cx - size * 0.15, cy - size * 0.05, size * 0.3, size * 0.1, "F")
  doc.setFillColor(255, 255, 255)
  doc.circle(cx, cy - size * 0.1, size * 0.08, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(4)
  doc.setTextColor(255, 255, 255)
  doc.text("KEMENAG", cx, cy - size * 0.22, { align: "center" })
}

export default function BukuNilaiPage() {
  const { data: session } = useSession()
  const role = session?.user?.role || "siswa"
  const isAdmin = ["super_admin", "admin_sekolah", "tu"].includes(role)

  const [kelasId, setKelasId] = useState("")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [activeTab, setActiveTab] = useState("olah")

  // Local inputs maps
  const [sasInputMap, setSasInputMap] = useState<Record<string, number | "">>({})
  const [deskripsiMap, setDeskripsiMap] = useState<Record<string, string>>({})
  const [publishMap, setPublishMap] = useState<Record<string, boolean>>({})

  // Settings states
  const [showSettings, setShowSettings] = useState(false)
  const [bobotSumatif, setBobotSumatif] = useState(60)
  const [bobotSas, setBobotSas] = useState(40)
  const [savingSettings, setSavingSettings] = useState(false)

  // Mutations & Queries
  const { data: kelasList = [] } = api.kelas.getAll.useQuery({})
  const { data: mapelList = [] } = api.mapel.getAll.useQuery({})
  const { data: sekolahData } = api.lembaga.getSekolah.useQuery(undefined, { enabled: !!session })

  const bukuNilaiQuery = api.nilai.getBukuNilaiData.useQuery(
    { kelasId, mataPelajaranId },
    { enabled: !!kelasId && !!mataPelajaranId }
  )

  const legerQuery = api.nilai.getLegerData.useQuery(
    { kelasId },
    { enabled: !!kelasId && (activeTab === "leger") }
  )

  const saveBukuNilaiMutation = api.nilai.saveBukuNilai.useMutation()
  const updateSettingsMutation = api.nilai.updateBobotSettings.useMutation()

  const [saving, setSaving] = useState(false)

  const isWaliKelas = bukuNilaiQuery.data?.isWaliKelas ?? false

  // Populate local states when query completes
  useEffect(() => {
    if (bukuNilaiQuery.data) {
      const sasMap: Record<string, number | ""> = {}
      const descMap: Record<string, string> = {}
      const pubMap: Record<string, boolean> = {}

      const { savedNilai, settings } = bukuNilaiQuery.data
      setBobotSumatif(settings.bobotSumatif)
      setBobotSas(settings.bobotSas)

      for (const item of savedNilai) {
        sasMap[item.siswaId] = item.nilaiSas ?? ""
        descMap[item.siswaId] = item.deskripsi || ""
        pubMap[item.siswaId] = item.statusPublish || false
      }
      setSasInputMap(sasMap)
      setDeskripsiMap(descMap)
      setPublishMap(pubMap)
    }
  }, [bukuNilaiQuery.data])

  // Real-time calculations of sumatif averages and NA
  const calculatedData = useMemo(() => {
    if (!bukuNilaiQuery.data) return []
    const { siswa: students, asesmen: assessments, scores, settings } = bukuNilaiQuery.data
    const currentBobotSumatif = settings.bobotSumatif
    const currentBobotSas = settings.bobotSas

    return students.map((std) => {
      // Find sumatif scores for this student
      const studentScores = scores.filter((sc) => sc.siswaId === std.id)
      const sumatifScoresList = studentScores
        .map((sc) => sc.nilai)
        .filter((val): val is number => val !== null && val !== undefined)

      const sumSum = sumatifScoresList.reduce((sum, curr) => sum + curr, 0)
      const avgSumatif = sumatifScoresList.length > 0 ? Math.round(sumSum / sumatifScoresList.length) : null

      const sasValue = sasInputMap[std.id]
      const finalSas = typeof sasValue === "number" ? sasValue : null

      let nilaiAkhir: number | null = null
      if (avgSumatif !== null && finalSas !== null) {
        nilaiAkhir = Math.round(
          (avgSumatif * currentBobotSumatif) / 100 + (finalSas * currentBobotSas) / 100
        )
      } else if (avgSumatif !== null) {
        nilaiAkhir = avgSumatif
      } else if (finalSas !== null) {
        nilaiAkhir = finalSas
      }

      return {
        student: std,
        avgSumatif,
        nilaiSas: finalSas,
        nilaiAkhir,
        scoresList: studentScores,
      }
    })
  }, [bukuNilaiQuery.data, sasInputMap])

  // Auto-generate text description based on assessment scores
  const handleAutoGenerateDescriptions = () => {
    if (!bukuNilaiQuery.data) return

    const { asesmen: assessments } = bukuNilaiQuery.data
    const newDescMap = { ...deskripsiMap }

    calculatedData.forEach((row) => {
      const studentScores = row.scoresList
        .map((sc) => {
          const matchingAsesmen = assessments.find((a) => a.id === sc.asesmenId)
          return {
            title: matchingAsesmen?.judul || "Materi Pembelajaran",
            nilai: sc.nilai,
            kktp: matchingAsesmen?.kktp ?? 70,
          }
        })
        .filter((sc) => sc.nilai !== null && sc.nilai !== undefined)

      if (studentScores.length === 0) {
        if (row.nilaiAkhir !== null) {
          newDescMap[row.student.id] = row.nilaiAkhir >= 75
            ? "Menunjukkan penguasaan yang baik dalam memahami materi pembelajaran."
            : "Perlu bimbingan dan peningkatan dalam memahami materi pembelajaran."
        } else {
          newDescMap[row.student.id] = ""
        }
        return
      }

      // Sort to get highest and lowest
      const sorted = [...studentScores].sort((a, b) => (b.nilai ?? 0) - (a.nilai ?? 0))
      const highest = sorted[0]
      const lowest = sorted[sorted.length - 1]

      let desc = ""
      if (highest && highest.nilai !== null && highest.nilai >= highest.kktp) {
        desc += `Menunjukkan penguasaan yang sangat baik dalam hal ${highest.title}.`
      }

      if (lowest && lowest.nilai !== null && lowest.nilai < lowest.kktp) {
        if (desc) desc += " "
        desc += `Perlu bimbingan lebih lanjut dalam meningkatkan capaian terkait ${lowest.title}.`
      } else if (lowest && lowest.nilai !== null && sorted.length > 1 && lowest.nilai < (highest.nilai ?? 100) - 10) {
        if (desc) desc += " "
        desc += `Perlu pendampingan untuk memantapkan materi ${lowest.title}.`
      } else if (!desc) {
        desc = "Menunjukkan penguasaan kompetensi yang merata di semua materi pembelajaran."
      }

      newDescMap[row.student.id] = desc
    })

    setDeskripsiMap(newDescMap)
    toast.success("Kalimat deskripsi otomatis berhasil disusun!")
  }

  // Save changes to database
  const handleSaveData = async () => {
    if (!kelasId || !mataPelajaranId) return

    setSaving(true)
    try {
      const records = calculatedData.map((row) => ({
        siswaId: row.student.id,
        nilaiSas: row.nilaiSas,
        nilaiSumatif: row.avgSumatif,
        nilaiAkhir: row.nilaiAkhir,
        deskripsi: deskripsiMap[row.student.id] || "",
        statusPublish: publishMap[row.student.id] || false,
      }))

      await saveBukuNilaiMutation.mutateAsync({
        kelasId,
        mataPelajaranId,
        records,
      })
      toast.success("Buku Nilai berhasil disimpan!")
      bukuNilaiQuery.refetch()
    } catch (e) {
      console.error(e)
      toast.error("Gagal menyimpan Buku Nilai.")
    }
    setSaving(false)
  }

  // Save Settings Weight
  const handleSaveSettings = async () => {
    if (bobotSumatif + bobotSas !== 100) {
      toast.error("Total bobot harus sama dengan 100%")
      return
    }

    setSavingSettings(true)
    try {
      await updateSettingsMutation.mutateAsync({ bobotSumatif, bobotSas })
      toast.success("Pengaturan bobot nilai global berhasil diperbarui!")
      setShowSettings(false)
      if (kelasId && mataPelajaranId) bukuNilaiQuery.refetch()
    } catch (e) {
      console.error(e)
      toast.error("Gagal memperbarui bobot nilai.")
    }
    setSavingSettings(false)
  }

  // Print Rapor PDF for single student
  const handleCetakRapor = (studentId: string) => {
    if (!bukuNilaiQuery.data) return
    const row = calculatedData.find((r) => r.student.id === studentId)
    if (!row) return

    const { settings } = bukuNilaiQuery.data
    const classRecord = bukuNilaiQuery.data.kelas
    const activeMapel = mapelList.find((m) => m.id === mataPelajaranId)

    const doc = new jsPDF("portrait", "mm", "a4")
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    // 1. Kop Surat
    const isKemenag = ["mi", "mts", "ma"].includes(sekolahData?.jenjang || "")
    if (isKemenag) {
      drawKemenagLogo(doc, 14, 10, 18)
    } else {
      drawTutWuriLogo(doc, 14, 10, 18)
    }

    if (sekolahData?.logo) {
      try {
        doc.addImage(sekolahData.logo, "PNG", pageW - 32, 10, 18, 18)
      } catch (e) {
        console.error("Failed to render school logo in PDF", e)
      }
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text((sekolahData?.namaSekolah || "SEKOLAH").toUpperCase(), pageW / 2, 14, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(sekolahData?.alamat || "Alamat Sekolah", pageW / 2, 19, { align: "center" })
    doc.setFontSize(8)
    doc.text(`NPSN: ${sekolahData?.npsn || "-"} | Telp: ${sekolahData?.telepon || "-"}`, pageW / 2, 23, { align: "center" })
    doc.line(14, 30, pageW - 14, 30)

    // 2. Blok Identitas (Double Column)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Nama Siswa    : ${row.student.namaLengkap}`, 14, 38)
    doc.text(`NIS / NISN        : ${row.student.nisLokal || "-"} / ${row.student.nisn || "-"}`, 14, 43)
    doc.text(`Nama Sekolah : ${sekolahData?.namaSekolah || "-"}`, 14, 48)

    const fase = getFaseFromTingkat(classRecord?.tingkat)
    doc.text(`Kelas / Fase : ${classRecord?.namaKelas || "-"} / ${fase}`, pageW - 85, 38)
    doc.text(`Semester      : Ganjil`, pageW - 85, 43)
    doc.text(`Tahun Ajaran : 2026/2027`, pageW - 85, 48)

    // 3. Judul Dokumen
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("LAPORAN HASIL BELAJAR", pageW / 2, 58, { align: "center" })

    // 4. Tabel Nilai Utama
    const tableData = [
      [
        "1",
        activeMapel?.namaMapel || "Mata Pelajaran",
        row.nilaiAkhir !== null ? String(row.nilaiAkhir) : "-",
        deskripsiMap[row.student.id] || "Belum ada deskripsi capaian."
      ]
    ]

    autoTable(doc, {
      startY: 64,
      head: [["No", "Mata Pelajaran", "Nilai Akhir", "Capaian Kompetensi"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 50 },
        2: { cellWidth: 25, halign: "center", fontStyle: "bold" },
        3: { cellWidth: 95 }
      },
      styles: { fontSize: 9, cellPadding: 4, valign: "middle" }
    })

    // 5. Tanda Tangan Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20
    
    // Ensure footer doesn't break alone
    if (finalY + 40 > pageH) {
      doc.addPage()
    }

    const ttdY = finalY + 10
    doc.setFont("helvetica", "normal")
    doc.text("Orang Tua/Wali,", 24, ttdY)
    doc.text("__________________", 24, ttdY + 22)

    doc.text("Wali Kelas,", pageW / 2 - 20, ttdY)
    doc.text(sekolahData?.kepalaSekolah ? "__________________" : "__________________", pageW / 2 - 20, ttdY + 22)

    doc.text("Kepala Sekolah,", pageW - 55, ttdY)
    doc.text("__________________", pageW - 55, ttdY + 22)

    doc.save(`Rapor_${row.student.namaLengkap.replace(/\s+/g, "_")}.pdf`)
    toast.success("Rapor PDF berhasil dicetak!")
  }

  // Print Leger PDF
  const handleCetakLegerPdf = () => {
    if (!legerQuery.data || !kelasId) return
    const { siswa: students, mapel: subjects, nilai: grades } = legerQuery.data
    const selectedClass = kelasList.find((k) => k.id === kelasId)

    const doc = new jsPDF("landscape", "mm", "a4")
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    // Kop Surat
    const isKemenag = ["mi", "mts", "ma"].includes(sekolahData?.jenjang || "")
    if (isKemenag) {
      drawKemenagLogo(doc, 14, 10, 18)
    } else {
      drawTutWuriLogo(doc, 14, 10, 18)
    }

    if (sekolahData?.logo) {
      try {
        doc.addImage(sekolahData.logo, "PNG", pageW - 32, 10, 18, 18)
      } catch (e) {
        console.error("Failed to render logo in PDF", e)
      }
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`LEGER NILAI KELAS - ${selectedClass?.namaKelas || ""}`.toUpperCase(), pageW / 2, 14, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(sekolahData?.namaSekolah || "SEKOLAH DEMO", pageW / 2, 19, { align: "center" })
    doc.line(14, 30, pageW - 14, 30)

    // Build Leger Table Headers & Body
    const mapelHeaders = subjects.map((m) => m.namaMapel)
    const tableHeaders = ["No", "NISN", "Nama Siswa", ...mapelHeaders, "Total", "Rata-rata"]

    const tableBody = students.map((std, idx) => {
      let total = 0
      let count = 0
      const subjectCells = subjects.map((m) => {
        const gradeItem = grades.find((g) => g.siswaId === std.id && g.mataPelajaranId === m.id)
        const val = gradeItem?.nilaiAkhir ?? null
        if (val !== null) {
          total += val
          count++
          return String(val)
        }
        return "-"
      })

      const avg = count > 0 ? Math.round(total / count) : 0
      return [
        String(idx + 1),
        std.nisn || "-",
        std.namaLengkap,
        ...subjectCells,
        String(total),
        String(avg)
      ]
    })

    autoTable(doc, {
      startY: 36,
      head: [tableHeaders],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2, valign: "middle" }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    if (finalY + 30 > pageH) {
      doc.addPage()
    }

    const ttdY = finalY + 10
    doc.setFont("helvetica", "normal")
    doc.text("Mengetahui,", 24, ttdY)
    doc.text("Kepala Sekolah", 24, ttdY + 5)
    doc.text("__________________", 24, ttdY + 22)

    doc.text("Wali Kelas,", pageW - 60, ttdY)
    doc.text("__________________", pageW - 60, ttdY + 22)

    doc.save(`Leger_Kelas_${selectedClass?.namaKelas.replace(/\s+/g, "_")}.pdf`)
    toast.success("Leger PDF berhasil dicetak!")
  }

  // Export Leger to Excel
  const handleExportLegerExcel = () => {
    if (!legerQuery.data || !kelasId) return
    const { siswa: students, mapel: subjects, nilai: grades } = legerQuery.data
    const selectedClass = kelasList.find((k) => k.id === kelasId)

    // Build worksheet headers
    const mapelNames = subjects.map((m) => m.namaMapel)
    const headerRow = ["No", "NISN", "Nama Siswa", ...mapelNames, "Total", "Rata-rata"]

    const rows = students.map((std, idx) => {
      let total = 0
      let count = 0
      const subjectVals = subjects.map((m) => {
        const gradeItem = grades.find((g) => g.siswaId === std.id && g.mataPelajaranId === m.id)
        const val = gradeItem?.nilaiAkhir ?? null
        if (val !== null) {
          total += val
          count++
          return val
        }
        return ""
      })

      const avg = count > 0 ? Math.round(total / count) : 0
      return [
        idx + 1,
        std.nisn || "",
        std.namaLengkap,
        ...subjectVals,
        total,
        avg
      ]
    })

    // Sheet initialization
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      [`LEGER NILAI KELAS: ${selectedClass?.namaKelas || ""}`],
      [`Sekolah: ${sekolahData?.namaSekolah || ""}`],
      [],
      headerRow,
      ...rows
    ])

    // Excel configurations (landscape and autofit widths)
    ws["!pageSetup"] = { orientation: "landscape" }
    
    // Autofit column width helper
    const maxCols = headerRow.length
    const colWidths = []
    for (let col = 0; col < maxCols; col++) {
      let maxLen = 0
      // scan headers
      maxLen = Math.max(maxLen, String(headerRow[col]).length)
      // scan data rows
      rows.forEach((r) => {
        maxLen = Math.max(maxLen, String(r[col]).length)
      })
      colWidths.push({ wch: maxLen + 3 })
    }
    ws["!cols"] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, "Leger")
    XLSX.writeFile(wb, `Leger_Kelas_${selectedClass?.namaKelas.replace(/\s+/g, "_")}.xlsx`)
    toast.success("Leger Excel berhasil diekspor!")
  }

  // Set default values for select fields when lists are loaded
  useEffect(() => {
    if (kelasList.length > 0 && !kelasId) {
      setKelasId(kelasList[0]?.id || "")
    }
    if (mapelList.length > 0 && !mataPelajaranId) {
      setMataPelajaranId(mapelList[0]?.id || "")
    }
  }, [kelasList, mapelList])

  const isLoading = bukuNilaiQuery.isLoading || (activeTab === "leger" && legerQuery.isLoading)

  // Load student view query
  const siswaRaporQuery = api.nilai.getSiswaRaporData.useQuery(undefined, {
    enabled: role === "siswa" || role === "ortu"
  })

  // PDF report downloader for student
  const handleDownloadSiswaRapor = () => {
    if (!siswaRaporQuery.data) return
    const { siswa: std, rapor: grades, sekolah: sch } = siswaRaporQuery.data

    const doc = new jsPDF("portrait", "mm", "a4")
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    // Kop Surat
    const isKemenag = ["mi", "mts", "ma"].includes(sch?.jenjang || "")
    if (isKemenag) {
      drawKemenagLogo(doc, 14, 10, 18)
    } else {
      drawTutWuriLogo(doc, 14, 10, 18)
    }

    if (sch?.logo) {
      try {
        doc.addImage(sch.logo, "PNG", pageW - 32, 10, 18, 18)
      } catch (e) {
        console.error("Failed to render school logo in PDF", e)
      }
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text((sch?.namaSekolah || "SEKOLAH").toUpperCase(), pageW / 2, 14, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(sch?.alamat || "Alamat Sekolah", pageW / 2, 19, { align: "center" })
    doc.setFontSize(8)
    doc.text(`NPSN: ${sch?.npsn || "-"} | Telp: ${sch?.telepon || "-"}`, pageW / 2, 23, { align: "center" })
    doc.line(14, 30, pageW - 14, 30)

    // Identitas
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Nama Siswa    : ${std.namaLengkap}`, 14, 38)
    doc.text(`NIS / NISN        : ${std.nisLokal || "-"} / ${std.nisn || "-"}`, 14, 43)
    doc.text(`Nama Sekolah : ${sch?.namaSekolah || "-"}`, 14, 48)

    const fase = getFaseFromTingkat(std.kelas?.tingkat)
    doc.text(`Kelas / Fase : ${std.kelas?.namaKelas || "-"} / ${fase}`, pageW - 85, 38)
    doc.text(`Semester      : Ganjil`, pageW - 85, 43)
    doc.text(`Tahun Ajaran : 2026/2027`, pageW - 85, 48)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("LAPORAN HASIL BELAJAR", pageW / 2, 58, { align: "center" })

    // Table
    const tableBody = grades.map((g, idx) => [
      String(idx + 1),
      g.namaMapel,
      g.nilaiAkhir !== null ? String(g.nilaiAkhir) : "-",
      g.deskripsi || "Menunjukkan penguasaan kompetensi yang baik."
    ])

    autoTable(doc, {
      startY: 64,
      head: [["No", "Mata Pelajaran", "Nilai Akhir", "Capaian Kompetensi"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 50 },
        2: { cellWidth: 25, halign: "center", fontStyle: "bold" },
        3: { cellWidth: 95 }
      },
      styles: { fontSize: 9, cellPadding: 4, valign: "middle" }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 20
    if (finalY + 40 > pageH) {
      doc.addPage()
    }

    const ttdY = finalY + 10
    doc.setFont("helvetica", "normal")
    doc.text("Orang Tua/Wali,", 24, ttdY)
    doc.text("__________________", 24, ttdY + 22)

    doc.text("Wali Kelas,", pageW / 2 - 20, ttdY)
    doc.text("__________________", pageW / 2 - 20, ttdY + 22)

    doc.text("Kepala Sekolah,", pageW - 55, ttdY)
    doc.text("__________________", pageW - 55, ttdY + 22)

    doc.save(`Rapor_${std.namaLengkap.replace(/\s+/g, "_")}.pdf`)
    toast.success("Rapor PDF berhasil diunduh!")
  }

  if (role === "siswa" || role === "ortu") {
    if (siswaRaporQuery.isLoading) {
      return (
        <div className="space-y-6 max-w-[1000px] mx-auto p-4 sm:p-6">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )
    }

    if (siswaRaporQuery.isError || !siswaRaporQuery.data) {
      return (
        <Card className="max-w-[600px] mx-auto p-12 text-center rounded-3xl border mt-10">
          <p className="text-red-500 font-semibold mb-2">Gagal memuat data rapor</p>
          <p className="text-sm text-muted-foreground">Silakan hubungi administrator atau pastikan data Anda sudah dikonfigurasi dengan benar.</p>
        </Card>
      )
    }

    const { siswa: std, rapor: grades, sekolah: sch } = siswaRaporQuery.data

    return (
      <div className="space-y-6 max-w-[1000px] mx-auto px-2 sm:px-4">
        {/* Header Card */}
        <div className="flex items-center justify-between flex-wrap gap-4 p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 border shadow-md text-white">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Award className="h-8 w-8 text-yellow-300" />
              Laporan Hasil Belajar
            </h2>
            <p className="text-sm text-blue-100 mt-1.5">
              Lihat dan unduh laporan hasil belajar resmi Anda semester ini.
            </p>
          </div>
          
          <Button
            onClick={handleDownloadSiswaRapor}
            disabled={grades.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg border-0 px-6 h-11 text-sm font-bold gap-2 cursor-pointer transition-all"
          >
            <Printer className="h-4 w-4" /> Unduh Rapor PDF
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="p-5 rounded-2xl border shadow-sm bg-card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Nama Lengkap</span>
              <span className="text-sm font-bold text-foreground">{std.namaLengkap}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold">NISN / NIS</span>
              <span className="text-sm font-mono font-bold text-foreground">{std.nisn || "-"} / {std.nisLokal || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Sekolah</span>
              <span className="text-sm font-bold text-foreground">{sch?.namaSekolah || "-"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Kelas</span>
              <span className="text-sm font-bold text-foreground">{std.kelas?.namaKelas || "-"}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Fase</span>
              <span className="text-sm font-bold text-foreground">{getFaseFromTingkat(std.kelas?.tingkat)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Semester / Tahun Ajaran</span>
              <span className="text-sm font-bold text-foreground">Ganjil / 2026/2027</span>
            </div>
          </div>
        </Card>

        {/* Grades Table */}
        <Card className="rounded-2xl border shadow-sm bg-card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b">
                <TableRow>
                  <TableHead className="w-12 text-center font-bold">No</TableHead>
                  <TableHead className="w-64 font-bold">Mata Pelajaran</TableHead>
                  <TableHead className="w-32 text-center font-bold">Nilai Akhir</TableHead>
                  <TableHead className="font-bold">Capaian Kompetensi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Belum ada nilai resmi yang di-publish untuk Anda.
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((row, idx) => (
                    <TableRow key={row.nilaiId}>
                      <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-sm">{row.namaMapel}</TableCell>
                      <TableCell className="text-center font-extrabold text-base text-blue-600">
                        {row.nilaiAkhir}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 leading-relaxed">
                        {row.deskripsi || "Menunjukkan penguasaan kompetensi yang baik dalam mata pelajaran ini."}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-1 sm:px-3">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-3xl bg-card border shadow-sm">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Buku Nilai
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pengolahan nilai Sumatif, nilai Akhir Semester, dan deskripsi capaian rapor siswa.
          </p>
        </div>

        {/* Global Configuration Button (Admin Only) */}
        {isAdmin && (
          <Button
            onClick={() => setShowSettings(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md border-0"
          >
            <Settings className="h-4 w-4" /> Setelan Bobot
          </Button>
        )}
      </div>

      {/* Select Filters Panel */}
      <Card className="p-4 rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Pilih Kelas</Label>
            <Select value={kelasId} onValueChange={(val) => setKelasId(val || "")}>
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {kelasList.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Pilih Mata Pelajaran</Label>
            <Select value={mataPelajaranId} onValueChange={(val) => setMataPelajaranId(val || "")}>
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue placeholder="Pilih Mata Pelajaran" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {mapelList.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:self-end flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleSaveData}
              disabled={!kelasId || !mataPelajaranId || saving || isLoading}
              className="flex-1 sm:flex-none gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 h-10 shadow-sm border-0"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan & Publish
            </Button>
          </div>
        </div>
      </Card>

      {/* Tab Panels */}
      {!kelasId || !mataPelajaranId ? (
        <Card className="p-16 rounded-3xl text-center border bg-card">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-50 border flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Pilih Kelas & Mapel</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Silakan pilih kelas and mata pelajaran di panel filter untuk memuat lembar kerja Buku Nilai.
          </p>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto pb-1 scrollbar-none">
            <TabsList className="bg-slate-100 p-1 rounded-2xl inline-flex min-w-[320px] w-full max-w-lg border">
              <TabsTrigger value="olah" className="rounded-xl flex-1 text-sm font-semibold transition-all">
                Olah Nilai
              </TabsTrigger>
              <TabsTrigger value="deskripsi" className="rounded-xl flex-1 text-sm font-semibold transition-all">
                Deskripsi Capaian
              </TabsTrigger>
              {isWaliKelas && (
                <TabsTrigger value="leger" className="rounded-xl flex-1 text-sm font-semibold transition-all">
                  Leger Kelas
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* TAB 1: Olah Nilai */}
          <TabsContent value="olah" className="outline-none space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}
              </div>
            ) : calculatedData.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl border bg-card">
                <p className="text-muted-foreground text-sm">Tidak ada siswa yang terdaftar di kelas ini.</p>
              </Card>
            ) : (
              <Card className="rounded-2xl border shadow-sm bg-card overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="w-12 text-center font-bold">No</TableHead>
                        <TableHead className="w-32 font-bold">NISN / NIS</TableHead>
                        <TableHead className="w-48 font-bold">Nama Siswa</TableHead>
                        {/* Render columns dynamically for each Sumatif assessment */}
                        {bukuNilaiQuery.data?.asesmen.map((as, idx) => (
                          <TableHead key={as.id} className="text-center font-semibold text-xs leading-tight w-24">
                            Sumatif {idx + 1}<br />
                            <span className="text-[10px] text-muted-foreground font-normal">{as.judul}</span>
                          </TableHead>
                        ))}
                        <TableHead className="text-center font-bold w-28 bg-blue-50/30">Rata Sumatif ({bobotSumatif}%)</TableHead>
                        <TableHead className="text-center font-bold w-24">Nilai SAS ({bobotSas}%)</TableHead>
                        <TableHead className="text-center font-bold w-28 bg-emerald-50/30">Nilai Akhir (NA)</TableHead>
                        <TableHead className="text-center font-bold w-20">Publish</TableHead>
                        <TableHead className="text-center font-bold w-24">Rapor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculatedData.map((row, idx) => {
                        const finalNa = row.nilaiAkhir
                        return (
                          <TableRow key={row.student.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{row.student.nisn || row.student.nisLokal || "-"}</TableCell>
                            <TableCell className="font-semibold text-sm">{row.student.namaLengkap}</TableCell>
                            
                            {/* Render student scores for each assessment */}
                            {bukuNilaiQuery.data?.asesmen.map((as) => {
                              const scoreVal = row.scoresList.find((sc) => sc.asesmenId === as.id)?.nilai
                              return (
                                <TableCell key={as.id} className="text-center font-medium">
                                  {scoreVal !== null && scoreVal !== undefined ? (
                                    <span className={scoreVal >= as.kktp ? "text-slate-700" : "text-rose-500 font-semibold"}>
                                      {scoreVal}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/30">-</span>
                                  )}
                                </TableCell>
                              )
                            })}

                            {/* Average of Sumatif */}
                            <TableCell className="text-center font-bold bg-blue-50/10">
                              {row.avgSumatif !== null ? (
                                <span className={row.avgSumatif >= 70 ? "text-blue-700" : "text-rose-500"}>
                                  {row.avgSumatif}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">-</span>
                              )}
                            </TableCell>

                            {/* Input Nilai SAS */}
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={sasInputMap[row.student.id] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                  setSasInputMap((prev) => ({ ...prev, [row.student.id]: val }))
                                }}
                                className="h-8 text-center font-bold w-16 mx-auto rounded-lg border-slate-200"
                              />
                            </TableCell>

                            {/* Final Calculated Nilai Akhir */}
                            <TableCell className="text-center font-extrabold text-base bg-emerald-50/10">
                              {finalNa !== null ? (
                                <span className={finalNa >= 70 ? "text-emerald-600" : "text-rose-500"}>
                                  {finalNa}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">-</span>
                              )}
                            </TableCell>

                            {/* Status Publish Checkbox */}
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={publishMap[row.student.id] || false}
                                onChange={(e) => {
                                  setPublishMap((prev) => ({ ...prev, [row.student.id]: e.target.checked }))
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </TableCell>

                            {/* Action: Print Rapor PDF */}
                            <TableCell className="text-center">
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => handleCetakRapor(row.student.id)}
                                disabled={finalNa === null}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Cetak Rapor Siswa"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: Deskripsi Capaian Kompetensi */}
          <TabsContent value="deskripsi" className="outline-none space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <h3 className="text-lg font-bold text-foreground">Otomatisasi Deskripsi Narasi Capaian</h3>
              <Button
                onClick={handleAutoGenerateDescriptions}
                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-sm border-0 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" /> Generate Deskripsi Otomatis
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
              </div>
            ) : calculatedData.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl border bg-card">
                <p className="text-muted-foreground text-sm">Tidak ada siswa yang terdaftar.</p>
              </Card>
            ) : (
              <Card className="rounded-2xl border shadow-sm bg-card p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {calculatedData.map((row) => (
                  <div key={row.student.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-xl border bg-slate-50/30 hover:bg-slate-50/75 transition-colors">
                    <div className="md:col-span-1 flex flex-col justify-center">
                      <p className="font-bold text-sm text-foreground">{row.student.namaLengkap}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">NISN: {row.student.nisn || "-"}</p>
                      {row.nilaiAkhir !== null && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Award className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs font-extrabold text-emerald-600">NA: {row.nilaiAkhir}</span>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-3">
                      <Textarea
                        value={deskripsiMap[row.student.id] || ""}
                        onChange={(e) => setDeskripsiMap((prev) => ({ ...prev, [row.student.id]: e.target.value }))}
                        placeholder="Ketik deskripsi capaian kompetensi siswa di sini..."
                        className="min-h-[70px] rounded-xl border-slate-200 text-sm focus:border-purple-400 focus:ring-purple-200"
                      />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: Leger Kelas */}
          {isWaliKelas && (
            <TabsContent value="leger" className="outline-none space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Leger Nilai Akhir (NA) Kelas</h3>
                  <p className="text-xs text-muted-foreground">Menampilkan rekapitulasi nilai akhir semua mata pelajaran.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExportLegerExcel}
                    disabled={legerQuery.isLoading || !legerQuery.data}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm border-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Export Excel
                  </Button>
                  <Button
                    onClick={handleCetakLegerPdf}
                    disabled={legerQuery.isLoading || !legerQuery.data}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm border-0 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Cetak PDF Leger
                  </Button>
                </div>
              </div>

              {legerQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                </div>
              ) : !legerQuery.data || legerQuery.data.siswa.length === 0 ? (
                <Card className="p-12 text-center rounded-3xl border bg-card">
                  <p className="text-muted-foreground text-sm">Belum ada nilai akhir yang tercatat untuk kelas ini.</p>
                </Card>
              ) : (
                <Card className="rounded-2xl border shadow-sm bg-card overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                          <TableHead className="w-12 text-center font-bold">No</TableHead>
                          <TableHead className="w-32 font-bold">NISN</TableHead>
                          <TableHead className="w-48 font-bold">Nama Siswa</TableHead>
                          {/* Subjects headers */}
                          {legerQuery.data.mapel.map((m) => (
                            <TableHead key={m.id} className="text-center font-semibold text-xs min-w-[100px]">
                              {m.namaMapel}
                            </TableHead>
                          ))}
                          <TableHead className="text-center font-bold w-24 bg-slate-100/50">Total</TableHead>
                          <TableHead className="text-center font-bold w-24 bg-blue-50/50">Rata-rata</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {legerQuery.data.siswa.map((std, idx) => {
                          let total = 0
                          let count = 0

                          return (
                            <TableRow key={std.id} className="hover:bg-slate-50/50">
                              <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-xs">{std.nisn || std.nisLokal || "-"}</TableCell>
                              <TableCell className="font-semibold text-sm">{std.namaLengkap}</TableCell>

                              {/* Nilai Akhir (NA) for each subject */}
                              {legerQuery.data.mapel.map((m) => {
                                const val = legerQuery.data.nilai.find(
                                  (g) => g.siswaId === std.id && g.mataPelajaranId === m.id
                                )?.nilaiAkhir ?? null

                                if (val !== null) {
                                  total += val
                                  count++
                                }

                                return (
                                  <TableCell key={m.id} className="text-center font-medium text-xs">
                                    {val !== null ? val : <span className="text-muted-foreground/30">-</span>}
                                  </TableCell>
                                )
                              })}

                              {/* Total and Average columns */}
                              <TableCell className="text-center font-extrabold text-sm bg-slate-100/20">
                                {total > 0 ? total : "-"}
                              </TableCell>
                              <TableCell className="text-center font-extrabold text-sm text-blue-600 bg-blue-50/10">
                                {count > 0 ? Math.round(total / count) : "-"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Setelan Bobot Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Setelan Bobot Nilai</DialogTitle>
            <DialogDescription>
              Atur persentase formulasi pembentukan Nilai Akhir (NA) Rapor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="bobotSumatif" className="text-sm font-semibold">
                Bobot Rerata Sumatif Lingkup Materi (%)
              </Label>
              <Input
                id="bobotSumatif"
                type="number"
                min={0}
                max={100}
                value={bobotSumatif}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                  setBobotSumatif(val)
                  setBobotSas(100 - val)
                }}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bobotSas" className="text-sm font-semibold">
                Bobot Sumatif Akhir Semester (SAS) (%)
              </Label>
              <Input
                id="bobotSas"
                type="number"
                min={0}
                max={100}
                value={bobotSas}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                  setBobotSas(val)
                  setBobotSumatif(100 - val)
                }}
                className="rounded-xl"
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-2xl flex items-start gap-2 text-blue-700 text-xs mt-1">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Formula NA = (Sumatif * {bobotSumatif}%) + (SAS * {bobotSas}%). Total persentase harus sama dengan 100%.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowSettings(false)} className="rounded-xl cursor-pointer">
              Batal
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings || bobotSumatif + bobotSas !== 100}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md border-0 cursor-pointer"
            >
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan Setelan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
