"use client"

import { useState, useMemo, useRef } from "react"
import { Shield, BookOpen, AlertCircle, CheckCircle, Users, Scale, MessageSquare, Clock, Printer, RefreshCw, Sliders, Calendar, FileCheck2, TrendingUp, TrendingDown, Award, AlertTriangle, X } from "lucide-react"
import { api } from "@/lib/trpc/client"

const SOP_PRINT_CSS = `
  @media print {
    @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm !important; }
    html, body { background: white !important; color: #0f172a !important; margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .no-print { display: none !important; }
    .sop-section { page-break-inside: avoid !important; break-inside: avoid !important; }
    table { width: 100% !important; border-collapse: collapse !important; }
    th, td { border-color: #cbd5e1 !important; }
  }
`

export default function SopEpoinPage() {
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState("")

  const { data: aturanList } = api.poin.getAllAturan.useQuery()
  const { data: thresholdData } = api.poin.getMonitoringThreshold.useQuery()
  const { data: kategoriList } = api.poin.getAllKategori.useQuery({})

  const negativeThresholds = useMemo(() => {
    if (!aturanList) return []
    return aturanList.filter(a => a.poinMin < 0).sort((a, b) => a.poinMin - b.poinMin)
  }, [aturanList])

  const positiveThresholds = useMemo(() => {
    if (!aturanList) return []
    return aturanList.filter(a => a.poinMin >= 0).sort((a, b) => a.poinMin - b.poinMin)
  }, [aturanList])

  const totalStudentsAtRisk = useMemo(() => {
    if (!thresholdData) return 0
    let count = 0
    thresholdData.forEach((g: any) => { if (g.aturan.poinMin < 0) count += g.students.length })
    return count
  }, [thresholdData])

  const totalStudentsAwarded = useMemo(() => {
    if (!thresholdData) return 0
    let count = 0
    thresholdData.forEach((g: any) => { if (g.aturan.poinMin >= 0) count += g.students.length })
    return count
  }, [thresholdData])

  const handleSync = () => {
    setLastSyncTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))
  }

  const handlePrint = () => {
    setShowPrintModal(true)
  }

  return (
    <div className="space-y-6 text-left max-w-4xl">
      <style>{SOP_PRINT_CSS}</style>

      {/* Non-Printable Header & Control Bar */}
      <div className="bg-background rounded-3xl border border-slate-200 p-6 space-y-4 no-print">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-650 flex items-center justify-center">
              <BookOpen size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">SOP E-Poin</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Standard Operating Procedure Pencatatan Poin & Alur Tindak Lanjut
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSync}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Sync {lastSyncTime && `(${lastSyncTime})`}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer size={14} />
              <span>Cetak SOP</span>
            </button>
          </div>
        </div>

        {/* Live Parameter Indicator */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Scale size={16} /></div>
            <div>
              <p className="text-[9px] text-slate-500 font-bold">Ambang Batas SP</p>
              <p className="font-black text-slate-800">{negativeThresholds.length} Aturan</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><AlertTriangle size={16} /></div>
            <div>
              <p className="text-[9px] text-slate-500 font-bold">Siswa Kritis</p>
              <p className="font-black text-slate-800">{totalStudentsAtRisk} Siswa</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Award size={16} /></div>
            <div>
              <p className="text-[9px] text-slate-500 font-bold">Ambang Prestasi</p>
              <p className="font-black text-slate-800">{positiveThresholds.length} Aturan</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 text-teal-700 rounded-lg"><CheckCircle size={16} /></div>
            <div>
              <p className="text-[9px] text-slate-500 font-bold">Siswa Berprestasi</p>
              <p className="font-black text-slate-800">{totalStudentsAwarded} Siswa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main SOP Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <Scale size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Maksud & Tujuan</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-bold">
            Sistem E-Poin dirancang bukan hanya sebagai instrumen hukuman, melainkan sebagai media pembentukan karakter, kejujuran, disiplin, dan wadah apresiasi atas prestasi yang dicapai oleh siswa.
          </p>
          <ul className="text-[11px] text-slate-500 space-y-2 pt-1 font-semibold list-disc list-inside">
            <li>Menciptakan iklim belajar yang aman dan suportif.</li>
            <li>Memberikan penghargaan (rewards) transparan bagi siswa teladan.</li>
            <li>Menyediakan data rekam medis perilaku yang valid bagi BK dan orang tua.</li>
          </ul>
        </div>

        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <Clock size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Alur Pencatatan & Input</h3>
          </div>
          <div className="space-y-3 text-[11px] text-slate-500 font-semibold">
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 font-black flex items-center justify-center flex-shrink-0">1</span>
              <p className="leading-relaxed">
                <strong className="text-slate-700 block">Temuan Kejadian:</strong>
                Guru/petugas menemukan pelanggaran atau prestasi sikap siswa di sekolah.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 font-black flex items-center justify-center flex-shrink-0">2</span>
              <p className="leading-relaxed">
                <strong className="text-slate-700 block">Input ke Sistem:</strong>
                Guru login ke portal, memilih siswa terkait, jenis kategori, mengunggah bukti foto (opsional), dan menyimpan data poin.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 font-black flex items-center justify-center flex-shrink-0">3</span>
              <p className="leading-relaxed">
                <strong className="text-slate-700 block">Notifikasi & Validasi:</strong>
                Sistem otomatis memicu notifikasi dan meneruskan rekap data ke dasbor BK untuk validasi.
              </p>
            </div>
          </div>
        </div>

        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <MessageSquare size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Hak Jawab & Klarifikasi</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-bold">
            Setiap siswa yang dikenai poin negatif berhak memberikan klarifikasi guna menghindari kesalahpahaman data.
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 text-[11px] text-amber-800 leading-normal font-semibold">
            <span className="font-black uppercase tracking-wider block mb-1">Batas Waktu Klarifikasi:</span>
            Maksimal <strong>3 x 24 Jam</strong> sejak poin terdaftar. Siswa didampingi wali kelas dapat mengajukan hak jawab langsung ke ruang BK.
          </div>
        </div>

        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <AlertCircle size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Ambang Batas & Sanksi</h3>
          </div>
          <div className="space-y-3 text-[11px] text-slate-500 font-semibold">
            {negativeThresholds.length > 0 ? (
              negativeThresholds.map((rule, idx) => (
                <div key={rule.id} className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span>{rule.poinMin} s/d {rule.poinMax} Poin</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase">{rule.status}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span>Poin Negatif 10 - 20</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-black uppercase">Teguran & Pembinaan BK</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span>Poin Negatif 21 - 30</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase">Penerbitan SP 1</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span>Poin Negatif 31 - 40</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase">SP 2 & Perjanjian</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Poin Negatif &gt; 40</span>
                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase">SP 3 & Skorsing</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Threshold Reference Table */}
      {aturanList && aturanList.length > 0 && (
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-4 no-print">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Referensi Threshold Aktif</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Daftar ambang batas poin yang sedang aktif di sistem.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-3">Rentang Poin</th>
                  <th className="py-3 px-3">Tindak Lanjut</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {aturanList.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/40">
                    <td className="py-3 px-3 font-black text-slate-800">{rule.poinMin} s/d {rule.poinMax}</td>
                    <td className="py-3 px-3 text-slate-550">{rule.tindakLanjut}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        rule.poinMin < 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}>
                        {rule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-[95vw] lg:max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80 shrink-0 no-print">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">Preview Cetak SOP E-Poin</h2>
                <p className="text-xs text-slate-500 mt-0.5">Dokumen Standar Operasional Prosedur resmi sekolah.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Printer size={14} />
                  Cetak PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-slate-100/60 flex justify-center">
              <div className="bg-white p-8 shadow-sm rounded-2xl border border-slate-200/80 w-full max-w-[210mm]">
                <div className="text-center border-b border-slate-300 pb-4 mb-6">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">STANDAR OPERASIONAL PROSEDUR (SOP) E-POIN</h1>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Tentang Pedoman Apresiasi Prestasi & Penanganan Pelanggaran Siswa</p>
                </div>
                <div className="space-y-6 text-xs text-slate-700 leading-relaxed text-justify">
                  <p className="font-bold">Pasal 1: Maksud, Tujuan & Ketentuan Umum</p>
                  <p>SOP E-Poin merupakan acuan baku yang mengikat seluruh civitas akademika dalam rangka mencatat, mengevaluasi, memberikan apresiasi atas kedisiplinan/prestasi, serta melakukan pembinaan bertahap atas pelanggaran siswa secara transparan dan akuntabel.</p>

                  <p className="font-bold">Pasal 2: Alur Pencatatan & Validasi Poin</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Guru/Petugas menginput data siswa, memilih kategori sikap, deskripsi kejadian, dan foto bukti (opsional).</li>
                    <li>Tim BK melakukan validasi atas laporan yang masuk (apabila fitur validasi aktif).</li>
                    <li>Sistem memperbarui rekap poin siswa dan memicu notifikasi apabila mencapai ambang batas.</li>
                  </ol>

                  <p className="font-bold">Pasal 3: Ambang Batas & Tindak Lanjut</p>
                  <table className="w-full border-collapse border border-slate-300 mt-2">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-left">Rentang Poin</th>
                        <th className="border border-slate-300 p-2 text-left">Tindak Lanjut</th>
                        <th className="border border-slate-300 p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aturanList && aturanList.length > 0 ? aturanList.map((rule) => (
                        <tr key={rule.id}>
                          <td className="border border-slate-300 p-2">{rule.poinMin} s/d {rule.poinMax}</td>
                          <td className="border border-slate-300 p-2">{rule.tindakLanjut}</td>
                          <td className="border border-slate-300 p-2">{rule.status}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="border border-slate-300 p-2 text-center italic">Belum ada threshold dikonfigurasi</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <p className="font-bold">Pasal 4: Hak Jawab & Klarifikasi</p>
                  <p>Setiap siswa yang dikenai poin negatif berhak memberikan klarifikasi maksimal 3x24 Jam sejak poin terdaftar. Siswa didampingi wali kelas dapat mengajukan hak jawab langsung ke ruang BK.</p>

                  <p className="font-bold">Pasal 5: Peran & Wewenang</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Guru & Pegawai Piket: Mencatat kejadian harian</li>
                    <li>Wali Kelas: Memantau rekap poin per kelas</li>
                    <li>Guru BK: Memvalidasi laporan & mengelola monitoring</li>
                    <li>Wakasek & Kepala Sekolah: Menyetujui SP dan mengatur parameter</li>
                  </ul>

                  <div className="pt-6 border-t border-slate-300 grid grid-cols-2 text-center mt-6">
                    <div>
                      <p className="font-semibold text-slate-600">Mengetahui & Menyetujui,</p>
                      <p className="font-bold mt-6">Wakasek Kesiswaan</p>
                      <div className="h-12" />
                      <p className="font-bold border-b border-slate-900 inline-block px-4">[ Nama Wakasek ]</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600">Mengesahkan,</p>
                      <p className="font-bold mt-6">Kepala Sekolah</p>
                      <div className="h-12" />
                      <p className="font-bold border-b border-slate-900 inline-block px-4">[ Nama Kepsek ]</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}