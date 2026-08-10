"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  School, Sparkles, Building, Key, User, Mail, Check
} from "lucide-react"

interface DaftarSekolahDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function DaftarSekolahDialog({
  open,
  onOpenChange,
  onSuccess,
}: DaftarSekolahDialogProps) {
  const [loading, setLoading] = useState(false)

  // Register Form State
  const [namaSekolah, setNamaSekolah] = useState("")
  const [namaSingkat, setNamaSingkat] = useState("")
  const [npsn, setNpsn] = useState("")
  const [jenjang, setJenjang] = useState<"sd" | "smp" | "sma" | "smk" | "mi" | "mts" | "ma" | "tk">("sma")
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [pasteData, setPasteData] = useState("")

  const utils = api.useUtils()

  const registerMutation = api.superAdmin.registerSekolah.useMutation({
    onSuccess: async (data: any) => {
      toast.success(`Sekolah ${data.namaSekolah} berhasil didaftarkan!`)
      onOpenChange(false)
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
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mendaftarkan sekolah baru.")
    },
  })

  // Map raw jenjang text
  function mapJenjang(raw: string): "sd" | "smp" | "sma" | "smk" | "mi" | "mts" | "ma" | "tk" {
    const v = raw.trim().toLowerCase()
    if (["tk", "paud"].includes(v)) return "tk"
    if (["sd", "mi"].includes(v)) return "sd"
    if (["smp", "mts"].includes(v)) return "smp"
    if (["sma", "ma"].includes(v)) return "sma"
    if (["smk", "mak"].includes(v)) return "smk"
    return "sma"
  }

  // Parse pasted block
  const handleProcessPaste = () => {
    if (!pasteData.trim()) {
      toast.error("Kolom paste masih kosong.")
      return
    }

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

    if (!pName && !pNpsn) {
      if (lines.length === 6) {
        pName = lines[0] || ""
        pNpsn = lines[1] || ""
        pJenjang = lines[2] || "sma"
        pAlias = ""
        pAdminName = lines[3] || ""
        pAdminEmail = lines[4] || ""
        pAdminPassword = lines[5] || ""
      } else if (lines.length >= 7) {
        pName = lines[0] || ""
        pNpsn = lines[1] || ""
        pJenjang = lines[2] || "sma"
        pAlias = lines[3] || ""
        pAdminName = lines[4] || ""
        pAdminEmail = lines[5] || ""
        pAdminPassword = lines[6] || ""
      }
    }

    pName = pName.trim()
    pNpsn = pNpsn.replace(/\D/g, "").trim()
    pJenjang = pJenjang.trim()
    pAlias = pAlias.trim()
    pAdminName = pAdminName.trim()
    pAdminEmail = pAdminEmail.trim()
    pAdminPassword = pAdminPassword.trim()

    if (!pName || pName.length < 3) {
      toast.error("Validasi gagal: Nama sekolah minimal harus 3 karakter.")
      return
    }

    if (!pNpsn || pNpsn.length !== 8) {
      toast.error("Validasi gagal: NPSN harus berupa 8 digit angka.")
      return
    }

    const validJenjang = ["sd", "smp", "sma", "smk", "mi", "mts", "ma", "tk"]
    const mappedJenjang = mapJenjang(pJenjang)
    if (!validJenjang.includes(mappedJenjang)) {
      toast.error("Validasi gagal: Jenjang tidak valid. Masukkan SD, SMP, SMA, SMK, MTs, MA, atau TK.")
      return
    }

    if (!pAdminName || pAdminName.length < 2) {
      toast.error("Validasi gagal: Nama admin sekolah minimal harus 2 karakter.")
      return
    }

    if (!pAdminEmail || pAdminEmail.length < 3) {
      toast.error("Validasi gagal: Username/Email admin minimal harus 3 karakter.")
      return
    }

    if (!pAdminPassword || pAdminPassword.length < 6) {
      toast.error("Validasi gagal: Password admin minimal harus 6 karakter.")
      return
    }

    setNamaSekolah(pName)
    setNpsn(pNpsn)
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
    } catch {
      // Handled by onError
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <DialogHeader className="text-left relative z-10">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-655 flex items-center justify-center mb-4">
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
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
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
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
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
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
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
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Email / Username Admin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: admin.sekolah atau email@sekolah.sch.id"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
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
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
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
  )
}
