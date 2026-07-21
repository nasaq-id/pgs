"use client"

import { useState, Fragment } from "react"
import { Printer, X, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
}

interface SiswaRecord {
  id: string
  namaLengkap: string
  jenisKelamin: string | null
  kelasId: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  kelasList: KelasRecord[]
  siswaList: SiswaRecord[]
  sekolahInfo?: {
    namaSekolah?: string
    yayasan?: string
    alamat?: string
    akreditasi?: string
    email?: string
  } | null
}

const BULAN_LIST = [
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni"
]

export default function LaporanKelasDialog({
  open,
  onClose,
  kelasList,
  siswaList,
  sekolahInfo,
}: Props) {
  const [tahunAjaran] = useState("2026/2027")

  // Calculate per class stats (L, P, Total)
  const kelasMap = new Map<string, { L: number; P: number; total: number }>()
  siswaList.forEach((s) => {
    if (s.kelasId) {
      const curr = kelasMap.get(s.kelasId) || { L: 0, P: 0, total: 0 }
      if (s.jenisKelamin === "L") curr.L += 1
      else if (s.jenisKelamin === "P") curr.P += 1
      curr.total = curr.L + curr.P
      kelasMap.set(s.kelasId, curr)
    }
  })

  // Group kelas by tingkat for Rekapitulasi
  const rekapByTingkat = new Map<string, number>()
  kelasList.forEach((k) => {
    const tingkatLabel = k.tingkat ? `Kelas ${k.tingkat.replace(/^(tingkat_|kelas_|kls_)/i, "")}` : "Lainnya"
    const stats = kelasMap.get(k.id) || { total: 0 }
    rekapByTingkat.set(tingkatLabel, (rekapByTingkat.get(tingkatLabel) || 0) + stats.total)
  })

  const totalAllSiswaInKelas = Array.from(kelasMap.values()).reduce((acc, curr) => acc + curr.total, 0)

  const handlePrint = () => {
    window.print()
  }

  const namaYayasan = sekolahInfo?.yayasan || "YAYASAN WAKAF AT-TURMUDZI"
  const namaSekolah = sekolahInfo?.namaSekolah || "MTS AT-TURMUDZI"
  const alamatLengkap = sekolahInfo?.alamat || "JL. DESA CIBODAS NO. 85, KEL. CIBODAS, KEC. KUTAWARINGIN, KAB. BANDUNG, JAWA BARAT"
  const akreditasi = sekolahInfo?.akreditasi || "A"
  const email = sekolahInfo?.email || "INFO@ATSURMUDZI.SCH.ID"

  const currentDateStr = format(new Date(), "d MMMM yyyy", { locale: id })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 rounded-3xl overflow-hidden print:max-w-none print:max-h-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none">
        {/* Dialog Header & Action Controls (Hidden on print) */}
        <DialogHeader className="print:hidden p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <DialogTitle className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Preview Laporan Keadaan Siswa (Laporan Kelas)
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 text-xs font-extrabold uppercase tracking-wider gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Download PDF</span>
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-9 text-xs font-bold gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> Tutup
            </Button>
          </div>
        </DialogHeader>

        {/* Report Document Body */}
        <div className="p-6 md:p-10 overflow-y-auto flex-1 bg-white text-black font-sans text-xs print:p-0 print:overflow-visible">
          {/* Printable Layout Container */}
          <div className="w-full max-w-[1000px] mx-auto space-y-5">
            {/* Kop Surat Header */}
            <div className="text-center space-y-1 pb-3 border-b-2 border-black">
              <h4 className="font-extrabold text-sm uppercase tracking-wider">{namaYayasan}</h4>
              <h2 className="font-black text-xl uppercase tracking-widest text-slate-900">{namaSekolah}</h2>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                {alamatLengkap} | AKREDITASI {akreditasi} | EMAIL: {email}
              </p>
            </div>

            {/* Document Title */}
            <div className="text-center space-y-1 py-1">
              <h3 className="font-black text-base uppercase tracking-wider underline">
                LAPORAN KEADAAN SISWA
              </h3>
              <p className="font-bold text-xs text-slate-700">Tahun Pelajaran: {tahunAjaran}</p>
            </div>

            {/* Table 1: Keadaan Siswa per Bulan */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-[10px] text-center">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1.5 w-8">No</th>
                    <th className="border border-black p-1.5 min-w-[100px]">Kelas</th>
                    <th className="border border-black p-1.5 w-16">L/P/Jml</th>
                    {BULAN_LIST.map((b) => (
                      <th key={b} className="border border-black p-1.5">{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kelasList.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="border border-black p-4 text-slate-500 italic">
                        Belum ada data rombel kelas
                      </td>
                    </tr>
                  ) : (
                    kelasList.map((k, idx) => {
                      const stats = kelasMap.get(k.id) || { L: 0, P: 0, total: 0 }
                      return (
                        <Fragment key={k.id}>
                          <tr className="border-t border-black">
                            <td rowSpan={3} className="border border-black p-1 font-bold align-middle bg-slate-50/30">{idx + 1}</td>
                            <td rowSpan={3} className="border border-black p-1 font-extrabold align-middle text-left pl-2 bg-slate-50/30">{k.namaKelas}</td>
                            <td className="border border-black p-1 font-bold">L</td>
                            {BULAN_LIST.map((b) => (
                              <td key={b} className="border border-black p-1">{stats.L}</td>
                            ))}
                          </tr>
                          <tr>
                            <td className="border border-black p-1 font-bold">P</td>
                            {BULAN_LIST.map((b) => (
                              <td key={b} className="border border-black p-1">{stats.P}</td>
                            ))}
                          </tr>
                          <tr className="font-bold bg-slate-50/50 border-b border-black">
                            <td className="border border-black p-1">Jml</td>
                            {BULAN_LIST.map((b) => (
                              <td key={b} className="border border-black p-1">{stats.total}</td>
                            ))}
                          </tr>
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table 2: Rekapitulasi Jumlah Siswa */}
            <div className="space-y-1 pt-2">
              <div className="bg-sky-100/70 border border-black p-1.5 text-center font-extrabold text-xs">
                Rekapitulasi Jumlah Siswa
              </div>
              <table className="w-full border-collapse border border-black text-[10px] text-center">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1.5 text-left pl-3">Tingkat / Kelas</th>
                    <th className="border border-black p-1.5">Juni (Awal)</th>
                    {BULAN_LIST.map((b) => (
                      <th key={b} className="border border-black p-1.5">{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(rekapByTingkat.entries()).map(([tingkatLabel, count]) => (
                    <tr key={tingkatLabel} className="border-b border-black">
                      <td className="border border-black p-1.5 text-left pl-3 font-bold bg-slate-50/50">{tingkatLabel}</td>
                      <td className="border border-black p-1.5">{count}</td>
                      {BULAN_LIST.map((b) => (
                        <td key={b} className="border border-black p-1.5">{count}</td>
                      ))}
                    </tr>
                  ))}
                  <tr className="font-black bg-amber-50/80 border-t-2 border-black">
                    <td className="border border-black p-1.5 text-left pl-3">Total Siswa</td>
                    <td className="border border-black p-1.5">{totalAllSiswaInKelas}</td>
                    {BULAN_LIST.map((b) => (
                      <td key={b} className="border border-black p-1.5">{totalAllSiswaInKelas}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-8 flex justify-between items-start text-xs font-semibold">
              <div className="text-center space-y-14">
                <p>Mengetahui,<br />Kepala {namaSekolah}</p>
                <div>
                  <p className="font-bold underline">____________________________</p>
                  <p className="text-[10px] text-slate-600">NIP. ________________________</p>
                </div>
              </div>

              <div className="text-center space-y-14">
                <p>....................., {currentDateStr}<br />Tata Usaha / Kesiswaan</p>
                <div>
                  <p className="font-bold underline">____________________________</p>
                  <p className="text-[10px] text-slate-600">NIP. ________________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
