"use client"

import { useState } from "react"
import { Shield, Settings, Plus, Pencil, Trash2, Loader2, Award, AlertCircle, Check } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function PengaturanEpoinPage() {
  const utils = api.useUtils()

  // ── Modal states ──
  const [katModalOpen, setKatModalOpen] = useState(false)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  
  // Category Form State
  const [katId, setKatId] = useState("")
  const [katNama, setKatNama] = useState("")
  const [katJenis, setKatJenis] = useState<"positif" | "negatif">("negatif")
  const [katPoin, setKatPoin] = useState(5)

  // Rule Form State
  const [ruleId, setRuleId] = useState("")
  const [rulePoinMin, setRulePoinMin] = useState(-10)
  const [rulePoinMax, setRulePoinMax] = useState(-1)
  const [ruleTindakLanjut, setRuleTindakLanjut] = useState("")
  const [ruleStatus, setRuleStatus] = useState("")

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
    setKatNama(kat.nama)
    setKatJenis(kat.jenis)
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
    // Negatif points must be stored as negative numbers in database
    const finalPoin = katJenis === "negatif" ? -Math.abs(katPoin) : Math.abs(katPoin)
    
    if (katId) {
      updateKategori.mutate({
        id: katId,
        data: { nama: katNama, jenis: katJenis, poin: finalPoin }
      })
    } else {
      createKategori.mutate({
        nama: katNama,
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
              Konfigurasi Master Kategori Sikap & Aturan Ambang Batas Poin
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Master Kategori Poin */}
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="text-teal-600 w-4 h-4" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Master Kategori Sikap</h4>
            </div>
            <button
              onClick={() => { resetKategoriForm(); setKatModalOpen(true) }}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-teal-650 hover:bg-teal-700 text-white cursor-pointer"
            >
              + Tambah Kategori
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-3">Nama Sikap / Perilaku</th>
                  <th className="py-3 px-3 text-center">Jenis</th>
                  <th className="py-3 px-3 text-center">Poin</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {isLoadingKategori ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">Memuat master kategori...</td>
                  </tr>
                ) : !kategoriList || kategoriList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">Belum ada kategori sikap dikonfigurasi.</td>
                  </tr>
                ) : (
                  kategoriList.map((kat) => (
                    <tr key={kat.id} className="hover:bg-slate-50/40">
                      <td className="py-3 px-3 text-slate-800 font-extrabold">{kat.nama}</td>
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
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-655 hover:bg-slate-100 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus kategori "${kat.nama}"?`)) {
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aturan Ambang Batas SP / Akumulasi */}
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-teal-650 w-4 h-4" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Aturan Ambang Batas SP</h4>
            </div>
            <button
              onClick={() => { resetRuleForm(); setRuleModalOpen(true) }}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-teal-650 hover:bg-teal-700 text-white cursor-pointer"
            >
              + Tambah Aturan
            </button>
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
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-655 hover:bg-slate-100 cursor-pointer"
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
      </div>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Jenis Poin
                  </label>
                  <select
                    value={katJenis}
                    onChange={(e) => setKatJenis(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="negatif">Pelanggaran (Negatif)</option>
                    <option value="positif">Prestasi (Positif)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Besaran Poin <span className="text-rose-500">*</span>
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
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setKatModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createKategori.isPending || updateKategori.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-teal-650 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                {ruleId ? "Edit Aturan Ambang Batas" : "Tambah Aturan Ambang Batas"}
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createAturan.isPending || updateAturan.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-teal-650 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
