"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileSpreadsheet, Loader2, Printer, ChevronDown } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { DAY_LABEL, formatKelasLabel } from "./constants"
import { toast } from "sonner"

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
}

interface GuruRecord {
  id: string
  namaLengkap: string
}

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
}

interface JadwalRecord {
  id: string
  kelasId: string
  mataPelajaranId: string
  guruId: string
  hari: string
  jpMulai: number | null
  jpCount: number | null
}

interface TimelineRecord {
  id: string
  hari: string
  tipe: string
  label: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
}

interface Props {
  onCetak: () => void
  disabled?: boolean
  filterGuruId?: string | null
  filterGuruNama?: string | null
}

export default function ExportJadwalMenu({ onCetak, disabled, filterGuruId, filterGuruNama }: Props) {
  const [exporting, setExporting] = useState(false)
  const utils = api.useUtils()

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const [sekolah, tahunAjaran, kelas, mapel, guru, jadwal, timeline] =
        await Promise.all([
          utils.client.lembaga.getSekolah.query(),
          utils.client.lembaga.getActiveTahunAjaran.query(),
          utils.client.kelas.getAll.query({ limit: 1000 }),
          utils.client.mapel.getAll.query({ limit: 1000 }),
          utils.client.guru.getAll.query({ limit: 1000 }),
          utils.client.jadwal.getAll.query({ limit: 10000 }),
          utils.client.pengaturanJadwal.getTimeline.query({}),
        ])

      const tahunAjaranData = (tahunAjaran ?? null) as {
        namaTahunAjaran: string
        semester?: string
      } | null
      const kelasRecords = (kelas ?? []) as KelasRecord[]
      const mapelRecords = (mapel ?? []) as MapelRecord[]
      const guruRecords = (guru ?? []) as GuruRecord[]
      const rawJadwalRecords = (jadwal ?? []) as JadwalRecord[]
      const timelineRecords = (timeline ?? []) as TimelineRecord[]

      // Filter by teacher if filterGuruId is present
      const jadwalRecords = filterGuruId
        ? rawJadwalRecords.filter((e) => e.guruId === filterGuruId)
        : rawJadwalRecords

      const mapelMap = new Map(mapelRecords.map((m) => [m.id, m]))
      const guruMap = new Map(guruRecords.map((g) => [g.id, g]))

      const sortedKelas = [...kelasRecords].sort((a, b) => {
        const tA = parseInt(a.tingkat || "0")
        const tB = parseInt(b.tingkat || "0")
        if (tA !== tB) return tA - tB
        return a.namaKelas.localeCompare(b.namaKelas)
      })

      const activeDays = (() => {
        const days = new Set<string>()
        for (const t of timelineRecords) {
          if (t.tipe === "jp") days.add(t.hari)
        }
        return ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"].filter((d) => days.has(d))
      })()

      const timelineByDay = new Map<string, TimelineRecord[]>()
      for (const day of activeDays) {
        timelineByDay.set(day, timelineRecords.filter((t) => t.hari === day).sort((a, b) => a.urutan - b.urutan))
      }

      const academicJpMap = new Map<string, number | null>()
      for (const day of activeDays) {
        const dayItems = timelineByDay.get(day) ?? []
        let counter = 1
        for (let jp = 1; jp <= dayItems.length; jp++) {
          const item = dayItems[jp - 1]
          if (item && item.tipe !== "jp") {
            academicJpMap.set(`${day}-${jp}`, null)
          } else if (item && item.tipe === "jp") {
            academicJpMap.set(`${day}-${jp}`, counter++)
          } else {
            academicJpMap.set(`${day}-${jp}`, null)
          }
        }
      }

      const taLabel = tahunAjaranData?.namaTahunAjaran
        ? `Tahun Ajaran ${tahunAjaranData.namaTahunAjaran}${
            tahunAjaranData.semester
              ? ` Semester ${tahunAjaranData.semester.charAt(0).toUpperCase() + tahunAjaranData.semester.slice(1)}`
              : ""
          }`
        : ""

      let csvContent =
        `${(sekolah as any)?.namaSekolah || "SEKOLAH"}\t${taLabel}\n` +
        (filterGuruNama ? `Jadwal Mengajar Guru: ${filterGuruNama}\n` : "") +
        "Hari\tWaktu / JP\t" +
        sortedKelas.map((k) => formatKelasLabel(k)).join("\t") +
        "\n"

      activeDays.forEach((day) => {
        const dayItems = timelineByDay.get(day) ?? []
        dayItems.forEach((item, idx) => {
          if (item.tipe !== "jp") {
            csvContent += `${DAY_LABEL[day]}\t${item.label || item.tipe} (${item.jamMulai}-${item.jamSelesai})\t` +
              sortedKelas.map(() => item.label || item.tipe).join("\t") +
              "\n"
          } else {
            const academicJp = academicJpMap.get(`${day}-${idx + 1}`) ?? idx + 1
            csvContent += `${DAY_LABEL[day]}\tJP ${academicJp} (${item.jamMulai}-${item.jamSelesai})\t`
            csvContent += sortedKelas
              .map((k) => {
                const entry = jadwalRecords.find(
                  (e) =>
                    e.kelasId === k.id &&
                    e.hari === day &&
                    e.jpMulai !== null &&
                    e.jpCount !== null &&
                    e.jpMulai <= academicJp &&
                    academicJp < e.jpMulai + e.jpCount
                )
                if (entry) {
                  const m = mapelMap.get(entry.mataPelajaranId)
                  const g = guruMap.get(entry.guruId)
                  return `[${m?.kodeMapel || m?.namaMapel || "MAPEL"}] - ${g?.namaLengkap || "-"}`
                }
                return "-"
              })
              .join("\t")
            csvContent += "\n"
          }
        })
      })

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `Jadwal_Pelajaran_${new Date().toISOString().split("T")[0]}.xls`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success("Jadwal berhasil diekspor ke Excel (.xls)")
    } catch {
      toast.error("Gagal mengexport data")
    } finally {
      setExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || exporting}
        className="w-full lg:w-auto flex items-center justify-center font-black px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 dark:border-emerald-800/60 shadow-2xs rounded-xl transition-all text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer backdrop-blur-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-700 dark:text-emerald-300 shrink-0" />
        )}
        <span>{exporting ? "Mengexport..." : "Export / Cetak"}</span>
        <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onCetak} className="cursor-pointer py-2.5">
          <Printer className="w-4 h-4 mr-2 text-slate-700" />
          <span className="font-bold text-xs uppercase tracking-wider">Cetak Jadwal</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer py-2.5">
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
          <span className="font-bold text-xs uppercase tracking-wider">Export Excel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
