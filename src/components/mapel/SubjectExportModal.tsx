"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Printer, FileSpreadsheet, Download, BookOpen, CheckCircle2, ShieldCheck } from "lucide-react"
import {
  exportSubjectsToExcel,
  exportSubjectsToPdf,
  sortSubjectsByRegulation,
  filterSubjectsByTingkat,
  getUniqueTingkatList,
  formatTeacherNames,
  isSubjectInTingkat,
} from "./subjectExportUtils"

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
  kelompok: string | null
  jumlahJam: number
  aktif: boolean
  pengampu?: {
    guru: { namaLengkap: string } | null
  }[]
}

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
}

interface SubjectExportModalProps {
  isOpen: boolean
  onClose: () => void
  subjects: MapelRecord[]
  classes: KelasRecord[]
  institution: any
  currentTingkatFilter?: string
}

const KopSurat = ({ sekolah }: { sekolah: any }) => {
  const isKemenag = ["mi", "mts", "ma"].includes(sekolah?.jenjang || "")
  const hasKopBaris = sekolah?.kopBaris1 || sekolah?.kopBaris2 || sekolah?.kopBaris3 || sekolah?.kopBaris4

  if (sekolah?.useCustomKop && sekolah?.customKopGambar) {
    return (
      <div className="kop-container" style={{ width: "100%", marginBottom: "15px", display: "flex", justifyContent: "center" }}>
        <img 
          src={sekolah.customKopGambar} 
          alt="Kop Surat" 
          style={{ width: "100%", height: `${sekolah.customKopTinggi || 35}mm`, objectFit: "contain" }} 
        />
      </div>
    )
  }

  return (
    <div className="kop-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "15px", borderBottom: "3px double #000", paddingBottom: "10px", marginBottom: "15px", width: "100%" }}>
      {sekolah?.logoKiriKop ? (
        <img src={sekolah.logoKiriKop} alt="Logo Kiri" style={{ height: 55, width: 55, objectFit: "contain" }} />
      ) : isKemenag ? (
        <div style={{ height: 50, width: 50, borderRadius: "50%", backgroundColor: "#059669", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #047857", padding: "2px", boxSizing: "border-box" }}>
          <span style={{ fontSize: "7px", fontWeight: "bold", textTransform: "uppercase" }}>Kemenag</span>
        </div>
      ) : (
        <div style={{ height: 50, width: 50, borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #1d4ed8", padding: "2px", boxSizing: "border-box" }}>
          <span style={{ fontSize: "6px", fontWeight: "bold", textTransform: "uppercase" }}>Tut Wuri</span>
        </div>
      )}

      <div style={{ flex: 1, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        {hasKopBaris ? (
          <>
            {sekolah?.kopBaris1 && (
              <h5 style={{ fontSize: 9, margin: 0, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {sekolah.kopBaris1}
              </h5>
            )}
            {sekolah?.kopBaris2 && (
              <h5 style={{ fontSize: 9, margin: 0, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {sekolah.kopBaris2}
              </h5>
            )}
            <h4 style={{ fontSize: 13, margin: "2px 0", fontWeight: "bold", textTransform: "uppercase" }}>
              {sekolah?.kopBaris3 || sekolah?.namaSekolah || "SEKOLAH CONTOH"}
            </h4>
            <p style={{ fontSize: 8, margin: 0, color: "#4b5563" }}>
              {sekolah?.kopBaris4 || sekolah?.alamat || ""}
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 15, margin: 0, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
              {sekolah?.namaSekolah || "Nama Lembaga Pendidikan"}
            </h1>
            <p style={{ fontSize: 9, margin: "2px 0", color: "#4b5563" }}>
              {sekolah?.alamat || ""}{sekolah?.npsn ? ` | NPSN: ${sekolah.npsn}` : ""}
            </p>
          </>
        )}
      </div>

      <div style={{ width: 50 }} className="print:hidden md:block shrink-0" />
    </div>
  )
}

const KELOMPOK_LABEL: Record<string, string> = {
  A: "Mapel Wajib",
  B: "Mapel Pilihan",
  C: "Mapel Pilihan",
  muatan_lokal: "Muatan Lokal",
}

export const SubjectExportModal: React.FC<SubjectExportModalProps> = ({
  isOpen,
  onClose,
  subjects,
  classes,
  institution,
  currentTingkatFilter = "Semua"
}) => {
  const [selectedTingkat, setSelectedTingkat] = useState<string>(currentTingkatFilter || "Semua")
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false)
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setSelectedTingkat(currentTingkatFilter || "Semua")
  }, [currentTingkatFilter, isOpen])

  if (!isOpen || !mounted) return null

  const availableTingkatList = getUniqueTingkatList(classes)
  const filtered = filterSubjectsByTingkat(subjects, selectedTingkat, classes)
  const sortedSubjects = sortSubjectsByRegulation(filtered)
  const isAllTingkat = selectedTingkat === "Semua"

  const grandTotalJP = isAllTingkat
    ? availableTingkatList.reduce((acc, t) => acc + sortedSubjects.reduce((sum, s) => sum + (isSubjectInTingkat(s, t, classes) ? (s.jumlahJam || 0) : 0), 0), 0)
    : sortedSubjects.reduce((sum, s) => sum + (s.jumlahJam || 0), 0)

  const wajibCount = sortedSubjects.filter(s => KELOMPOK_LABEL[s.kelompok || "A"] === "Mapel Wajib").length
  const pilihanCount = sortedSubjects.filter(s => KELOMPOK_LABEL[s.kelompok || "A"] === "Mapel Pilihan").length

  const handleExcelExport = () => {
    try {
      setIsExportingExcel(true)
      exportSubjectsToExcel({
        subjects,
        classes,
        institution,
        selectedTingkat
      })
    } catch (error) {
      console.error("Failed to export Excel:", error)
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handlePdfExport = () => {
    try {
      setIsExportingPdf(true)
      exportSubjectsToPdf({
        subjects,
        classes,
        institution,
        selectedTingkat
      })
    } catch (error) {
      console.error("Failed to export PDF:", error)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const categories = ["Mapel Wajib", "Mapel Pilihan", "Muatan Lokal"]
  const numCols = isAllTingkat ? 3 + availableTingkatList.length + 2 : 5

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/20 p-2 sm:p-4 overflow-y-auto text-left"
    >
      <style>{`
        @media print {
          @page {
            size: ${isAllTingkat ? "landscape" : "portrait"};
            margin: 10mm;
          }
          /* Reset overlay container for print */
          .fixed.inset-0 {
            position: absolute !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
          }
          /* Ensure modal card takes full space and removes borders */
          .fixed.inset-0 > div {
            border: none !important;
            box-shadow: none !important;
            max-width: none !important;
            max-height: none !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            background: white !important;
          }
        }
      `}</style>
      <div className={`bg-background rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full ${isAllTingkat ? "max-w-6xl" : "max-w-5xl"} my-auto flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300`}>
        
        {/* Header Modal - Non printable */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/30 shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-2xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">Cetak & Ekpor Program Mata Pelajaran</h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900">
                  <ShieldCheck className="w-3 h-3 mr-1 text-teal-600 dark:text-teal-400" />
                  Standar Regulasi KMA / Permendikdasmen
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hasil cetak/ekpor akan diurutkan secara baku sesuai hirarki kurikulum nasional
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Filter & Quick Actions - Non printable */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-100 dark:border-slate-800/60 shrink-0 print:hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">Filter Tingkat:</span>
            <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
              <button
                type="button"
                onClick={() => setSelectedTingkat("Semua")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedTingkat === "Semua"
                    ? "bg-teal-600 text-white shadow-md shadow-teal-500/10"
                    : "neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] text-slate-700 dark:text-slate-300 border-0"
                }`}
              >
                Semua Tingkat (Landscape)
              </button>
              {availableTingkatList.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTingkat(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedTingkat === t
                      ? "bg-teal-600 text-white shadow-md shadow-teal-500/10"
                      : "neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] text-slate-700 dark:text-slate-300 border-0"
                  }`}
                >
                  {t.toLowerCase().startsWith("kelas") ? t : `Kelas ${t}`}
                </button>
              ))}
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExcelExport}
              disabled={isExportingExcel}
              className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              title="Ekspor ke Microsoft Excel dengan sheet per tingkat"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              <span>{isExportingExcel ? "Memproses..." : "Excel (.xlsx)"}</span>
            </button>

            <button
              onClick={handlePdfExport}
              disabled={isExportingPdf}
              className="flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md shadow-rose-500/10 cursor-pointer disabled:opacity-50"
              title="Download file dokumen PDF resmi"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>{isExportingPdf ? "Memproses..." : "PDF"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center bg-slate-850 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-655 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
              title="Cetak atau Simpan PDF lewat browser"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              <span>Cetak / Print</span>
            </button>
          </div>
        </div>

        {/* Live Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 dark:bg-slate-950/20 custom-scrollbar print:p-0 print:bg-white print:overflow-visible">
          <div className={`bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/80 ${isAllTingkat ? "max-w-5xl" : "max-w-4xl"} mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none text-slate-800 dark:text-slate-100`}>
            
            {/* Kop Surat Header */}
            <KopSurat sekolah={institution} />

            {/* Title Section */}
            <div className="text-center my-6 space-y-1">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                STRUKTUR KURIKULUM & PROGRAM MATA PELAJARAN
              </h2>
              <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Target: <strong className="text-slate-800 dark:text-slate-200">{selectedTingkat === "Semua" ? "Semua Tingkat / Umum (Matriks Rincian JP)" : `Kelas ${selectedTingkat}`}</strong></span>
                <span>•</span>
                <span>Tahun Akademik: <strong className="text-slate-800 dark:text-slate-200">{institution?.tahunAjaran || "2025/2026"}</strong></span>
              </div>
            </div>

            {/* Summary Stats Badges - Non printable */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2 print:hidden bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
              <div className="text-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase">Total Mapel</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">{sortedSubjects.length} Mapel</span>
              </div>
              <div className="text-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block uppercase">Mapel Wajib</span>
                <span className="text-sm font-black text-teal-700 dark:text-teal-300">{wajibCount} Mapel</span>
              </div>
              <div className="text-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase">Mapel Pilihan</span>
                <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{pilihanCount} Mapel</span>
              </div>
              <div className="text-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">Total Beban</span>
                <span className="text-sm font-black text-amber-700 dark:text-amber-300">{grandTotalJP} JP</span>
              </div>
            </div>

            {/* Main Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-900 dark:border-slate-700 print:rounded-none">
              <table className="w-full text-left text-xs border-collapse border border-slate-900 dark:border-slate-750">
                <thead>
                  <tr className="bg-teal-700 text-white font-bold text-[11px] uppercase tracking-wider print:bg-slate-200 print:text-slate-900">
                    <th className="p-2.5 border border-slate-900 dark:border-slate-700 text-center w-10">No</th>
                    <th className="p-2.5 border border-slate-900 dark:border-slate-700 text-center w-24">Kode</th>
                    <th className="p-2.5 border border-slate-900 dark:border-slate-700">Nama Mata Pelajaran</th>
                    {isAllTingkat ? (
                      <>
                        {availableTingkatList.map(t => (
                          <th key={t} className="p-2.5 border border-slate-900 dark:border-slate-700 text-center whitespace-nowrap px-3">
                            {t.toLowerCase().startsWith("kelas") ? t : `Kelas ${t}`}
                          </th>
                        ))}
                        <th className="p-2.5 border border-slate-900 dark:border-slate-700 text-center w-20">Total JP</th>
                      </>
                    ) : (
                      <th className="p-2.5 border border-slate-900 dark:border-slate-700 text-center w-20">Beban</th>
                    )}
                    <th className="p-2.5 border border-slate-900 dark:border-slate-700">Guru Pengampu</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let globalNo = 1

                    return categories.map(cat => {
                      const catMapel = sortedSubjects.filter(s => KELOMPOK_LABEL[s.kelompok || "A"] === cat)
                      if (catMapel.length === 0) return null

                      return (
                        <React.Fragment key={cat}>
                          {/* Category Header Row */}
                          <tr className="bg-slate-100/90 dark:bg-slate-800/80 font-black text-slate-800 dark:text-slate-200 text-[11px] tracking-wide border-b border-slate-900 dark:border-slate-700">
                            <td colSpan={numCols} className="p-2 border border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                              <span className="text-teal-800 dark:text-teal-400 uppercase">
                                {cat} ({catMapel.length} Mata Pelajaran)
                              </span>
                            </td>
                          </tr>

                          {/* Category Items */}
                          {catMapel.map((sub) => {
                            const curNo = globalNo++
                            const teacherDisplay = formatTeacherNames(sub.pengampu)

                            if (isAllTingkat) {
                              const tJps = availableTingkatList.map(t => isSubjectInTingkat(sub, t, classes) ? (sub.jumlahJam || 0) : 0)
                              const activeCount = availableTingkatList.filter(t => isSubjectInTingkat(sub, t, classes)).length
                              const subTotalJP = activeCount * (sub.jumlahJam || 0)

                              return (
                                <tr key={sub.id} className="border-b border-slate-900 dark:border-slate-700 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                  <td className="p-2 border border-slate-900 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-400">{curNo}</td>
                                  <td className="p-2 border border-slate-900 dark:border-slate-700 text-center font-extrabold text-slate-800 dark:text-slate-200 font-mono">{sub.kodeMapel || "-"}</td>
                                  <td className="p-2 border border-slate-900 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{sub.namaMapel}</td>
                                  {tJps.map((jp, idx) => (
                                    <td key={availableTingkatList[idx]} className="p-2 border border-slate-900 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-slate-200">
                                      {jp > 0 ? `${jp} JP` : "-"}
                                    </td>
                                  ))}
                                  <td className="p-2 border border-slate-900 dark:border-slate-700 text-center font-black text-teal-800 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20">{subTotalJP} JP</td>
                                  <td className="p-2 border border-slate-900 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-350">{teacherDisplay}</td>
                                </tr>
                              )
                            }

                            return (
                              <tr key={sub.id} className="border-b border-slate-900 dark:border-slate-700 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="p-2 border border-slate-900 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-400">{curNo}</td>
                                <td className="p-2 border border-slate-900 dark:border-slate-700 text-center font-extrabold text-slate-800 dark:text-slate-200 font-mono">{sub.kodeMapel || "-"}</td>
                                <td className="p-2 border border-slate-900 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{sub.namaMapel}</td>
                                <td className="p-2 border border-slate-900 dark:border-slate-700 text-center font-black text-slate-800 dark:text-slate-200">{sub.jumlahJam || 0} JP</td>
                                <td className="p-2 border border-slate-900 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-350">{teacherDisplay}</td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      )
                    })
                  })()}

                  {/* Total Summary Row */}
                  {isAllTingkat ? (
                    <tr className="bg-teal-50/80 dark:bg-teal-950/20 font-black text-slate-800 dark:text-slate-200 text-[11px] border-t-2 border-slate-900 dark:border-slate-700">
                      <td colSpan={3} className="p-2.5 border border-slate-900 dark:border-slate-700 text-right uppercase tracking-wider">
                        Total Beban Mengajar / Minggu:
                      </td>
                      {availableTingkatList.map(t => {
                        const tTotal = sortedSubjects.reduce((sum, s) => sum + (isSubjectInTingkat(s, t, classes) ? (s.jumlahJam || 0) : 0), 0)
                        return (
                          <td key={t} className="p-2.5 border border-slate-900 dark:border-slate-700 text-center text-teal-800 dark:text-teal-350 text-xs font-black">
                            {tTotal} JP
                          </td>
                        )
                      })}
                      <td className="p-2.5 border border-slate-900 dark:border-slate-700 text-center text-teal-900 dark:text-teal-200 text-xs font-black bg-teal-100/90 dark:bg-teal-900/60">
                        {grandTotalJP} JP
                      </td>
                      <td className="p-2.5 border border-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-400 text-xs font-bold">
                        {sortedSubjects.length} Mata Pelajaran
                      </td>
                    </tr>
                  ) : (
                    <tr className="bg-teal-50/80 dark:bg-teal-950/20 font-black text-slate-800 dark:text-slate-200 text-[11px] border-t-2 border-slate-900 dark:border-slate-700">
                      <td colSpan={3} className="p-2.5 border border-slate-900 dark:border-slate-700 text-right uppercase tracking-wider">
                        Total Beban Mengajar / Minggu:
                      </td>
                      <td className="p-2.5 border border-slate-900 dark:border-slate-700 text-center text-teal-800 dark:text-teal-350 text-xs font-black">
                        {grandTotalJP} JP
                      </td>
                      <td className="p-2.5 border border-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-400 text-xs font-bold">
                        {sortedSubjects.length} Mata Pelajaran
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="mt-10 pt-4 flex justify-between items-end text-xs text-slate-800 dark:text-slate-200 avoid-break print:flex">
              <div className="w-48 text-center space-y-1 invisible print:visible"></div>
              <div className="w-64 text-center space-y-1">
                <p>Ditetapkan di: Lembaga</p>
                <p>Pada Tanggal: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="font-bold mt-2">Kepala {institution?.namaSekolah || "Sekolah"}</p>
                <div className="h-16" />
                <p className="font-black underline">{institution?.kepalaSekolah || "Kepala Lembaga, M.Pd."}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">NIP. {institution?.nip || "-"}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions - Non printable */}
        <div className="p-4 bg-slate-55 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/60 shrink-0 print:hidden flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Format urutan telah otomatis disesuaikan dengan aturan regulasi terbaru.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-850 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-250 font-bold rounded-xl transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
