"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import {
  School, Search, Plus, Sparkles, Building, Key,
  Mail, User, ShieldAlert, Check, X, ShieldCheck
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function SuperAdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form State
  const [namaSekolah, setNamaSekolah] = useState("")
  const [namaSingkat, setNamaSingkat] = useState("")
  const [npsn, setNpsn] = useState("")
  const [jenjang, setJenjang] = useState<"sd" | "smp" | "sma" | "smk" | "mi" | "mts" | "ma" | "tk">("sma")
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")

  // Quick-paste state
  const [pasteData, setPasteData] = useState("")

  // Queries & Mutations
  const utils = api.useUtils()
  const { data: sekolahList = [], isLoading } = api.superAdmin.listSekolah.useQuery()

  const registerMutation = api.superAdmin.registerSekolah.useMutation({
    onSuccess: async () => {
      toast.success("Sekolah baru & Akun Admin berhasil terdaftar!")
      setModalOpen(false)
      // Reset form
      setNamaSekolah("")
      setNamaSingkat("")
      setNpsn("")
      setJenjang("sma")
      setAdminName("")
      setAdminEmail("")
      setAdminPassword("")
      setPasteData("")
      await utils.superAdmin.listSekolah.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mendaftarkan sekolah baru.")
    },
  })

  const toggleActiveMutation = api.superAdmin.toggleSekolahActive.useMutation({
    onSuccess: async (data) => {
      toast.success(`Status ${data.namaSekolah} berhasil diperbarui!`)
      await utils.superAdmin.listSekolah.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengubah status aktif sekolah.")
    },
  })

  // Filter List
  const filteredSchools = sekolahList.filter((s) => {
    const query = searchQuery.toLowerCase()
    return (
      s.namaSekolah.toLowerCase().includes(query) ||
      (s.namaSingkat && s.namaSingkat.toLowerCase().includes(query)) ||
      (s.npsn && s.npsn.includes(query))
    )
  })

  // Map raw jenjang text to one of the select's allowed values
  function mapJenjang(raw: string): "sd" | "smp" | "sma" | "smk" | "mi" | "mts" | "ma" | "tk" {
    const v = raw.trim().toLowerCase()
    if (["tk", "paud"].includes(v)) return "tk"
    if (["sd", "mi"].includes(v)) return "sd"
    if (["smp", "mts"].includes(v)) return "smp"
    if (["sma", "ma"].includes(v)) return "sma"
    if (["smk", "mak"].includes(v)) return "smk"
    return "sma"
  }

  // Parse pasted block into the existing form fields with robust validation constraints
  const handleProcessPaste = () => {
    if (!pasteData.trim()) {
      toast.error("Kolom paste masih kosong.")
      return
    }

    // Support both line breaks and key-value formats
    const lines = pasteData.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      toast.error("Format data paste tidak valid atau kosong.")
      return
    }

    let pName = ""
    let pNpsn = ""
    let pJenjang = "sma"
    let pAlias = ""
    let pAdminName = ""
    let pAdminEmail = ""
    let pAdminPassword = ""

    // Try key-value parsing first
    let isKeyValue = false
    const kvMap: Record<string, string> = {}
    
    for (const line of lines) {
      const idx = line.indexOf(":")
      if (idx !== -1) {
        const key = line.substring(0, idx).trim().toLowerCase()
        const value = line.substring(idx + 1).trim()
        if (key && value) {
          kvMap[key] = value
          isKeyValue = true
        }
      }
    }

    if (isKeyValue) {
      for (const [k, v] of Object.entries(kvMap)) {
        if (k.includes("sekolah") || (k.includes("nama") && !k.includes("admin") && !k.includes("singkat") && !k.includes("alias"))) {
          pName = v
        } else if (k.includes("npsn")) {
          pNpsn = v
        } else if (k.includes("jenjang")) {
          pJenjang = v
        } else if (k.includes("singkat") || k.includes("alias")) {
          pAlias = v
        } else if (k.includes("admin") || k.includes("pj") || k.includes("penanggung")) {
          pAdminName = v
        } else if (k.includes("email") || k.includes("username") || k.includes("user")) {
          pAdminEmail = v
        } else if (k.includes("pass") || k.includes("password") || k.includes("sandi")) {
          pAdminPassword = v
        }
      }
    }

    // Fallback or override with line-by-line if not parsed as key-value
    if (!pName && !pNpsn && lines.length >= 6) {
      pName = lines[0] || ""
      pNpsn = lines[1] || ""
      pJenjang = lines[2] || "sma"
      pAlias = lines[3] || ""
      pAdminName = lines[4] || ""
      pAdminEmail = lines[5] || ""
      pAdminPassword = lines[6] || ""
    }

    // Field-level constraints validation
    // 1. School Name (Nama Sekolah): min 3 chars
    if (!pName || pName.length < 3) {
      toast.error("Validasi gagal: Nama sekolah minimal harus 3 karakter.")
      return
    }

    // 2. NPSN: must be exactly 8 digits
    const cleanNpsn = pNpsn.replace(/\D/g, "")
    if (!cleanNpsn || cleanNpsn.length !== 8) {
      toast.error("Validasi gagal: NPSN harus berupa 8 digit angka.")
      return
    }

    // 3. Jenjang: must map to sd/smp/sma/smk/mi/mts/ma/tk
    const validJenjang = ["sd", "smp", "sma", "smk", "mi", "mts", "ma", "tk"]
    const mappedJenjang = mapJenjang(pJenjang)
    if (!validJenjang.includes(mappedJenjang)) {
      toast.error("Validasi gagal: Jenjang tidak valid. Masukkan SD, SMP, SMA, SMK, MTs, MA, atau TK.")
      return
    }

    // 4. Admin Name: min 2 chars
    if (!pAdminName || pAdminName.length < 2) {
      toast.error("Validasi gagal: Nama admin sekolah minimal harus 2 karakter.")
      return
    }

    // 5. Admin Email: min 3 chars
    if (!pAdminEmail || pAdminEmail.length < 3) {
      toast.error("Validasi gagal: Username/Email admin minimal harus 3 karakter.")
      return
    }

    // 6. Admin Password: min 6 chars
    if (!pAdminPassword || pAdminPassword.length < 6) {
      toast.error("Validasi gagal: Password admin minimal harus 6 karakter.")
      return
    }

    // Assign to fields
    setNamaSekolah(pName)
    setNpsn(cleanNpsn)
    setJenjang(mappedJenjang as any)
    setNamaSingkat(pAlias)
    setAdminName(pAdminName)
    setAdminEmail(pAdminEmail)
    setAdminPassword(pAdminPassword)

    toast.success("Berhasil memproses! Data telah dimasukkan ke masing-masing kolom form.")
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      await registerMutation.mutateAsync({
        namaSekolah,
        namaSingkat: namaSingkat || undefined,
        npsn: npsn || undefined,
        jenjang,
        adminName,
        adminEmail,
        adminPassword,
      })
    } catch (err) {
      // Handled by onError
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-teal-650 bg-teal-50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={12} />
            <span>Platform Owner Dashboard</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">
            Pendaftaran & Kelola Sekolah
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Daftarkan sekolah (tenant) baru dan kelola akun administrator masing-masing sekolah
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-500/10 cursor-pointer transition-all duration-300 transform active:scale-95"
        >
          <Plus size={16} />
          <span>Daftarkan Sekolah</span>
        </button>
      </div>

      {/* ── Stats Summary Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Sekolah</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2">
                {isLoading ? "..." : sekolahList.length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <School size={24} />
            </div>
          </div>
        </div>

        <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Sekolah Aktif</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">
                {isLoading ? "..." : sekolahList.filter((s) => s.active).length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>

        <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Suspended / Non-Aktif</p>
              <h3 className="text-3xl font-black text-rose-600 mt-2">
                {isLoading ? "..." : sekolahList.filter((s) => !s.active).length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Table & Search ── */}
      <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari sekolah berdasarkan nama, alias, atau NPSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-4 w-12 text-center">No</th>
                <th className="py-4 px-4">Nama Sekolah</th>
                <th className="py-4 px-4">Nama Singkat / Alias</th>
                <th className="py-4 px-4 text-center">NPSN</th>
                <th className="py-4 px-4 text-center">Jenjang</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-450">
                    Memuat data sekolah...
                  </td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-450">
                    Tidak ada sekolah yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100/70 hover:bg-slate-50/30 transition-colors duration-200 text-xs font-bold text-slate-600"
                  >
                    <td className="py-4 px-4 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="py-4 px-4 text-slate-800 font-black">{item.namaSekolah}</td>
                    <td className="py-4 px-4">
                      {item.namaSingkat ? (
                        <span className="text-teal-650 bg-teal-50/75 border border-teal-100/50 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase">
                          {item.namaSingkat}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-slate-700">{item.npsn || "—"}</td>
                    <td className="py-4 px-4 text-center uppercase font-black text-slate-700">{item.jenjang}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.active
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}
                      >
                        {item.active ? (
                          <>
                            <Check size={10} className="stroke-[3]" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <X size={10} className="stroke-[3]" />
                            <span>Suspended</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActiveMutation.mutate({ id: item.id })}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                          item.active
                            ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                            : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                        }`}
                      >
                        {item.active ? "Suspend" : "Unsuspend"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            <p className="text-center py-6 text-xs font-bold text-slate-450">Memuat data sekolah...</p>
          ) : filteredSchools.length === 0 ? (
            <p className="text-center py-6 text-xs font-bold text-slate-450">Tidak ada sekolah ditemukan.</p>
          ) : (
            filteredSchools.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/20 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 leading-tight">{item.namaSekolah}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                        NPSN: {item.npsn || "—"}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                        Jenjang: {item.jenjang}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      item.active
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}
                  >
                    {item.active ? "Aktif" : "Suspended"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    {item.namaSingkat ? (
                      <span className="text-teal-650 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">
                        {item.namaSingkat}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold">Tidak ada alias</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleActiveMutation.mutate({ id: item.id })}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      item.active
                        ? "bg-rose-50 border-rose-200 text-rose-600"
                        : "bg-emerald-50 border-emerald-200 text-emerald-600"
                    }`}
                  >
                    {item.active ? "Suspend" : "Unsuspend"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Registration Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-6 relative">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <DialogHeader className="text-left relative z-10">
            <div className="w-10 h-10 rounded-xl bg-teal-550/10 text-teal-600 flex items-center justify-center mb-4">
              <School size={20} />
            </div>
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
              Daftarkan Sekolah Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Lengkapi data berikut untuk mendaftarkan institusi sekolah baru & akun admin utamanya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4 relative z-10 text-left">
            {/* Quick Paste Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-slate-400 border-b border-slate-100 pb-1.5 mb-2">
                <Sparkles size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Input Cepat (Paste Data)</span>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                  Tempel Data Sekolah
                </label>
                <textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  rows={4}
                  placeholder={"Contoh:\nSMA Negeri 1 Bandung\n10203040\nSMA\nSMAN 1 BDG\nAhmad Penanggungjawab\nahmad@sch.id\nadminpassword123"}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300 resize-none"
                />
                <button
                  type="button"
                  onClick={handleProcessPaste}
                  className="mt-2.5 w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md shadow-slate-950/5 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Proses & Isi Form</span>
                </button>
                <p className="text-[9px] text-slate-400 font-bold mt-2 leading-relaxed">
                  Urutan baris data: Nama Sekolah, NPSN (8 digit), Jenjang (SD/SMP/SMA/SMK), Alias, Nama Pj Admin, Email/Username, Password. Klik <span className="text-slate-700 dark:text-slate-300 font-black">PROSES & ISI FORM</span> untuk mendistribusikan data ke kolom form di bawah.
                </p>
              </div>
            </div>

            {/* School Info Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-slate-400 border-b border-slate-100 pb-1.5 mb-2">
                <Building size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Informasi Lembaga</span>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                  Nama Resmi Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMA Negeri 1 Jakarta"
                  value={namaSekolah}
                  onChange={(e) => setNamaSekolah(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                    Alias / Nama Singkat
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SMAN 1 JKT"
                    value={namaSingkat}
                    onChange={(e) => setNamaSingkat(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                    NPSN
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 10293847"
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                  Jenjang Sekolah <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={jenjang}
                  onChange={(e) => setJenjang(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 transition-all duration-300 cursor-pointer"
                >
                  <option value="tk">TK / PAUD</option>
                  <option value="sd">SD / MI</option>
                  <option value="smp">SMP / MTS</option>
                  <option value="sma">SMA / MA</option>
                  <option value="smk">SMK / MAK</option>
                </select>
              </div>
            </div>

            {/* Admin User Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 text-slate-400 border-b border-slate-100 pb-1.5 mb-2">
                <Key size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Akun Administrator</span>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                  Nama Lengkap Admin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Nama Admin Utama Sekolah"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                  Email / Username Admin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="email@sekolah.sch.id"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
                  Password Admin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Daftarkan</span>
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
