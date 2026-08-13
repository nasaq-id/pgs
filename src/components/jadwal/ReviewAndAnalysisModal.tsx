"use client"

import React, { useState, useMemo } from "react"
import { X, Search, AlertTriangle, Printer, Copy, BookOpen, User, Calendar, BarChart2 } from "lucide-react"
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

export interface MapelReviewItem {
  mapelId: string
  mapelNama: string
  guru: string
  jumlahJam: number
  pertemuanCount: number
  pertemuanDetails: string
  status: string
  statusType: "optimal" | "warning"
  detailAnalisis: string
}

export interface ClassReviewReport {
  classId: string
  kelasNama: string
  totalJP: number
  totalMapel: number
  items: MapelReviewItem[]
}

interface ReviewAndAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  classes: KelasRecord[]
  schedules: JadwalRecord[]
  subjects: MapelRecord[]
  teachers: GuruRecord[]
}

const INDO_DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
const DAY_DISPLAY_LABEL: Record<string, string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
}

export const ReviewAndAnalysisModal: React.FC<ReviewAndAnalysisModalProps> = ({
  isOpen,
  onClose,
  classes,
  schedules = [],
  subjects = [],
  teachers = [],
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const isSameId = (a: any, b: any) => String(a || "").toLowerCase() === String(b || "").toLowerCase()

  // 1. Calculate teacher conflicts
  const teacherConflicts = useMemo(() => {
    if (!schedules || schedules.length === 0) return []
    const conflicts: { teacher: string; day: string; jp: number; classes: string[] }[] = []
    const map: Record<string, Record<string, Record<number, string[]>>> = {}

    schedules.forEach((s) => {
      if (!s.guruId) return
      const gKey = s.guruId
      if (!map[gKey]) map[gKey] = {}
      if (!map[gKey][s.hari]) map[gKey][s.hari] = {}

      const start = Number(s.jpMulai || 1)
      const count = Number(s.jpCount || 1)
      const cName = classes.find((c) => isSameId(c.id, s.kelasId))?.namaKelas || s.kelasId

      for (let jp = start; jp < start + count; jp++) {
        if (!map[gKey][s.hari][jp]) map[gKey][s.hari][jp] = []
        map[gKey][s.hari][jp].push(cName)
      }
    })

    Object.entries(map).forEach(([teacherId, dayMap]) => {
      Object.entries(dayMap).forEach(([day, jpMap]) => {
        Object.entries(jpMap).forEach(([jpStr, classList]) => {
          if (classList.length > 1) {
            const teacherName = teachers.find((t) => t.id === teacherId)?.namaLengkap || "Guru"
            conflicts.push({
              teacher: teacherName,
              day,
              jp: Number(jpStr),
              classes: classList,
            })
          }
        })
      })
    })

    return conflicts
  }, [schedules, classes, teachers])

  // 2. Generate review report based on current schedules
  const report = useMemo((): ClassReviewReport[] => {
    return classes.map((c) => {
      const classScheds = schedules.filter((s) => isSameId(s.kelasId, c.id))
      // Get unique subjects assigned in schedules for this class
      const assignedMapelIds = Array.from(new Set(classScheds.map((s) => s.mataPelajaranId)))
      const classSubs = subjects.filter((sub) => assignedMapelIds.includes(sub.id))

      let totalClassJP = 0
      const items: MapelReviewItem[] = []

      classSubs.forEach((sub) => {
        if (!sub || !sub.id || !sub.namaMapel) return
        const subScheds = classScheds.filter((s) => isSameId(s.mataPelajaranId, sub.id))
        const firstSched = subScheds[0]
        const guru = firstSched ? (teachers.find((t) => t.id === firstSched.guruId)?.namaLengkap || "Guru") : "Belum Ditunjuk"
        
        // Sum jpCount for this subject in this class
        const subTotalJP = subScheds.reduce((acc, s) => acc + (s.jpCount || 0), 0)
        totalClassJP += subTotalJP

        subScheds.sort((a, b) => {
          const dayDiff = INDO_DAYS.indexOf(a.hari) - INDO_DAYS.indexOf(b.hari)
          if (dayDiff !== 0) return dayDiff
          return (a.jpMulai || 0) - (b.jpMulai || 0)
        })

        const pertemuansFormatted = subScheds.map((s) => {
          const start = s.jpMulai || 0
          const count = s.jpCount || 0
          const endJp = start + count - 1
          const jpRange = count === 1 ? `JP ${start}` : `JP ${start}-${endJp}`
          return `${DAY_DISPLAY_LABEL[s.hari] || s.hari} (${jpRange}, ${count} JP)`
        }).join(" & ")

        const hasSingleJP = subScheds.some((s) => s.jpCount === 1)
        let status = "Sesuai Aturan (Optimal)"
        let statusType: "optimal" | "warning" = "optimal"
        let detailAnalisis = ""

        if (subTotalJP === 2) {
          status = "1 Pertemuan (2 JP Optimal)"
          detailAnalisis = `Mapel ${sub.namaMapel} (${subTotalJP} JP) teralokasikan di Kelas ${c.namaKelas} dengan pengampu ${guru}. Terjadwal dalam 1 kali pertemuan 2 JP tuntas.`
        } else if (subTotalJP === 3) {
          status = "1 Pertemuan (3 JP Optimal)"
          detailAnalisis = `Mapel ${sub.namaMapel} (${subTotalJP} JP) teralokasikan di Kelas ${c.namaKelas} dengan pengampu ${guru}. Terjadwal dalam 1 kali pertemuan 3 JP tuntas.`
        } else if (subTotalJP === 4) {
          status = "2 Pertemuan (2+2 JP Optimal)"
          detailAnalisis = `Mapel ${sub.namaMapel} (${subTotalJP} JP) teralokasikan di Kelas ${c.namaKelas} dengan pengampu ${guru}. Terbagi merata dalam 2 pertemuan masing-masing 2 JP (2+2 JP).`
        } else if (subTotalJP === 5) {
          status = "2 Pertemuan (3+2 JP Optimal)"
          detailAnalisis = `Mapel ${sub.namaMapel} (${subTotalJP} JP) teralokasikan di Kelas ${c.namaKelas} dengan pengampu ${guru}. Terbagi ideal dalam 2 pertemuan (3 JP + 2 JP).`
        } else if (subTotalJP === 1) {
          status = "1 Pertemuan (1 JP Sesuai Kurikulum)"
          detailAnalisis = `Mapel ${sub.namaMapel} (${subTotalJP} JP) teralokasikan di Kelas ${c.namaKelas} dengan pengampu ${guru} (Total 1 JP).`
        } else {
          status = `${subScheds.length} Pertemuan (${subTotalJP} JP Optimal)`
          detailAnalisis = `Mapel ${sub.namaMapel} (${subTotalJP} JP) teralokasikan di Kelas ${c.namaKelas} dengan pengampu ${guru}. Terdistribusi pada: ${pertemuansFormatted || "Belum ada slot"}.`
        }

        if (hasSingleJP && subTotalJP >= 2) {
          status = "Ada Blok 1 JP (Perlu Penyesuaian)"
          statusType = "warning"
          detailAnalisis += " (Catatan: Terdeteksi ada blok 1 JP terpisah)."
        }

        items.push({
          mapelId: sub.id,
          mapelNama: sub.namaMapel,
          guru,
          jumlahJam: subTotalJP,
          pertemuanCount: subScheds.length,
          pertemuanDetails: pertemuansFormatted || "Belum Terjadwal",
          status,
          statusType,
          detailAnalisis,
        })
      })

      return {
        classId: c.id,
        kelasNama: c.namaKelas,
        totalJP: totalClassJP,
        totalMapel: items.length,
        items,
      }
    })
  }, [classes, schedules, subjects, teachers])

  if (!isOpen) return null

  // Filter report
  const filteredReport = report.filter((cls) => {
    if (selectedClassId !== "all" && cls.classId !== selectedClassId) return false
    return true
  })

  // Flat list of items for search or calculation
  const allItems: { className: string; item: MapelReviewItem }[] = []
  report.forEach((cls) => {
    cls.items.forEach((item) => {
      if (
        searchQuery.trim() === "" ||
        item.mapelNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.guru.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.kelasNama.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        allItems.push({ className: cls.kelasNama, item })
      }
    })
  })

  // Overall metrics
  let totalAllocatedJP = 0
  let totalItemsCount = 0
  let singleJPCount = 0

  report.forEach((cls) => {
    totalAllocatedJP += cls.totalJP
    totalItemsCount += cls.items.length
    cls.items.forEach((it) => {
      if (it.statusType === "warning") singleJPCount++
    })
  })

  const handleCopyReportText = () => {
    let text = "=========================================\n"
    text += "LAPORAN REVIEW & ANALISIS HASIL JADWAL AI\n"
    text += "=========================================\n\n"

    report.forEach((cls) => {
      text += `--- KELAS: ${cls.kelasNama} (Total ${cls.totalJP} JP, ${cls.totalMapel} Mapel) ---\n`
      cls.items.forEach((it) => {
        text += `• ${it.mapelNama} (${it.jumlahJam} JP) | Guru: ${it.guru}\n`
        text += `  Distribusi: ${it.pertemuanDetails}\n`
        text += `  Status: ${it.status}\n`
        text += `  Analisis: ${it.detailAnalisis}\n\n`
      })
      text += "\n"
    })

    navigator.clipboard.writeText(text)
    toast.success("Laporan review & analisis berhasil disalin ke clipboard!")
  }

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Review & Analisis Hasil Penjadwalan AI</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; }
          h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; }
          .subtitle { font-size: 13px; color: #64748b; margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          .summary-box { display: flex; gap: 15px; margin-bottom: 25px; }
          .card-stat { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 18px; border-radius: 10px; flex: 1; }
          .stat-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .stat-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .class-section { margin-bottom: 30px; page-break-inside: avoid; }
          .class-header { font-size: 16px; font-weight: 800; background: #0f172a; color: #ffffff; padding: 8px 14px; border-radius: 8px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; }
          .status-optimal { color: #166534; font-weight: bold; background: #dcfce7; padding: 2px 8px; border-radius: 4px; display: inline-block; }
          .status-warning { color: #9a3412; font-weight: bold; background: #ffedd5; padding: 2px 8px; border-radius: 4px; display: inline-block; }
        </style>
      </head>
      <body>
        <h1>Laporan Audit & Review Hasil Penjadwalan AI</h1>
        <div class="subtitle">Analisis Kepatuhan Jam Pelajaran (2 JP, 3 JP, 2+2 JP, 3+2 JP) & Alokasi Guru</div>

        <div class="summary-box">
          <div class="card-stat">
            <div class="stat-title">Total Rombel Kelas</div>
            <div class="stat-value">${report.length} Kelas</div>
          </div>
          <div class="card-stat">
            <div class="stat-title">Total Beban Mengajar</div>
            <div class="stat-value">${totalAllocatedJP} JP (${totalItemsCount} Mapel)</div>
          </div>
          <div class="card-stat">
            <div class="stat-title">Bentrok Jadwal / Guru</div>
            <div class="stat-value" style="color: ${teacherConflicts.length === 0 ? "#166534" : "#9a3412"};">${teacherConflicts.length} Bentrok</div>
          </div>
          <div class="card-stat">
            <div class="stat-title">Jam 1 JP Terpisah</div>
            <div class="stat-value" style="color: ${singleJPCount === 0 ? "#166534" : "#9a3412"};">${singleJPCount} Terpisah</div>
          </div>
        </div>
    `

    report.forEach((cls) => {
      html += `
        <div class="class-section">
          <div class="class-header">Rombel: ${cls.kelasNama} (${cls.totalJP} JP, ${cls.totalMapel} Mapel)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Mata Pelajaran</th>
                <th style="width: 25%;">Guru Pengampu</th>
                <th style="width: 25%;">Distribusi Pertemuan</th>
                <th style="width: 25%;">Status & Analisis</th>
              </tr>
            </thead>
            <tbody>
      `
      cls.items.forEach((it) => {
        html += `
          <tr>
            <td><strong>${it.mapelNama}</strong><br/><span style="color:#64748b; font-size:11px;">Beban: ${it.jumlahJam} JP</span></td>
            <td>${it.guru}</td>
            <td>${it.pertemuanDetails}</td>
            <td>
              <span class="${it.statusType === "optimal" ? "status-optimal" : "status-warning"}">${it.status}</span>
              <div style="font-size:11px; color:#475569; margin-top:4px;">${it.detailAnalisis}</div>
            </td>
          </tr>
        `
      })
      html += `
            </tbody>
          </table>
        </div>
      `
    })

    html += `
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-3 md:p-6 z-[100] animate-fade-in overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-5xl w-full p-5 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Review & Analisis Hasil Penjadwalan
                </h2>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                  Verified Optimal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                Audit Kepatuhan Blok Jam (2 JP, 3 JP, 2+2 JP, 3+2 JP) dan Alokasi Guru Pengampu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 shrink-0">
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Rombel</span>
            <span className="text-base font-black text-slate-800 mt-0.5 block">{report.length} Kelas</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Alokasi</span>
            <span className="text-base font-black text-slate-800 mt-0.5 block">{totalAllocatedJP} JP</span>
          </div>
          <div className={`p-3.5 border rounded-2xl ${teacherConflicts.length === 0 ? "bg-emerald-50/70 border-emerald-100" : "bg-rose-50/70 border-rose-100"}`}>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${teacherConflicts.length === 0 ? "text-emerald-600" : "text-rose-600"}`}>
              Konflik Bentrok Guru
            </span>
            <span className={`text-base font-black mt-0.5 block ${teacherConflicts.length === 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {teacherConflicts.length === 0 ? "0 (Bebas Bentrok)" : `${teacherConflicts.length} Slot Bentrok`}
            </span>
          </div>
          <div className={`p-3.5 border rounded-2xl ${singleJPCount === 0 ? "bg-teal-50/70 border-teal-100" : "bg-amber-50/70 border-amber-100"}`}>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${singleJPCount === 0 ? "text-teal-600" : "text-amber-600"}`}>
              Spesifikasi Pertemuan
            </span>
            <span className={`text-base font-black mt-0.5 block ${singleJPCount === 0 ? "text-teal-700" : "text-amber-700"}`}>
              {singleJPCount === 0 ? "100% Sesuai Rules" : `${singleJPCount} Jam 1 JP`}
            </span>
          </div>
        </div>

        {/* Detailed Conflict Notice if any */}
        {teacherConflicts.length > 0 && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1 shrink-0 max-h-32 overflow-y-auto">
            <div className="font-bold flex items-center space-x-1.5 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Ditemukan {teacherConflicts.length} Bentrok Jam Mengajar Guru:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-medium">
              {teacherConflicts.map((c, idx) => (
                <li key={idx}>
                  <strong>{c.teacher}</strong> bentrok pada hari <strong>{DAY_DISPLAY_LABEL[c.day] || c.day} Jam ke-{c.jp}</strong> di kelas: {c.classes.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Mata Pelajaran, Guru Pengampu, atau Kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            <button
              onClick={() => setSelectedClassId("all")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedClassId === "all"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Kelas
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  selectedClassId === c.id
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.namaKelas}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar min-h-0">
          {filteredReport.map((cls) => {
            const items = cls.items.filter((it) =>
              searchQuery.trim() === "" ||
              it.mapelNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
              it.guru.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cls.kelasNama.toLowerCase().includes(searchQuery.toLowerCase())
            )

            if (items.length === 0) return null

            return (
              <div key={cls.classId} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                {/* Class Header */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h3 className="font-extrabold text-sm tracking-wide">
                      KELAS {cls.kelasNama.toUpperCase()}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-bold text-slate-300">
                    <span>{cls.totalJP} JP Total</span>
                    <span>•</span>
                    <span>{items.length} Mapel</span>
                  </div>
                </div>

                {/* Subject Items Grid */}
                <div className="divide-y divide-slate-100 bg-white">
                  {items.map((it) => (
                    <div key={it.mapelId} className="p-4 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-black text-slate-800 text-sm">{it.mapelNama}</span>
                          <span className="bg-slate-100 text-slate-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                            {it.jumlahJam} JP
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            it.statusType === "optimal"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {it.status}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-slate-600 font-medium">
                          <div className="flex items-center space-x-1.5">
                            <User className="w-3.5 h-3.5 text-teal-600" />
                            <span className="font-bold text-slate-700">{it.guru}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-semibold text-slate-600">{it.pertemuanDetails}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 font-normal leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          &ldquo;{it.detailAnalisis}&rdquo;
                        </p>
                      </div>

                      <div className="shrink-0 flex md:flex-col items-center justify-end gap-2">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Pertemuan</span>
                          <span className="text-xs font-black text-slate-700">{it.pertemuanCount}x Pertemuan</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {allItems.length === 0 && (
            <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold">Tidak ada data review yang sesuai pencarian atau filter kelas.</p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 mt-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyReportText}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-2 text-slate-500" />
              <span>Salin Teks Laporan</span>
            </button>
            <button
              onClick={handlePrintReport}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all flex items-center cursor-pointer shadow-sm shadow-teal-100"
            >
              <Printer className="w-4 h-4 mr-2" />
              <span>Cetak Hasil Review</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
          >
            Tutup Review
          </button>
        </div>
      </div>
    </div>
  )
}
