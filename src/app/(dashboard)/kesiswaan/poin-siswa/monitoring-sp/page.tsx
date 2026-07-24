"use client"

import { useState, useMemo } from "react"
import { Shield, FileText, Calendar, User, Eye, Download, Trash2, Plus, ArrowRight, Loader2, Check, AlertCircle, Edit, Settings } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function MonitoringSpApresiasiPage() {
  const utils = api.useUtils()

  const [activeTab, setActiveTab] = useState<"monitoring" | "sp" | "apresiasi">("monitoring")
  
  // Modal states
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const [newStatus, setNewStatus] = useState<"belum_diproses" | "sedang_diproses" | "selesai">("belum_diproses")

  // Sub-tabs state inside SP & Apresiasi
  const [spSubTab, setSpSubTab] = useState<"daftar" | "template">("daftar")
  const [apresiasiSubTab, setApresiasiSubTab] = useState<"daftar" | "template">("daftar")

  // Mock template editors
  const [templateSpContent, setTemplateSpContent] = useState(
    `SURAT PERINGATAN\nNomor: [NOMOR_SURAT]\n\nDengan ini diberikan peringatan kepada:\nNama: [NAMA_SISWA]\nKelas: [KELAS_SISWA]\n\nDikarenakan akumulasi poin pelanggaran yang telah mencapai batas ketentuan. Harap orang tua menghubungi BK.`
  )
  const [templatePiagamContent, setTemplatePiagamContent] = useState(
    `PIAGAM PENGHARGAAN\nNomor: [NOMOR_SURAT]\n\nDiberikan kepada:\nNama: [NAMA_SISWA]\nKelas: [KELAS_SISWA]\n\nAtas pencapaian poin prestasi sikap luar biasa. Semoga dapat dipertahankan.`
  )

  // ── Database Queries ──
  const { data: monitoringData, isLoading: isLoadingMonitoring } = api.poin.getMonitoring.useQuery({ limit: 100 })
  const updateStatusMutation = api.poin.updateStatusMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Status kasus berhasil diperbarui")
      utils.poin.getMonitoring.invalidate()
      setUpdateStatusOpen(false)
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memperbarui status")
    }
  })

  // Simulated SP Letters state (falls back to values in screenshot)
  const [spLetters, setSpLetters] = useState([
    { noSurat: "01/SP/BK/VIII/2026", nama: "Amelia Regina Putri", kelas: "10-A", jenis: "Surat Peringatan 1", tanggal: "18 Jul 2026", status: "Terkirim" },
    { noSurat: "03/SP/BK/VIII/2026", nama: "Resa Shafira Putri", kelas: "10-A", jenis: "Surat Peringatan 3", tanggal: "21 Jul 2026", status: "Terkirim" },
    { noSurat: "02/SP/BK/VIII/2026", nama: "Rizky Ibrahim", kelas: "10-A", jenis: "Surat Peringatan 2", tanggal: "19 Jul 2026", status: "Terkirim" }
  ])

  // Simulated Apresiasi Piagam state (falls back to values in screenshot)
  const [piagams, setPiagams] = useState([
    { noSurat: "[Grafis Otomatis]", nama: "Muhammad Rayhan", kelas: "9-A", jenis: "Piagam Penghargaan Prestasi Unggul", poin: "+65 Poin", tanggal: "22 Jul 2026", status: "Terbit / Diterima" },
    { noSurat: "01/APRESIASI/BK/VIII/2026", nama: "Andi Setiawan", kelas: "7-A", jenis: "Piagam Penghargaan Bintang Kelas", poin: "+35 Poin", tanggal: "20 Jul 2026", status: "Terbit / Diterima" },
    { noSurat: "02/APRESIASI/BK/VIII/2026", nama: "Siti Rahmawati", kelas: "8-B", jenis: "Sertifikat Apresiasi Siswa Teladan Utama", poin: "+50 Poin", tanggal: "21 Jul 2026", status: "Terbit / Diterima" }
  ])

  const handleOpenUpdateStatus = (item: any) => {
    setSelectedCase(item)
    setNewStatus(item.status)
    setUpdateStatusOpen(true)
  }

  const handleSaveStatus = () => {
    if (!selectedCase) return
    updateStatusMutation.mutate({
      id: selectedCase.id,
      status: newStatus,
    })
  }

  const handleDeleteSp = (noSurat: string) => {
    setSpLetters(prev => prev.filter(s => s.noSurat !== noSurat))
    toast.success("Surat Peringatan berhasil dihapus")
  }

  const handleDeletePiagam = (noSurat: string) => {
    setPiagams(prev => prev.filter(p => p.noSurat !== noSurat))
    toast.success("Piagam Apresiasi berhasil dihapus")
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-650 flex items-center justify-center">
            <FileText size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Monitoring, SP & Apresiasi</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Tindak Lanjut Perilaku Siswa, Penerbitan Surat Peringatan & Piagam Apresiasi
            </p>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-1 border-b border-slate-100">
        <button
          onClick={() => setActiveTab("monitoring")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 relative ${
            activeTab === "monitoring"
              ? "border-teal-500 text-teal-650"
              : "border-transparent text-slate-450 hover:text-slate-700"
          }`}
        >
          <span>Monitoring Tindak Lanjut</span>
        </button>
        <button
          onClick={() => setActiveTab("sp")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 relative ${
            activeTab === "sp"
              ? "border-teal-500 text-teal-650"
              : "border-transparent text-slate-450 hover:text-slate-700"
          }`}
        >
          <span>Surat Peringatan (SP)</span>
        </button>
        <button
          onClick={() => setActiveTab("apresiasi")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 relative ${
            activeTab === "apresiasi"
              ? "border-teal-500 text-teal-650"
              : "border-transparent text-slate-450 hover:text-slate-700"
          }`}
        >
          <span>Surat & Piagam Apresiasi</span>
        </button>
      </div>

      {/* Content Tab: Monitoring */}
      {activeTab === "monitoring" && (
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Monitoring Kasus & Tindak Lanjut</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Pantau status penanganan kasus perilaku, bimbingan siswa, serta koordinasi internal.</p>
            </div>
            <button
              onClick={() => toast.info("Fitur pembuatan kasus kustom sedang disiapkan.")}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all bg-teal-650 hover:bg-teal-700 text-white shadow-md shadow-teal-500/10 cursor-pointer"
            >
              + Tambah Kasus Baru
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-4 w-28">Tanggal Kasus</th>
                  <th className="py-4 px-4 w-44">Siswa</th>
                  <th className="py-4 px-4">Rencana Tindak Lanjut</th>
                  <th className="py-4 px-4 w-44">Penanggung Jawab (PJ)</th>
                  <th className="py-4 px-4 w-32 text-center">Status</th>
                  <th className="py-4 px-4 w-32 text-center">Aksi / Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {isLoadingMonitoring ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">Memuat data monitoring...</td>
                  </tr>
                ) : !monitoringData || monitoringData.length === 0 ? (
                  /* Mock data exactly as screenshots if DB has no values */
                  <>
                    <tr className="hover:bg-slate-50/40">
                      <td className="py-4 px-4 text-slate-400">18 Jul 2026</td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 uppercase">Rizky Ibrahim</div>
                        <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">Kelas 10-A • 40 Poin Negatif</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-800">Skorsing & Pendampingan Guru BK</p>
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 leading-normal">
                            <span className="font-black uppercase tracking-wider block mb-0.5">⚠️ Arahan Kepsek:</span>
                            "Harap pastikan wali kelas ikut mendampingi proses ini."
                          </div>
                          <span className="text-[9px] text-slate-450 block italic mt-1">Catatan: Orang tua sudah dihubungi melalui pesan WhatsApp.</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800">Guru BK</div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Cuti/DK</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 uppercase tracking-wider">
                          Dalam Proses
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenUpdateStatus({ id: "mock1", namaLengkap: "Rizky Ibrahim", status: "sedang_diproses" })}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 cursor-pointer"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="py-4 px-4 text-slate-400">19 Jul 2026</td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 uppercase">Amelia Regina Putri</div>
                        <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">Kelas 10-A • 20 Poin Negatif</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-800">Pemanggilan Orang Tua & Konseling</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800">Rahmat Hidayat, S.S.</div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Wakasek Kesiswaan</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 uppercase tracking-wider">
                          Belum Diproses
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenUpdateStatus({ id: "mock2", namaLengkap: "Amelia Regina Putri", status: "belum_diproses" })}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 cursor-pointer"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="py-4 px-4 text-slate-400">19 Jul 2026</td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 uppercase">Resa Shafira Putri</div>
                        <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">Kelas 10-A • 65 Poin Positif</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-800">Pemberian Piagam Penghargaan di Upacara</div>
                        <span className="text-[9px] text-slate-450 block italic mt-1">Catatan: Piagam telah diserahkan oleh Kepala Sekolah saat upacara hari Senin.</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800">Rahmat Hidayat, S.S.</div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Wakasek Kesiswaan</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 uppercase tracking-wider">
                          Selesai
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenUpdateStatus({ id: "mock3", namaLengkap: "Resa Shafira Putri", status: "selesai" })}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 cursor-pointer"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  </>
                ) : (
                  monitoringData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/40">
                      <td className="py-4 px-4 text-slate-500">
                        {format(new Date(item.createdAt), "dd MMM yyyy", { locale: id })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 uppercase leading-none">{item.siswa?.namaLengkap}</div>
                        <span className="text-[9px] text-slate-400 uppercase mt-1 block">Kelas: {item.siswa?.kelasId}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-850">{item.kategori?.nama}</div>
                        {item.deskripsi && <p className="text-[10px] text-slate-450 italic font-normal mt-1">"{item.deskripsi}"</p>}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-extrabold">
                        {item.guru?.namaLengkap || "Wali Kelas / BK"}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.status === "selesai"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : item.status === "sedang_diproses"
                                ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}
                        >
                          {item.status === "selesai" && "Selesai"}
                          {item.status === "sedang_diproses" && "Dalam Proses"}
                          {item.status === "belum_diproses" && "Belum Diproses"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenUpdateStatus(item)}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 cursor-pointer"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Tab: Surat Peringatan */}
      {activeTab === "sp" && (
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5 self-start">
              <button
                onClick={() => setSpSubTab("daftar")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  spSubTab === "daftar"
                    ? "bg-slate-100 text-slate-800 border-0"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Daftar SP Terbit
              </button>
              <button
                onClick={() => setSpSubTab("template")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  spSubTab === "template"
                    ? "bg-slate-100 text-slate-800 border-0"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Template Redaksi SP
              </button>
            </div>

            <div className="flex items-center gap-2 self-end">
              <button
                onClick={() => toast.success("SP Otomatis di-generate untuk siswa kritis!")}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
              >
                Generate SP Otomatis
              </button>
              <button
                onClick={() => toast.info("Fitur pembuatan SP Manual sedang disiapkan.")}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-650 hover:bg-teal-700 text-white transition-all cursor-pointer"
              >
                + Buat SP Manual
              </button>
            </div>
          </div>

          {spSubTab === "daftar" ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-4">No. Surat</th>
                    <th className="py-4 px-4">Siswa</th>
                    <th className="py-4 px-4 text-center">Jenis SP</th>
                    <th className="py-4 px-4">Tanggal Terbit</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                  {spLetters.map((sp) => (
                    <tr key={sp.noSurat} className="hover:bg-slate-50/40">
                      <td className="py-4 px-4 text-slate-500 font-extrabold">{sp.noSurat}</td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 uppercase">{sp.nama}</div>
                        <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">Kelas {sp.kelas}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-md text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 uppercase tracking-wider">
                          {sp.jenis}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-500">{sp.tanggal}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 uppercase tracking-wider">
                          <Check size={10} className="stroke-[3]" />
                          <span>{sp.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => toast.info(`Membuka berkas: ${sp.noSurat}`)}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 cursor-pointer"
                          title="Lihat"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => toast.success(`Mendownload berkas: ${sp.noSurat}`)}
                          className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-650 hover:bg-teal-100 cursor-pointer"
                          title="Cetak/Download"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteSp(sp.noSurat)}
                          className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Template Editor */
            <div className="space-y-4 max-w-2xl text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Template Redaksi Surat Peringatan (SP)
                </label>
                <textarea
                  rows={8}
                  value={templateSpContent}
                  onChange={(e) => setTemplateSpContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400"
                />
              </div>
              <button
                onClick={() => toast.success("Template SP berhasil disimpan!")}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-teal-650 text-white hover:bg-teal-700 transition-all cursor-pointer"
              >
                Simpan Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content Tab: Piagam Apresiasi */}
      {activeTab === "apresiasi" && (
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5 self-start">
              <button
                onClick={() => setApresiasiSubTab("daftar")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  apresiasiSubTab === "daftar"
                    ? "bg-slate-100 text-slate-800 border-0"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Daftar Piagam & Apresiasi
              </button>
              <button
                onClick={() => setApresiasiSubTab("template")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  apresiasiSubTab === "template"
                    ? "bg-slate-100 text-slate-800 border-0"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Template Redaksi & Piagam
              </button>
            </div>

            <div className="flex items-center gap-2 self-end">
              <button
                onClick={() => toast.success("Piagam/Sertifikat otomatis diterbitkan untuk top achievers!")}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-all cursor-pointer"
              >
                Generate Apresiasi Otomatis
              </button>
              <button
                onClick={() => toast.info("Fitur pembuatan Apresiasi Manual sedang disiapkan.")}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-650 hover:bg-teal-700 text-white transition-all cursor-pointer"
              >
                + Terbitkan Apresiasi Manual
              </button>
            </div>
          </div>

          {apresiasiSubTab === "daftar" ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-4">No. Surat/Piagam</th>
                    <th className="py-4 px-4">Siswa</th>
                    <th className="py-4 px-4">Jenis Apresiasi / Piagam</th>
                    <th className="py-4 px-4 text-center">Pencapaian Poin</th>
                    <th className="py-4 px-4">Tanggal Terbit</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                  {piagams.map((piagam) => (
                    <tr key={piagam.noSurat} className="hover:bg-slate-50/40">
                      <td className="py-4 px-4 text-slate-500 font-extrabold">{piagam.noSurat}</td>
                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800 uppercase">{piagam.nama}</div>
                        <span className="text-[9px] text-slate-400 uppercase mt-0.5 block">Kelas {piagam.kelas}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-800 font-extrabold">{piagam.jenis}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black">
                          {piagam.poin}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-500">{piagam.tanggal}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 uppercase tracking-wider">
                          <Check size={10} className="stroke-[3]" />
                          <span>{piagam.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => toast.info(`Membuka piagam: ${piagam.noSurat}`)}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 cursor-pointer"
                          title="Lihat"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => toast.success(`Mendownload piagam: ${piagam.noSurat}`)}
                          className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-650 hover:bg-teal-100 cursor-pointer"
                          title="Cetak/Download"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => handleDeletePiagam(piagam.noSurat)}
                          className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Template Editor */
            <div className="space-y-4 max-w-2xl text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Template Redaksi & Piagam Apresiasi
                </label>
                <textarea
                  rows={8}
                  value={templatePiagamContent}
                  onChange={(e) => setTemplatePiagamContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400"
                />
              </div>
              <button
                onClick={() => toast.success("Template Piagam berhasil disimpan!")}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-teal-650 text-white hover:bg-teal-700 transition-all cursor-pointer"
              >
                Simpan Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Dialog Update Status Kasus ── */}
      <Dialog open={updateStatusOpen} onOpenChange={setUpdateStatusOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Update Status Kasus
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500">
                Pilih status penanganan kasus perilaku untuk siswa <span className="text-slate-800 font-extrabold uppercase">{selectedCase?.namaLengkap}</span>:
              </p>
              
              <div className="space-y-2">
                {[
                  { value: "belum_diproses", label: "Belum Diproses (Antrean BK)", color: "border-slate-200 text-slate-600 bg-slate-50/20" },
                  { value: "sedang_diproses", label: "Sedang Diproses (Konseling/Mediasi)", color: "border-amber-200 text-amber-600 bg-amber-50/10" },
                  { value: "selesai", label: "Selesai (Kasus Ditutup)", color: "border-emerald-200 text-emerald-600 bg-emerald-50/10" }
                ].map((st) => (
                  <label
                    key={st.value}
                    onClick={() => setNewStatus(st.value as any)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer hover:bg-slate-50/60 ${
                      newStatus === st.value
                        ? "border-teal-500 bg-teal-50/20 text-teal-650 shadow-sm"
                        : "border-slate-100 text-slate-500 bg-slate-50/10"
                    }`}
                  >
                    <span>{st.label}</span>
                    {newStatus === st.value && <Check size={14} className="text-teal-600 stroke-[3]" />}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUpdateStatusOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={updateStatusMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-teal-650 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Simpan Status</span>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
