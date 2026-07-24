"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, Pencil, Trash2, Loader2, Search, AlertTriangle, GraduationCap, UserCheck, Users, Eye, Printer, School } from "lucide-react"
import jsPDF from "jspdf"
import { autoTable } from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { api } from "@/lib/trpc/client"
import KelasFormDialog, { type KelasFormData } from "@/components/kelas/KelasFormDialog"
import KelasDetailDialog from "@/components/kelas/KelasDetailDialog"
import { formatKelasLabel, formatTingkatLabel } from "@/components/jadwal/constants"
import { toast } from "sonner"

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
  waliKelasId: string | null
  kapasitas: number | null
  tahunAjaranId: string | null
  siswaCount: number
}

function CapacityIndicator({ count, max }: { count: number; max: number | null }) {
  if (!max) return <span className="text-muted-foreground text-xs italic">Belum diatur</span>

  const percent = Math.min(100, Math.round((count / max) * 100))
  
  let barColorClass = "from-teal-500 to-emerald-400"
  let textColorClass = "text-emerald-600 dark:text-emerald-400"
  let bgColorClass = "bg-emerald-500/10"
  
  if (percent >= 100) {
    barColorClass = "from-rose-500 to-red-400"
    textColorClass = "text-rose-600 dark:text-rose-400 font-extrabold"
    bgColorClass = "bg-rose-500/10"
  } else if (percent >= 85) {
    barColorClass = "from-amber-500 to-yellow-400"
    textColorClass = "text-amber-600 dark:text-amber-400 font-bold"
    bgColorClass = "bg-amber-500/10"
  }

  return (
    <div className="flex flex-col gap-1 w-full max-w-[150px] group/cap">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className={textColorClass}>{count} <span className="text-muted-foreground/75 font-normal">/ {max}</span></span>
        <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${bgColorClass} ${textColorClass} scale-95 origin-right transition-transform group-hover/cap:scale-100`}>{percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/10">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${barColorClass} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function getTingkatTheme(tingkat: string | null) {
  if (!tingkat) {
    return {
      rowClass: "border-l-4 border-l-amber-500 bg-amber-500/[0.03] dark:bg-amber-500/[0.01] hover:bg-amber-500/[0.07] dark:hover:bg-amber-500/[0.03]",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
    }
  }
  
  const num = parseInt(tingkat.replace(/\D/g, ""))
  const code = isNaN(num) ? 1 : ((num - 1) % 6) + 1
  
  switch (code) {
    case 1: // Teal theme (e.g. 1, 7, 10)
      return {
        rowClass: "border-l-4 border-l-teal-500 bg-teal-500/[0.02] dark:bg-teal-500/[0.01] hover:bg-teal-500/[0.05] dark:hover:bg-teal-500/[0.03]",
        badgeClass: "bg-teal-50/80 text-teal-700 border border-teal-500/10 dark:bg-teal-950/30 dark:text-teal-400"
      }
    case 2: // Indigo theme (e.g. 2, 8, 11)
      return {
        rowClass: "border-l-4 border-l-indigo-500 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.01] hover:bg-indigo-500/[0.05] dark:hover:bg-indigo-500/[0.03]",
        badgeClass: "bg-indigo-50/80 text-indigo-700 border border-indigo-500/10 dark:bg-indigo-950/30 dark:text-indigo-400"
      }
    case 3: // Purple theme (e.g. 3, 9, 12)
      return {
        rowClass: "border-l-4 border-l-purple-500 bg-purple-500/[0.02] dark:bg-purple-500/[0.01] hover:bg-purple-500/[0.05] dark:hover:bg-purple-500/[0.03]",
        badgeClass: "bg-purple-50/80 text-purple-700 border border-purple-500/10 dark:bg-purple-950/30 dark:text-purple-400"
      }
    case 4: // Rose theme (e.g. 4)
      return {
        rowClass: "border-l-4 border-l-rose-500 bg-rose-500/[0.02] dark:bg-rose-500/[0.01] hover:bg-rose-500/[0.05] dark:hover:bg-rose-500/[0.03]",
        badgeClass: "bg-rose-50/80 text-rose-700 border border-rose-500/10 dark:bg-rose-950/30 dark:text-rose-400"
      }
    case 5: // Amber theme (e.g. 5)
      return {
        rowClass: "border-l-4 border-l-amber-500 bg-amber-500/[0.02] dark:bg-amber-500/[0.01] hover:bg-amber-500/[0.05] dark:hover:bg-amber-500/[0.03]",
        badgeClass: "bg-amber-50/80 text-amber-700 border border-amber-500/10 dark:bg-amber-950/30 dark:text-amber-400"
      }
    case 6: // Sky theme (e.g. 6)
    default:
      return {
        rowClass: "border-l-4 border-l-sky-500 bg-sky-500/[0.02] dark:bg-sky-500/[0.01] hover:bg-sky-500/[0.05] dark:hover:bg-sky-500/[0.03]",
        badgeClass: "bg-sky-50/80 text-sky-700 border border-sky-500/10 dark:bg-sky-950/30 dark:text-sky-400"
      }
  }
}

export default function KelasPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<KelasFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: kelasList, isLoading } = api.kelas.getAll.useQuery({ search })
  const { data: guruList } = api.guru.getAll.useQuery({})
  const utils = api.useUtils()

  const createMutation = api.kelas.create.useMutation({
    onSuccess: () => {
      utils.kelas.getAll.invalidate()
    },
  })

  const updateMutation = api.kelas.update.useMutation({
    onSuccess: () => {
      utils.kelas.getAll.invalidate()
    },
  })

  const removeMutation = api.kelas.remove.useMutation({
    onSuccess: () => {
      utils.kelas.getAll.invalidate()
    },
  })

  const { data: session } = useSession()
  const sekolahId = session?.user?.sekolahId ?? ""

  const { data: sekolah } = api.lembaga.getSekolah.useQuery()
  const { data: aktifTa } = api.lembaga.getActiveTahunAjaran.useQuery()
  const [exporting, setExporting] = useState(false)

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

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      let logoBase64: string | null = null
      if (sekolah?.logo) {
        logoBase64 = await urlToBase64(sekolah.logo)
      }

      let customKopBase64: string | null = null
      if (sekolah?.useCustomKop && sekolah?.customKopGambar) {
        customKopBase64 = await urlToBase64(sekolah.customKopGambar)
      }

      const rows: (string | number)[][] = records.map((r, i) => {
        const wali = r.waliKelasId ? (guruMap.get(r.waliKelasId) || "-") : "-"
        const kelasLabel = formatKelasLabel(r)
        const tingkatLabel = formatTingkatLabel(r.tingkat)
        const kapasitasLabel = r.kapasitas ? `${r.siswaCount} / ${r.kapasitas}` : `${r.siswaCount} / -`
        return [
          i + 1,
          tingkatLabel || "-",
          kelasLabel || "-",
          wali,
          kapasitasLabel,
          `${r.siswaCount} Siswa`
        ]
      })

      const head = [["No", "Tingkat", "Nama Rombel / Kelas", "Wali Kelas", "Kapasitas Terisi", "Jumlah Siswa"]]

      const doc = new jsPDF("portrait", "mm", "a4")
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
      const titleText = `Laporan Rombongan Belajar (Rombel)${taLabel}`

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
      const toDdMmYyyy = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        return `${dd}/${mm}/${yyyy}`
      }
      const tglStr = `Diexport pada: ${hari}, ${toDdMmYyyy(now)}`
      doc.text(tglStr, pageW - 14, infoY, { align: "right" })
      doc.text(`Total data: ${records.length} Rombel`, 14, infoY)

      autoTable(doc, {
        startY: infoY + 4,
        head,
        body: rows,
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.25,
          textColor: [50, 50, 50],
          valign: "middle",
        },
        headStyles: {
          fillColor: [13, 148, 136], // Teal-600
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50
        },
        margin: { top: 10, left: 14, right: 14, bottom: 10 },
      })

      doc.save(`Laporan_Rombel_${now.getTime()}.pdf`)
      toast.success("Berhasil mengekspor PDF data rombel")
    } catch (err) {
      console.error(err)
      toast.error("Gagal mengunduh PDF data rombel")
    } finally {
      setExporting(false)
    }
  }

  const guruMap = new Map(
    (guruList ?? []).map((g: { id: string; namaLengkap: string }) => [g.id, g.namaLengkap])
  )

  const handleSubmit = async (data: KelasFormData) => {
    try {
      if (data.id) {
        await updateMutation.mutateAsync({
          id: data.id,
          data: {
            namaKelas: data.namaKelas,
            tingkat: data.tingkat || null,
            waliKelasId: data.waliKelasId || null,
            kapasitas: data.kapasitas ?? null,
            siswaIds: data.siswaIds,
          },
        })
      } else {
        await createMutation.mutateAsync({
          namaKelas: data.namaKelas,
          tingkat: data.tingkat || null,
          waliKelasId: data.waliKelasId || null,
          kapasitas: data.kapasitas ?? null,
          sekolahId,
          siswaIds: data.siswaIds,
        })
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan kelas")
      throw err
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }
  const records = (kelasList ?? []) as KelasRecord[]
  const recordsWithoutTingkat = records.filter((r) => !r.tingkat)

  const totalRombel = records.length
  const totalSiswa = records.reduce((sum, r) => sum + (r.siswaCount || 0), 0)
  const totalKapasitas = records.reduce((sum, r) => sum + (r.kapasitas || 0), 0)

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Rombongan Belajar</h2>
        <p className="text-muted-foreground">Kelola data rombongan belajar</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-[22px] border border-slate-250/20 dark:border-slate-800 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-sm">
          <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 text-teal-650 dark:text-teal-400 rounded-xl shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Rombongan Belajar</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalRombel} Rombel</h3>
          </div>
        </div>
        <div className="glass-card rounded-[22px] border border-slate-255/20 dark:border-slate-800 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-sm">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Kapasitas Terisi</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {totalSiswa} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {totalKapasitas || "-"} Kursi</span>
            </h3>
          </div>
        </div>
        <div className="glass-card rounded-[22px] border border-slate-250/20 dark:border-slate-800 p-5 flex items-center space-x-4 bg-white dark:bg-slate-900/40 shadow-sm">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Siswa Aktif di Rombel</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{totalSiswa} Siswa</h3>
          </div>
        </div>
      </div>

      {recordsWithoutTingkat.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">{recordsWithoutTingkat.length} kelas belum memiliki tingkat</p>
            <p className="mt-1">
              Data kelas yang sudah ada sebelumnya harus diperbarui agar sesuai dengan struktur baru.
              Klik ikon <strong>Edit</strong> pada baris yang ditandai untuk memilih tingkat dan menyesuaikan nama kelas (misal: "7a" → tingkat <strong>7</strong>, nama kelas <strong>A</strong>).
            </p>
          </div>
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kelas..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 cursor-pointer border-slate-200 hover:bg-slate-50 font-semibold"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 text-teal-600" />
              )}
              {exporting ? "Mengekspor..." : "Cetak PDF"}
            </Button>
            <Button
              className="gap-2 text-white font-semibold cursor-pointer shadow-md shadow-emerald-500/10 hover:brightness-105 active:scale-95 transition-all"
              style={{ backgroundColor: "hsl(142 72% 40%)" }}
              onClick={() => {
                setEditData(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Tambah Kelas
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-100/60 dark:bg-slate-800/40" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 dark:from-teal-500/5 dark:to-emerald-500/5 flex items-center justify-center text-teal-500 dark:text-teal-400 mb-4 shadow-sm border border-teal-500/10">
              <GraduationCap className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
              {search ? "Pencarian Tidak Ditemukan" : "Belum Ada Data Rombel"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {search
                ? `Tidak ditemukan hasil untuk kata kunci "${search}". Coba cari kata kunci kelas atau tingkatan lain.`
                : "Rombongan belajar digunakan untuk mengelompokkan siswa berdasarkan tingkat dan kelas akademik. Mulai dengan membuat rombel baru."}
            </p>
            {!search && (
              <Button
                style={{ backgroundColor: "hsl(142 72% 40%)" }}
                onClick={() => {
                  setEditData(null)
                  setFormOpen(true)
                }}
                className="gap-2 shadow-md shadow-emerald-500/10 hover:brightness-105 active:scale-95 transition-all text-white font-semibold"
              >
                <Plus className="h-4 w-4" /> Tambah Rombel Baru
              </Button>
            )}
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-hidden rounded-xl border border-border/50">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/30">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Tingkat</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Nama Kelas</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Wali Kelas</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3">Kapasitas Kelas</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const theme = getTingkatTheme(r.tingkat)
                  return (
                    <TableRow key={r.id} className={`transition-colors ${theme.rowClass}`}>
                      <TableCell className="py-3.5">
                        {!r.tingkat ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${theme.badgeClass}`}>Perlu diatur</span>
                        ) : (
                          <Badge variant="secondary" className={`px-2.5 py-1 border transition-colors font-bold text-xs ${theme.badgeClass}`}>
                            {formatTingkatLabel(r.tingkat)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold py-3.5">
                        <div className="flex items-center gap-2">
                          {!r.tingkat && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                          <span className="text-slate-800 dark:text-slate-200">
                            {formatKelasLabel({ namaKelas: r.namaKelas, tingkat: r.tingkat })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {r.waliKelasId ? (
                          <Badge variant="outline" className="px-2.5 py-1 flex items-center gap-1.5 w-fit bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 font-semibold border-border">
                            <UserCheck className="h-3 w-3 text-teal-500 dark:text-teal-400" />
                            {guruMap.get(r.waliKelasId) ?? "-"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Belum ditentukan</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <CapacityIndicator count={r.siswaCount ?? 0} max={r.kapasitas} />
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  onClick={() => {
                                    setDetailId(r.id)
                                    setDetailOpen(true)
                                  }}
                                />
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner>
                                <TooltipPopup>Lihat Rombel</TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  onClick={() => {
                                    setEditData({
                                      id: r.id,
                                      namaKelas: r.namaKelas,
                                      tingkat: r.tingkat ?? "",
                                      waliKelasId: r.waliKelasId ?? "",
                                      kapasitas: r.kapasitas ?? undefined,
                                      siswaIds: [],
                                    })
                                    setFormOpen(true)
                                  }}
                                />
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner>
                                <TooltipPopup>Edit Rombel</TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                  onClick={() => setDeleteId(r.id)}
                                />
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipPortal>
                              <TooltipPositioner>
                                <TooltipPopup>Hapus Rombel</TooltipPopup>
                              </TooltipPositioner>
                            </TooltipPortal>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {records.map((r) => {
              const theme = getTingkatTheme(r.tingkat)
              return (
                <div key={r.id} className={`glass-card rounded-2xl p-4 border border-border/50 relative overflow-hidden transition-all ${theme.rowClass}`}>
                  <div className="flex items-start justify-between mb-3.5">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        {!r.tingkat && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        {formatKelasLabel({ namaKelas: r.namaKelas, tingkat: r.tingkat })}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {!r.tingkat ? (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">Tingkat Perlu diatur</span>
                        ) : (
                          <Badge variant="secondary" className={`px-2 py-0.2 font-extrabold text-[10px] ${theme.badgeClass}`}>
                            {formatTingkatLabel(r.tingkat)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { 
                        setDetailId(r.id)
                        setDetailOpen(true)
                      }} 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Lihat Detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => { 
                        setEditData({ id: r.id, namaKelas: r.namaKelas, tingkat: r.tingkat ?? "", waliKelasId: r.waliKelasId ?? "", kapasitas: r.kapasitas ?? undefined, siswaIds: [] }); 
                        setFormOpen(true) 
                      }} 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setDeleteId(r.id)} 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1">
                  {r.waliKelasId ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <UserCheck className="h-3.5 w-3.5 text-teal-500" />
                      <span className="font-semibold">{guruMap.get(r.waliKelasId) ?? "-"}</span>
                      <span className="text-[10px] text-muted-foreground">(Wali Kelas)</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      Belum ada Wali Kelas
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Kapasitas</span>
                    <CapacityIndicator count={r.siswaCount ?? 0} max={r.kapasitas} />
                  </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </Card>

      <KelasFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
        }}
        onSubmit={handleSubmit}
        initial={editData}
        guruList={guruList ?? []}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <KelasDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        kelasId={detailId ?? ""}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kelas</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan.
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
