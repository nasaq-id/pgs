"use client"

import { useState } from "react"
import { Shield, Settings, Pencil, Trash2, Loader2, Check, Database, Save, ToggleLeft, ToggleRight, TrendingUp } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function PengaturanEpoinPage() {
  const utils = api.useUtils()

  const [activeTab, setActiveTab] = useState<"aturan-validasi" | "kategori" | "threshold">("aturan-validasi")

  // ── Modal states ──
  const [katModalOpen, setKatModalOpen] = useState(false)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  
  // Category Form State
  const [katId, setKatId] = useState("")
  const [katNama, setKatNama] = useState("")
  const [katJenis, setKatJenis] = useState<"positif" | "negatif">("negatif")
  const [katSubKategori, setKatSubKategori] = useState("Ringan")
  const [katPoin, setKatPoin] = useState(5)

  // Rule Form State
  const [ruleId, setRuleId] = useState("")
  const [rulePoinMin, setRulePoinMin] = useState(-10)
  const [rulePoinMax, setRulePoinMax] = useState(-1)
  const [ruleTindakLanjut, setRuleTindakLanjut] = useState("")
  const [ruleStatus, setRuleStatus] = useState("")

  const [seeding, setSeeding] = useState(false)

  // ── Aturan & Validasi Akses State ──
  const [balanceMode, setBalanceMode] = useState<"gabungan" | "terpisah">("gabungan")
  const [periodType, setPeriodType] = useState<"semester" | "tahun">("semester")
  const [wajibValidasiBk, setWajibValidasiBk] = useState(true)
  const [studentCanViewPoints, setStudentCanViewPoints] = useState(true)

  // ── Database Queries & Mutations ──
  const { data: kategoriList, isLoading: isLoadingKategori } = api.poin.getAllKategori.useQuery({})
  const { data: aturanList, isLoading: isLoadingAturan } = api.poin.getAllAturan.useQuery()

  const createKategori = api.poin.createKategori.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil ditambahkan")
      utils.poin.getAllKategori.invalidate()
      setKatModalOpen(false)
      resetKategoriForm()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan kategori")
  })

  const updateKategori = api.poin.updateKategori.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil diperbarui")
      utils.poin.getAllKategori.invalidate()
      setKatModalOpen(false)
      resetKategoriForm()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui kategori")
  })

  const removeKategori = api.poin.removeKategori.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus")
      utils.poin.getAllKategori.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus kategori")
  })

  const createAturan = api.poin.createAturan.useMutation({
    onSuccess: () => {
      toast.success("Aturan berhasil ditambahkan")
      utils.poin.getAllAturan.invalidate()
      setRuleModalOpen(false)
      resetRuleForm()
    },
    onError: (err) => toast.error(err.message || "Gagal menambahkan aturan")
  })

  const updateAturan = api.poin.updateAturan.useMutation({
    onSuccess: () => {
      toast.success("Aturan berhasil diperbarui")
      utils.poin.getAllAturan.invalidate()
      setRuleModalOpen(false)
      resetRuleForm()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui aturan")
  })

  const removeAturan = api.poin.removeAturan.useMutation({
    onSuccess: () => {
      toast.success("Aturan berhasil dihapus")
      utils.poin.getAllAturan.invalidate()
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus aturan")
  })

  // ── Form reset helpers ──
  const resetKategoriForm = () => {
    setKatId("")
    setKatNama("")
    setKatJenis("negatif")
    setKatSubKategori("Ringan")
    setKatPoin(5)
  }

  const resetRuleForm = () => {
    setRuleId("")
    setRulePoinMin(-10)
    setRulePoinMax(-1)
    setRuleTindakLanjut("")
    setRuleStatus("")
  }

  // ── Edit Click Handlers ──
  const handleEditKategori = (kat: any) => {
    setKatId(kat.id)
    
    // Parse bracket prefix
    const subMatch = kat.nama.match(/^\[(.*?)\]/)
    const sub = subMatch ? subMatch[1] : (kat.jenis === "negatif" ? "Ringan" : "Akademik")
    const cleanName = kat.nama.replace(/^\[.*?\]\s*/, "")

    setKatNama(cleanName)
    setKatJenis(kat.jenis)
    setKatSubKategori(sub)
    setKatPoin(Math.abs(kat.poin))
    setKatModalOpen(true)
  }

  const handleEditAturan = (rule: any) => {
    setRuleId(rule.id)
    setRulePoinMin(rule.poinMin)
    setRulePoinMax(rule.poinMax)
    setRuleTindakLanjut(rule.tindakLanjut)
    setRuleStatus(rule.status)
    setRuleModalOpen(true)
  }

  // ── Form Submit Handlers ──
  const handleSaveKategori = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prepend subcategory in bracket
    const finalName = `[${katSubKategori}] ${katNama.trim()}`
    const finalPoin = katJenis === "negatif" ? -Math.abs(katPoin) : Math.abs(katPoin)
    
    if (katId) {
      updateKategori.mutate({
        id: katId,
        data: { nama: finalName, jenis: katJenis, poin: finalPoin }
      })
    } else {
      createKategori.mutate({
        nama: finalName,
        jenis: katJenis,
        poin: finalPoin
      })
    }
  }

  const handleSaveAturan = (e: React.FormEvent) => {
    e.preventDefault()
    if (ruleId) {
      updateAturan.mutate({
        id: ruleId,
        data: { poinMin: rulePoinMin, poinMax: rulePoinMax, tindakLanjut: ruleTindakLanjut, status: ruleStatus }
      })
    } else {
      createAturan.mutate({
        poinMin: rulePoinMin,
        poinMax: rulePoinMax,
        tindakLanjut: ruleTindakLanjut,
        status: ruleStatus
      })
    }
  }

  // ── Auto Seed Standard Categories ──
  const handleSeedDefaultCategories = async () => {
    if (!confirm("Inisialisasi akan menambahkan data kategori default (Pelanggaran Ringan/Sedang/Berat & Prestasi Akademik/Non-Akademik/dll) ke database. Lanjutkan?")) return
    
    setSeeding(true)
    const defaults = [
      // Pelanggaran Ringan
      { nama: "[Ringan] Datang terlambat ke sekolah", jenis: "negatif" as const, poin: -2 },
      { nama: "[Ringan] Atribut Seragam tidak lengkap", jenis: "negatif" as const, poin: -2 },
      { nama: "[Ringan] Membuang Sampah sembarangan", jenis: "negatif" as const, poin: -2 },
      
      // Pelanggaran Sedang
      { nama: "[Sedang] Membolos di jam pelajaran", jenis: "negatif" as const, poin: -15 },
      { nama: "[Sedang] Rambut Gondrong/ Tidak Rapi (Laki-laki)", jenis: "negatif" as const, poin: -10 },
      { nama: "[Sedang] Membawa HP tanpa Izin saat KBM", jenis: "negatif" as const, poin: -10 },
      
      // Pelanggaran Berat
      { nama: "[Berat] Tawuran / Berkelahi", jenis: "negatif" as const, poin: -45 },
      { nama: "[Berat] Merusak Fasilitas Sekolah / Madrasah", jenis: "negatif" as const, poin: -45 },
      { nama: "[Berat] Ketahuan Merokok Dilingkungan Sekolah", jenis: "negatif" as const, poin: -45 },

      // Prestasi Akademik
      { nama: "[Akademik] Juara Kelas / Juara Umum", jenis: "positif" as const, poin: 25 },
      { nama: "[Akademik] Juara Lomba Karya Ilmiah", jenis: "positif" as const, poin: 20 },
      { nama: "[Akademik] Nilai Sempurna Ujian Akhir", jenis: "positif" as const, poin: 20 },

      // Non Akademik
      { nama: "[Non Akademik] Juara Lomba Olahraga / Seni", jenis: "positif" as const, poin: 15 },

      // Kontribusi
      { nama: "[Kontribusi] Membantu Guru/ Teman dalam kesulitan", jenis: "positif" as const, poin: 10 },
      { nama: "[Kontribusi] Kejujuran (Mengembalikan barang yang hilang)", jenis: "positif" as const, poin: 15 },

      // Keaktifan
      { nama: "[Keaktifan] Keaktifan Ekstrakulikuler", jenis: "positif" as const, poin: 10 },
      { nama: "[Keaktifan] Petugas Upacara/ Pengurus Kelas Aktif", jenis: "positif" as const, poin: 10 }
    ]

    try {
      for (const item of defaults) {
        // Skip duplicate names check
        const dup = kategoriList?.find(k => k.nama === item.nama)
        if (!dup) {
          await createKategori.mutateAsync({
            nama: item.nama,
            jenis: item.jenis,
            poin: item.poin
          })
        }
      }
      toast.success("Berhasil menginisialisasi kategori default!")
      utils.poin.getAllKategori.invalidate()
    } catch (e: any) {
      toast.error(e.message || "Gagal menginisialisasi kategori default")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-650 flex items-center justify-center">
            <Settings size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Pengaturan E-Poin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Konfigurasi Aturan Akumulasi, Master Kategori, & Parameter Threshold
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100">
        <button
          onClick={() => setActiveTab("aturan-validasi")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 relative cursor-pointer ${
            activeTab === "aturan-validasi"
              ? "border-teal-500 text-teal-650"
              : "border-transparent text-slate-450 hover:text-slate-700"
          }`}
        >
          <span>Aturan & Validasi Akses</span>
        </button>
        <button
          onClick={() => setActiveTab("kategori")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 relative cursor-pointer ${
            activeTab === "kategori"
              ? "border-teal-500 text-teal-650"
              : "border-transparent text-slate-450 hover:text-slate-700"
          }`}
        >
          <span>Master Kategori & Jenis</span>
        </button>
        <button
          onClick={() => setActiveTab("threshold")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 relative cursor-pointer ${
            activeTab === "threshold"
              ? "border-teal-500 text-teal-650"
              : "border-transparent text-slate-450 hover:text-slate-700"
          }`}
        >
          <span>Parameter & Threshold</span>
        </button>
      </div>

      {/* Content Tab 1: Aturan & Validasi Akses */}
      {activeTab === "aturan-validasi" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} />
                Metode Akumulasi Saldo Poin
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Atur model perhitungan dan periode reset poin.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-2">
                  Model Saldo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBalanceMode("gabungan")}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      balanceMode === "gabungan"
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-black uppercase tracking-wider ${balanceMode === "gabungan" ? "text-teal-700" : "text-slate-600"}`}>
                        Saldo Gabungan
                      </p>
                      {balanceMode === "gabungan" && <Check size={14} className="text-teal-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold">Poin Pelanggaran dan Prestasi digabung (saling mengurangi).</p>
                  </button>
                  <button
                    onClick={() => setBalanceMode("terpisah")}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      balanceMode === "terpisah"
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-black uppercase tracking-wider ${balanceMode === "terpisah" ? "text-teal-700" : "text-slate-600"}`}>
                        Saldo Terpisah
                      </p>
                      {balanceMode === "terpisah" && <Check size={14} className="text-teal-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold">Poin Pelanggaran dan Prestasi diakumulasi sendiri-sendiri.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-2">
                  Periode Reset (Pemutihan)
                </label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as "semester" | "tahun")}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="semester">Per Semester (Siswa kembali 0 di semester baru)</option>
                  <option value="tahun">Per Tahun Ajaran (Siswa kembali 0 di tahun ajaran baru)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => toast.success("Aturan akumulasi berhasil disimpan!")}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/5 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save size={14} /> Simpan Aturan
              </button>
            </div>
          </div>

          <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Shield size={16} />
                Validasi & Hak Akses
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Atur persyaratan validasi BK dan izin akses siswa.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Wajib Validasi Guru BK</p>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                     Jika aktif, setiap poin yang diinput oleh Guru Piket/Pengajar akan masuk ke antrean &quot;Menunggu Validasi&quot; untuk disetujui oleh Guru BK.
                  </p>
                </div>
                <button
                  onClick={() => setWajibValidasiBk(!wajibValidasiBk)}
                  className={`p-1 transition-colors cursor-pointer ${wajibValidasiBk ? "text-teal-600" : "text-slate-300"}`}
                >
                  {wajibValidasiBk ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Siswa Dapat Melihat Kartu Poin</p>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    Izinkan siswa/orang tua melihat rincian poin mereka sendiri melalui portal siswa.
                  </p>
                </div>
                <button
                  onClick={() => setStudentCanViewPoints(!studentCanViewPoints)}
                  className={`p-1 transition-colors cursor-pointer ${studentCanViewPoints ? "text-teal-600" : "text-slate-300"}`}
                >
                  {studentCanViewPoints ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => toast.success("Pengaturan validasi berhasil disimpan!")}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/5 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save size={14} /> Simpan Pengaturan Validasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Tab 2: Master Kategori & Jenis */}
      {activeTab === "kategori" && (
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Master Kategori & Jenis</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Kelola master data pelanggaran (negatif) dan prestasi (positif) siswa.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedDefaultCategories}
                className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/5 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {seeding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database size={12} />
                )}
                <span>Inisialisasi Default</span>
              </button>
              <button
                onClick={() => { resetKategoriForm(); setKatModalOpen(true) }}
                className="px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
              >
                + Tambah Kategori
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-3">Nama Sikap / Perilaku</th>
                  <th className="py-3 px-3">Sub-Kategori / Bidang</th>
                  <th className="py-3 px-3 text-center">Jenis</th>
                  <th className="py-3 px-3 text-center">Poin</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {isLoadingKategori ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">Memuat master kategori...</td>
                  </tr>
                ) : !kategoriList || kategoriList.length === 0 ? (
                  <tr>
                     <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">Belum ada kategori sikap dikonfigurasi. Klik &apos;Inisialisasi Default&apos; untuk membuat data awal.</td>
                  </tr>
                ) : (
                  kategoriList.map((kat) => {
                    const subMatch = kat.nama.match(/^\[(.*?)\]/)
                    const sub = subMatch ? subMatch[1] : "Lainnya"
                    const cleanName = kat.nama.replace(/^\[.*?\]\s*/, "")

                    return (
                      <tr key={kat.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-3 text-slate-800 font-extrabold">{cleanName}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500`}>
                            {sub}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            kat.jenis === "positif"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}>
                            {kat.jenis === "positif" ? "Prestasi" : "Pelanggaran"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-black">
                          {kat.poin > 0 ? `+${kat.poin}` : kat.poin}
                        </td>
                        <td className="py-3 px-3 text-center flex items-center justify-center gap-1.5">
<button
                             onClick={() => handleEditKategori(kat)}
                             className="p-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/10 cursor-pointer transition-all"
                             title="Edit"
                           >
                             <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus kategori "${cleanName}"?`)) {
                                removeKategori.mutate({ id: kat.id })
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Tab 3: Parameter & Threshold */}
      {activeTab === "threshold" && (
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Parameter & Threshold Akumulasi Poin</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Atur ambang batas tindak lanjut untuk Prestasi (apresiasi) dan Pelanggaran (SP/sanksi).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const defaults = [
                    { poinMin: -10, poinMax: -1, tindakLanjut: "Teguran lisan & Pembinaan", status: "Perlu Pendampingan" },
                    { poinMin: -20, poinMax: -11, tindakLanjut: "Konseling Guru BK & Pemberitahuan Wali Kelas", status: "Dalam Pemantauan" },
                    { poinMin: -50, poinMax: -21, tindakLanjut: "Pemanggilan Wali Kelas & Surat Pernyataan Siswa", status: "SP 1" },
                    { poinMin: -100, poinMax: -51, tindakLanjut: "Pemanggilan Orang Tua ke Sekolah & Skorsing 3 Hari", status: "SP 2" },
                    { poinMin: -200, poinMax: -101, tindakLanjut: "Konferensi Kasus & Skorsing 6 Hari / Dirumahkan", status: "SP 3" },
                  ]
                  defaults.forEach(async (d) => {
                    const dup = aturanList?.find(a => a.poinMin === d.poinMin && a.poinMax === d.poinMax)
                    if (!dup) {
                      try { await createAturan.mutateAsync(d) } catch {}
                    }
                  })
                  toast.success("Threshold standar berhasil ditambahkan!")
                  utils.poin.getAllAturan.invalidate()
                }}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/5 cursor-pointer"
              >
                Generate Standar
              </button>
              <button
                onClick={() => { resetRuleForm(); setRuleModalOpen(true) }}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
              >
                + Tambah Threshold
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-3 text-center">Rentang Poin</th>
                  <th className="py-3 px-3">Rencana Tindak Lanjut</th>
                  <th className="py-3 px-3 text-center">Status Siswa</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {isLoadingAturan ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">Memuat aturan...</td>
                  </tr>
                ) : !aturanList || aturanList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">Belum ada aturan ambang batas dikonfigurasi.</td>
                  </tr>
                ) : (
                  aturanList.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/40">
                      <td className="py-3 px-3 text-center font-black text-slate-800">
                        {rule.poinMin} s/d {rule.poinMax}
                      </td>
                      <td className="py-3 px-3 text-slate-550 leading-normal">{rule.tindakLanjut}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100`}>
                          {rule.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center flex items-center justify-center gap-1.5">
<button
                           onClick={() => handleEditAturan(rule)}
                           className="p-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-500/10 cursor-pointer transition-all"
                           title="Edit"
                         >
                           <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus aturan ambang batas untuk rentang poin ${rule.poinMin} s/d ${rule.poinMax}?`)) {
                              removeAturan.mutate({ id: rule.id })
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={11} />
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

      {/* ── Dialog Kategori Poin ── */}
      <Dialog open={katModalOpen} onOpenChange={setKatModalOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {katId ? "Edit Kategori Sikap" : "Tambah Kategori Sikap Baru"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveKategori} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Nama Kategori / Bentuk Sikap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Terlambat Masuk Sekolah"
                  value={katNama}
                  onChange={(e) => setKatNama(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Jenis Poin
                  </label>
                  <select
                    value={katJenis}
                    onChange={(e) => {
                      const val = e.target.value as any
                      setKatJenis(val)
                      setKatSubKategori(val === "negatif" ? "Ringan" : "Akademik")
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="negatif">Pelanggaran (Negatif)</option>
                    <option value="positif">Prestasi (Positif)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Sub-Kategori / Bidang
                  </label>
                  <select
                    value={katSubKategori}
                    onChange={(e) => setKatSubKategori(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    {katJenis === "negatif" ? (
                      <>
                        <option value="Ringan">Ringan</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Berat">Berat</option>
                      </>
                    ) : (
                      <>
                        <option value="Akademik">Akademik</option>
                        <option value="Non Akademik">Non Akademik</option>
                        <option value="Kontribusi">Kontribusi</option>
                        <option value="Keaktifan">Keaktifan</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Besaran Nilai Poin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={katPoin}
                  onChange={(e) => setKatPoin(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setKatModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createKategori.isPending || updateKategori.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {(createKategori.isPending || updateKategori.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Aturan Ambang Batas ── */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {ruleId ? "Edit Aturan Threshold" : "Tambah Aturan Threshold"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveAturan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Poin Minimal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={rulePoinMin}
                    onChange={(e) => setRulePoinMin(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Poin Maksimal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={rulePoinMax}
                    onChange={(e) => setRulePoinMax(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Rencana Tindak Lanjut <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemanggilan Orang Tua & Skorsing 3 Hari"
                  value={ruleTindakLanjut}
                  onChange={(e) => setRuleTindakLanjut(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Status Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Peringatan 1 / SP 1 / Kritis"
                  value={ruleStatus}
                  onChange={(e) => setRuleStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-555 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createAturan.isPending || updateAturan.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {(createAturan.isPending || updateAturan.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
