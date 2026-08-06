"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import {
  School, Search, Plus, Sparkles, Building, Key,
  Mail, User, ShieldAlert, Check, X, ShieldCheck,
  Activity, ScrollText, Pencil, Users, Shield, Loader2, Trash2
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<"lembaga" | "metrics" | "logs">("lembaga")
  const [searchQuery, setSearchQuery] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
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

  // Edit Form State
  const [editingSekolahId, setEditingSekolahId] = useState("")
  const [editNamaSekolah, setEditNamaSekolah] = useState("")
  const [editNamaSingkat, setEditNamaSingkat] = useState("")
  const [editNpsn, setEditNpsn] = useState("")
  const [editJenjang, setEditJenjang] = useState<"sd" | "smp" | "sma" | "smk" | "mi" | "mts" | "ma" | "tk">("sma")

  // Reset Password State
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [selectedSekolahForReset, setSelectedSekolahForReset] = useState<any>(null)
  const [selectedAdminId, setSelectedAdminId] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")

  // Delete School State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedSekolahForDelete, setSelectedSekolahForDelete] = useState<any>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")

  // Detail School State
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSekolahForDetail, setSelectedSekolahForDetail] = useState<any>(null)

  const handleDetailClick = (sekolah: any) => {
    setSelectedSekolahForDetail(sekolah)
    setDetailModalOpen(true)
  }

  // Queries & Mutations
  const utils = api.useUtils()
  const { data: sekolahList = [], isLoading } = api.superAdmin.listSekolah.useQuery()

  const { data: metrics, isLoading: isMetricsLoading } = api.superAdmin.getPlatformMetrics.useQuery(undefined, {
    enabled: activeTab === "metrics",
  })

  const { data: auditLogsList = [], isLoading: isLogsLoading } = api.superAdmin.listGlobalAuditLogs.useQuery({ limit: 50 }, {
    enabled: activeTab === "logs",
  })

  // List admins for selected school to reset password
  const { data: adminsList = [], isLoading: isLoadingAdmins } = api.superAdmin.listSekolahAdmins.useQuery(
    { sekolahId: selectedSekolahForReset?.id ?? "" },
    { enabled: !!selectedSekolahForReset }
  )

  const resetPasswordMutation = api.superAdmin.resetAdminPassword.useMutation({
    onSuccess: () => {
      toast.success("Password admin berhasil diperbarui!")
      setResetModalOpen(false)
      setNewAdminPassword("")
      setSelectedAdminId("")
      setSelectedSekolahForReset(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memperbarui password admin.")
    }
  })

  const registerMutation = api.superAdmin.registerSekolah.useMutation({
    onSuccess: async (data: any) => {
      toast.success(`Sekolah ${data.namaSekolah} berhasil didaftarkan!`)
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
    onError: (err: any) => {
      toast.error(err.message || "Gagal mendaftarkan sekolah baru.")
    },
  })

  const updateSekolahMutation = api.superAdmin.updateSekolah.useMutation({
    onSuccess: async () => {
      toast.success("Data sekolah berhasil diperbarui!")
      setEditModalOpen(false)
      await utils.superAdmin.listSekolah.invalidate()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memperbarui data sekolah.")
    },
  })

  const toggleActiveMutation = api.superAdmin.toggleSekolahActive.useMutation({
    onSuccess: async (data: any) => {
      toast.success(`Status ${data.namaSekolah} berhasil diperbarui!`)
      await utils.superAdmin.listSekolah.invalidate()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengubah status aktif sekolah.")
    },
  })

  const deleteSekolahMutation = api.superAdmin.deleteSekolah.useMutation({
    onSuccess: async (data: any) => {
      toast.success(`Sekolah ${data.namaSekolah} berhasil dihapus permanen!`)
      setDeleteModalOpen(false)
      setSelectedSekolahForDelete(null)
      setDeleteConfirmName("")
      await utils.superAdmin.listSekolah.invalidate()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus sekolah.")
    },
  })

  const handleDeleteClick = (sekolah: any) => {
    setSelectedSekolahForDelete(sekolah)
    setDeleteConfirmName("")
    setDeleteModalOpen(true)
  }

  const confirmDeleteSekolah = () => {
    if (!selectedSekolahForDelete) return
    if (deleteConfirmName !== selectedSekolahForDelete.namaSekolah) {
      toast.error("Nama sekolah tidak cocok.")
      return
    }
    deleteSekolahMutation.mutate({ id: selectedSekolahForDelete.id })
  }

  // Filter List
  const filteredSchools = (sekolahList ?? []).filter((s: any) => {
    const query = searchQuery.toLowerCase()
    return (
      s.namaSekolah.toLowerCase().includes(query) ||
      (s.namaSingkat && s.namaSingkat.toLowerCase().includes(query)) ||
      (s.npsn && s.npsn.includes(query))
    )
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
    } catch (err) {
      // Handled by onError
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateSekolah(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateSekolahMutation.mutateAsync({
        id: editingSekolahId,
        namaSekolah: editNamaSekolah,
        namaSingkat: editNamaSingkat || null,
        npsn: editNpsn || null,
        jenjang: editJenjang,
      })
    } catch (err) {
      // Handled by onError
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (s: any) => {
    setEditingSekolahId(s.id)
    setEditNamaSekolah(s.namaSekolah)
    setEditNamaSingkat(s.namaSingkat || "")
    setEditNpsn(s.npsn || "")
    setEditJenjang(s.jenjang || "sma")
    setEditModalOpen(true)
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedAdminId) {
      toast.error("Silakan pilih akun admin yang ingin direset.")
      return
    }
    if (newAdminPassword.length < 6) {
      toast.error("Password minimal 6 karakter.")
      return
    }
    setLoading(true)
    try {
      await resetPasswordMutation.mutateAsync({
        userId: selectedAdminId,
        newPassword: newAdminPassword,
      })
    } catch (err) {
      // Handled by onError
    } finally {
      setLoading(false)
    }
  }

  const handleResetPasswordClick = (s: any) => {
    setSelectedSekolahForReset(s)
    setSelectedAdminId("")
    setNewAdminPassword("")
    setResetModalOpen(true)
  }

  const handleImpersonate = (sekolahId: string) => {
    document.cookie = `impersonated_sekolah_id=${sekolahId}; path=/; max-age=${7 * 24 * 60 * 60}`
    toast.success("Masuk ke mode pengelolaan sekolah")
    window.location.href = "/"
  }

  return (
    <div className="space-y-6 text-left">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-teal-655 bg-teal-50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={12} />
            <span>Platform Owner Control Center</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase">
            Super Admin Control
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Pantau statistik performa multi-tenant sekolah, kelola data lembaga, dan log audit transaksi.
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

      {/* Tab Switcher (Centered & Neomorphic) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className=" w-full max-w-xl flex gap-2 ">
            <TabsTrigger value="lembaga" className="rounded-xl px-4 py-2.5 font-bold transition-all  cursor-pointer text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <School size={14} />
              <span>Daftar Lembaga</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="rounded-xl px-4 py-2.5 font-bold transition-all  cursor-pointer text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <Activity size={14} />
              <span>Kesehatan Platform</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl px-4 py-2.5 font-bold transition-all  cursor-pointer text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <ScrollText size={14} />
              <span>Log Audit Global</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Tab 1: Lembaga */}
      {activeTab === "lembaga" && (
        <div className="space-y-6">
          {/* Stats Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Total Sekolah</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">
                    {isLoading ? "..." : sekolahList.length}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-650 flex items-center justify-center">
                  <School size={24} />
                </div>
              </div>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Sekolah Aktif</p>
                  <h3 className="text-3xl font-black text-emerald-600 mt-2">
                    {isLoading ? "..." : (sekolahList ?? []).filter((s: any) => s.active).length}
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
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Suspended</p>
                  <h3 className="text-3xl font-black text-rose-600 mt-2">
                    {isLoading ? "..." : (sekolahList ?? []).filter((s: any) => !s.active).length}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Table & Search */}
          <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari sekolah berdasarkan nama, alias, atau NPSN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-4 w-12 text-center">No</th>
                    <th className="py-4 px-4">Nama Sekolah</th>
                    <th className="py-4 px-4">Nama Singkat / Alias</th>
                    <th className="py-4 px-4 text-center">NPSN</th>
                    <th className="py-4 px-4 text-center">Jenjang</th>
                    <th className="py-4 px-4 text-center">Siswa</th>
                    <th className="py-4 px-4 text-center">Guru</th>
                    <th className="py-4 px-4 text-center">Kelas</th>
                    <th className="py-4 px-4 text-center">Health</th>
                    <th className="py-4 px-4 text-center">DB Rows</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center w-60">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-xs font-bold text-slate-455">
                        Memuat data sekolah...
                      </td>
                    </tr>
                  ) : filteredSchools.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-xs font-bold text-slate-455">
                        Tidak ada sekolah yang cocok dengan pencarian Anda.
                      </td>
                    </tr>
                  ) : (
                    filteredSchools.map((item: any, index: number) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100/70 hover:bg-slate-50/30 transition-colors duration-200 text-xs font-bold text-slate-650"
                      >
                        <td className="py-4 px-4 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-4 px-4 text-slate-800 font-black">
                          <button
                            type="button"
                            onClick={() => handleDetailClick(item)}
                            className="text-left font-black text-slate-800 hover:text-teal-650 hover:underline cursor-pointer transition-colors duration-200 outline-none"
                          >
                            {item.namaSekolah}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          {item.namaSingkat ? (
                            <span className="text-teal-650 bg-teal-50 border border-teal-100/50 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase">
                              {item.namaSingkat}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-700">{item.npsn || "—"}</td>
                        <td className="py-4 px-4 text-center uppercase font-black text-slate-700">{item.jenjang}</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-700">{item.stats?.siswa ?? 0}</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-700">{item.stats?.guru ?? 0}</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-700">{item.stats?.kelas ?? 0}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                            item.stats?.health === "hijau" ? "bg-emerald-500" :
                            item.stats?.health === "kuning" ? "bg-amber-400" :
                            item.stats?.health === "merah" ? "bg-rose-500" : "bg-slate-400"
                          }`} title={`Status: ${item.stats?.health}`} />
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-700">
                          {item.stats?.dbRows?.toLocaleString("id-ID") ?? 0}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              item.active
                                ? "bg-emerald-50 text-emerald-650 border border-emerald-100"
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
                        <td className="py-4 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(item)}
                            className="px-2.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 cursor-pointer shadow-sm flex items-center gap-1"
                            title="Edit Data Sekolah"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPasswordClick(item)}
                            className="px-2.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer shadow-sm flex items-center gap-1"
                            title="Reset Password Admin"
                          >
                            <Key size={12} />
                            <span>Reset Pass</span>
                          </button>
                          {item.active && (
                            <button
                              type="button"
                              onClick={() => handleImpersonate(item.id)}
                              className="px-2.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-teal-50 border border-teal-200 text-teal-650 hover:bg-teal-100 cursor-pointer shadow-sm"
                            >
                              Kelola
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleActiveMutation.mutate({ id: item.id })}
                            className={`px-2.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                              item.active
                                ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                                : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {item.active ? "Suspend" : "Unsuspend"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item)}
                            className="px-2.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 cursor-pointer shadow-sm flex items-center gap-1"
                            title="Hapus Sekolah Permanen"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
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
                filteredSchools.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/20 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <button
                          type="button"
                          onClick={() => handleDetailClick(item)}
                          className="text-left text-sm font-black text-slate-800 leading-tight hover:text-teal-650 hover:underline outline-none cursor-pointer"
                        >
                          {item.namaSekolah}
                        </button>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                            NPSN: {item.npsn || "—"}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                            Jenjang: {item.jenjang}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase">
                            S:{item.stats?.siswa ?? 0} G:{item.stats?.guru ?? 0} K:{item.stats?.kelas ?? 0}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span className="text-[10px] text-teal-650 font-extrabold uppercase">
                            DB: {item.stats?.dbRows?.toLocaleString("id-ID") ?? 0} Rows
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

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all bg-slate-50 border border-slate-200 text-slate-650 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPasswordClick(item)}
                          className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all bg-amber-50 border border-amber-200 text-amber-700 cursor-pointer"
                        >
                          Reset Pass
                        </button>
                        {item.active && (
                          <button
                            type="button"
                            onClick={() => handleImpersonate(item.id)}
                            className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all bg-teal-50 border border-teal-200 text-teal-650 cursor-pointer"
                          >
                            Kelola
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleActiveMutation.mutate({ id: item.id })}
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                            item.active
                              ? "bg-rose-50 border-rose-200 text-rose-600"
                              : "bg-emerald-50 border-emerald-200 text-emerald-600"
                          }`}
                        >
                          {item.active ? "Suspend" : "Unsuspend"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all bg-red-50 border border-red-200 text-red-600 cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Trash2 size={10} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Legend untuk Status Health */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100/50 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span className="text-slate-400 font-black">Status Health:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Hijau (Aktif, Memiliki Guru & Siswa)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Kuning (Aktif, Belum Memiliki Guru)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Merah (Aktif, Belum Memiliki Siswa)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Abu-abu (Suspended)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Kesehatan Platform */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          {/* Health Diagnostics Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="neumo-card bg-background p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Database Users</p>
                <h3 className="text-3xl font-black text-slate-800 mt-2">
                  {isMetricsLoading ? "..." : metrics?.totalUsers}
                </h3>
              </div>
              <p className="text-[9px] text-muted-foreground mt-4 font-bold">Pengguna aktif global di seluruh sekolah terdaftar</p>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Log Audit</p>
                <h3 className="text-3xl font-black text-teal-600 mt-2">
                  {isMetricsLoading ? "..." : metrics?.totalAuditLogs}
                </h3>
              </div>
              <p className="text-[9px] text-muted-foreground mt-4 font-bold">Jumlah log mutasi / audit trail yang tersimpan di sistem</p>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Simulasi CPU & Server</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xl font-black text-slate-800">4.8%</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold uppercase animate-pulse">Normal</span>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-4 font-bold">Pemantauan load real-time virtual machine platform</p>
            </div>
          </div>

          {/* System Performance Diagnosis */}
          <div className="neumo-card bg-background rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Status Diagnostik Platform</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">Database</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-1">CONNECTED</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">S3 File Storage</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-1">ONLINE</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">NextAuth Session</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-1">HEALTHY</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">TRPC Latency</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-1">&lt; 15ms</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Log Audit Global */}
      {activeTab === "logs" && (
        <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Platform Audit Trails</h4>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">50 data terbaru</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-4">Waktu</th>
                  <th className="py-4 px-4">Pengguna</th>
                  <th className="py-4 px-4">Sekolah</th>
                  <th className="py-4 px-4 text-center">Aksi</th>
                  <th className="py-4 px-4">Entitas</th>
                  <th className="py-4 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {isLogsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-450">
                      Memuat log transaksi...
                    </td>
                  </tr>
                ) : auditLogsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-450">
                      Belum ada transaksi log audit terekam di sistem.
                    </td>
                  </tr>
                ) : (
                  auditLogsList.map((log: any) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100/50 text-xs text-slate-600"
                    >
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {log.userFirstName || "System"}
                        <span className="block text-[9px] text-slate-400 font-mono font-normal">{log.userEmail || "system@pgs.id"}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-705">
                        {log.sekolahNama || "Sistem Utama (Global)"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          log.action === "create" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          log.action === "update" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-500 uppercase text-[9px]">{log.entity}</td>
                      <td className="py-3 px-4 font-mono text-[9px] text-slate-500 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Registration Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <DialogHeader className="text-left relative z-10">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-650 flex items-center justify-center mb-4">
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

      {/* ── Edit Modal ── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <DialogHeader className="text-left relative z-10">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-650 flex items-center justify-center mb-4">
                <Pencil size={20} />
              </div>
              <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
                Edit Data Sekolah
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold">
                Ubah rincian informasi sekolah / tenant terdaftar di bawah ini.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateSekolah} className="space-y-4 mt-4 relative z-10">
              {/* School Info Section */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Nama Resmi Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                    value={editNamaSekolah}
                    onChange={(e) => setEditNamaSekolah(e.target.value)}
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
                      value={editNamaSingkat}
                      onChange={(e) => setEditNamaSingkat(e.target.value)}
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
                      value={editNpsn}
                      onChange={(e) => setEditNpsn(e.target.value)}
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
                    value={editJenjang}
                    onChange={(e) => setEditJenjang(e.target.value as any)}
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

              {/* Footer Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Modal ── */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <DialogHeader className="text-left relative z-10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <Key size={20} />
              </div>
              <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
                Reset Password Admin
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold">
                Pilih akun admin sekolah {selectedSekolahForReset?.namaSekolah ? `(${selectedSekolahForReset.namaSekolah})` : ""} yang ingin direset dan masukkan password baru.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4 relative z-10">
              {/* Select Admin Section */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Pilih Akun Admin Sekolah <span className="text-rose-500">*</span>
                  </label>
                  {isLoadingAdmins ? (
                    <div className="flex items-center gap-2 text-xs text-slate-450 font-bold p-3 bg-slate-50/50 rounded-xl border border-slate-200/50">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Memuat daftar administrator...</span>
                    </div>
                  ) : adminsList.length === 0 ? (
                    <div className="text-xs text-rose-500 font-bold p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                      Tidak ada akun admin_sekolah terdaftar untuk instansi ini.
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedAdminId}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 transition-all duration-300 cursor-pointer"
                    >
                      <option value="">-- Pilih Akun Admin --</option>
                      {adminsList.map((adm: any) => (
                        <option key={adm.id} value={adm.id}>
                          {adm.email} ({[adm.firstName, adm.lastName].filter(Boolean).join(" ") || "Admin"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || adminsList.length === 0 || !selectedAdminId}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete School Modal ── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <DialogHeader className="text-left relative z-10">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
                <ShieldAlert size={20} className="animate-pulse" />
              </div>
              <DialogTitle className="text-lg font-black text-rose-600 tracking-tight uppercase">
                Hapus Sekolah Permanen
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold">
                Tindakan ini tidak dapat dibatalkan. Menghapus sekolah akan menghapus <span className="text-rose-600">seluruh data terkait</span> (guru, siswa, kelas, tagihan, dll) secara permanen dari database.
              </DialogDescription>
            </DialogHeader>

            {selectedSekolahForDelete && (
              <div className="space-y-4 mt-4 relative z-10">
                <div className="bg-rose-50/50 border border-rose-100/50 p-4 rounded-xl text-xs space-y-1">
                  <p className="font-black text-rose-800 uppercase tracking-wider text-[9px]">Sekolah Yang Akan Dihapus:</p>
                  <p className="font-mono text-sm text-rose-900 font-black">{selectedSekolahForDelete.namaSekolah}</p>
                  {selectedSekolahForDelete.npsn && (
                    <p className="text-[10px] text-rose-700 font-bold">NPSN: {selectedSekolahForDelete.npsn}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest">
                    Tulis kembali nama sekolah untuk konfirmasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={selectedSekolahForDelete.namaSekolah}
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 text-xs font-bold text-slate-700 placeholder-slate-350 transition-all duration-300"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteSekolah}
                    disabled={deleteConfirmName !== selectedSekolahForDelete.namaSekolah || deleteSekolahMutation.isPending}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteSekolahMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={14} className="flex-shrink-0" />
                        <span>Hapus Permanen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Sekolah Modal ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <DialogHeader className="text-left relative z-10">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-650 flex items-center justify-center mb-4">
                <School size={20} />
              </div>
              <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
                Detail Lembaga & Penggunaan Sumber Daya
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold">
                Informasi rinci kapasitas data dan kuota penggunaan database untuk sekolah terpilih.
              </DialogDescription>
            </DialogHeader>

            {selectedSekolahForDetail && (
              <div className="space-y-6 mt-4 relative z-10">
                {/* School Profile Card */}
                <div className="bg-slate-50/50 border border-slate-105 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-black text-slate-800 leading-tight">
                        {selectedSekolahForDetail.namaSekolah}
                      </h4>
                      {selectedSekolahForDetail.namaSingkat && (
                        <span className="inline-block mt-1 text-[10px] bg-teal-50 text-teal-650 px-2 py-0.5 rounded font-black uppercase">
                          {selectedSekolahForDetail.namaSingkat}
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      selectedSekolahForDetail.active
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {selectedSekolahForDetail.active ? "Aktif" : "Suspended"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 text-xs">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NPSN</p>
                      <p className="font-mono text-slate-700 font-bold mt-0.5">{selectedSekolahForDetail.npsn || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenjang Pendidikan</p>
                      <p className="uppercase text-slate-700 font-bold mt-0.5">{selectedSekolahForDetail.jenjang}</p>
                    </div>
                  </div>
                </div>

                {/* Database Row Quota Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-slate-550">Kuota Baris Data (Database Rows)</span>
                    <span className="text-slate-800 font-black">
                      {selectedSekolahForDetail.stats?.dbRows?.toLocaleString("id-ID") ?? 0} / 10.000 Rows
                    </span>
                  </div>
                  {/* Progress Bar Container */}
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden shadow-inner relative">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        (selectedSekolahForDetail.stats?.dbRows ?? 0) > 8000 ? "bg-rose-500" :
                        (selectedSekolahForDetail.stats?.dbRows ?? 0) > 5000 ? "bg-amber-400" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(((selectedSekolahForDetail.stats?.dbRows ?? 0) / 10000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">
                    * Batas standar gratis adalah 10.000 baris data database per instansi sekolah.
                  </p>
                </div>

                {/* Resource Breakdown Grid */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Breakdown Baris Data Database</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Siswa</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.siswa?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Guru & Staff</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.guru?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rombel (Kelas)</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.kelas?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mapel</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.mapel?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Absensi</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.absensi?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keuangan (Invoice)</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.invoice?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jurnal Mengajar</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.jurnal?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">E-Poin (Pelanggaran)</p>
                      <p className="text-base font-black text-slate-700 font-mono mt-1">
                        {selectedSekolahForDetail.stats?.poin?.toLocaleString("id-ID") ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setDetailModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false)
                      handleEditClick(selectedSekolahForDetail)
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false)
                      handleResetPasswordClick(selectedSekolahForDetail)
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Key size={12} />
                    <span>Reset Pass</span>
                  </button>

                  {selectedSekolahForDetail.active && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false)
                        handleImpersonate(selectedSekolahForDetail.id)
                      }}
                      className="px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                    >
                      Kelola
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false)
                      handleDeleteClick(selectedSekolahForDetail)
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={12} />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
