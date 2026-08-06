"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import {
  School, Search, Plus, Sparkles, Building, Key,
  ShieldCheck, ShieldAlert, Check, X,
  Activity, ScrollText, Pencil, Users, Trash2, MoreVertical
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import jsPDF from "jspdf"
import { autoTable } from "jspdf-autotable"

// Sub-components
import DaftarSekolahDialog from "./_components/DaftarSekolahDialog"
import EditSekolahDialog from "./_components/EditSekolahDialog"
import ResetPasswordDialog from "./_components/ResetPasswordDialog"
import DeleteSekolahDialog from "./_components/DeleteSekolahDialog"
import DetailSekolahDialog from "./_components/DetailSekolahDialog"

export default function SuperAdminPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Dialog visibility states
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Selected school states
  const [selectedSekolahForEdit, setSelectedSekolahForEdit] = useState<any>(null)
  const [selectedSekolahForReset, setSelectedSekolahForReset] = useState<any>(null)
  const [selectedSekolahForDelete, setSelectedSekolahForDelete] = useState<any>(null)
  const [selectedSekolahForDetail, setSelectedSekolahForDetail] = useState<any>(null)

  // Queries & Mutations
  const utils = api.useUtils()
  const { data: sekolahList = [], isLoading } = api.superAdmin.listSekolah.useQuery()

  const toggleActiveMutation = api.superAdmin.toggleSekolahActive.useMutation({
    onSuccess: async (data: any) => {
      toast.success(`Status ${data.namaSekolah} berhasil diperbarui!`)
      await utils.superAdmin.listSekolah.invalidate()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengubah status aktif sekolah.")
    },
  })

  // Action Click Handlers
  const handleDetailClick = (sekolah: any) => {
    setSelectedSekolahForDetail(sekolah)
    setDetailModalOpen(true)
  }

  const handleEditClick = (sekolah: any) => {
    setSelectedSekolahForEdit(sekolah)
    setEditModalOpen(true)
  }

  const handleResetPasswordClick = (sekolah: any) => {
    setSelectedSekolahForReset(sekolah)
    setResetModalOpen(true)
  }

  const handleDeleteClick = (sekolah: any) => {
    setSelectedSekolahForDelete(sekolah)
    setDeleteModalOpen(true)
  }

  const handleImpersonate = (sekolahId: string) => {
    document.cookie = `impersonated_sekolah_id=${sekolahId}; path=/; max-age=${7 * 24 * 60 * 60}`
    toast.success("Masuk ke mode pengelolaan sekolah")
    window.location.href = "/"
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

  const totalSiswa = (sekolahList ?? []).reduce((acc: number, curr: any) => acc + (curr.stats?.siswa ?? 0), 0)
  const totalGuru = (sekolahList ?? []).reduce((acc: number, curr: any) => acc + (curr.stats?.guru ?? 0), 0)

  const exportToPDF = () => {
    if (filteredSchools.length === 0) {
      toast.error("Tidak ada data sekolah untuk diexport.")
      return
    }

    const head = [[
      "No", "Nama Sekolah", "Alias", "NPSN", "Jenjang", 
      "Siswa", "Guru", "Kelas", "Mapel", "Absensi", 
      "Invoice", "Jurnal", "E-Poin", "DB Rows", "Status"
    ]]

    const rows = filteredSchools.map((item: any, index: number) => [
      index + 1,
      item.namaSekolah,
      item.namaSingkat || "-",
      item.npsn || "-",
      item.jenjang.toUpperCase(),
      item.stats?.siswa ?? 0,
      item.stats?.guru ?? 0,
      item.stats?.kelas ?? 0,
      item.stats?.mapel ?? 0,
      item.stats?.absensi ?? 0,
      item.stats?.invoice ?? 0,
      item.stats?.jurnal ?? 0,
      item.stats?.poin ?? 0,
      item.stats?.dbRows ?? 0,
      item.active ? "Aktif" : "Suspended"
    ])

    const doc = new jsPDF("landscape", "mm", "a4")
    const pageW = doc.internal.pageSize.getWidth()

    // Title
    doc.setTextColor(30, 41, 59) // slate-800
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("LAPORAN DATA LEMBAGA (SUPER ADMIN)", pageW / 2, 16, { align: "center" })

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    const now = new Date()
    const formattedDate = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
    doc.text(`Dicetak pada: ${formattedDate}`, pageW - 14, 24, { align: "right" })
    doc.text(`Total Sekolah: ${filteredSchools.length} | Gabungan Siswa: ${totalSiswa} | Gabungan Guru: ${totalGuru}`, 14, 24)

    autoTable(doc, {
      startY: 28,
      head,
      body: rows,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        textColor: [50, 50, 50],
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 118, 110], // Teal-700
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 42 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 14, halign: "center" },
        5: { cellWidth: 12, halign: "center" },
        6: { cellWidth: 12, halign: "center" },
        7: { cellWidth: 12, halign: "center" },
        8: { cellWidth: 12, halign: "center" },
        9: { cellWidth: 14, halign: "center" },
        10: { cellWidth: 14, halign: "center" },
        11: { cellWidth: 14, halign: "center" },
        12: { cellWidth: 14, halign: "center" },
        13: { cellWidth: 18, halign: "center" },
        14: { cellWidth: 18, halign: "center" }
      }
    })

    doc.save(`Laporan_Lembaga_SuperAdmin_${now.getTime()}.pdf`)
    toast.success("PDF berhasil diexport!")
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
            Daftar Lembaga Sekolah
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Pantau statistik performa multi-tenant sekolah, kelola data lembaga, dan atur batasan data database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportToPDF}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all duration-300 transform active:scale-95"
          >
            <ScrollText size={16} className="text-slate-500" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-500/10 cursor-pointer transition-all duration-300 transform active:scale-95"
          >
            <Plus size={16} />
            <span>Daftarkan Sekolah</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

          <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Total Siswa & Guru</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-2xl font-black text-indigo-655 leading-none">
                      {isLoading ? "..." : totalSiswa.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">Siswa</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div>
                    <p className="text-2xl font-black text-purple-650 leading-none">
                      {isLoading ? "..." : totalGuru.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">Guru & Staff</p>
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-55/60 text-indigo-650 flex items-center justify-center">
                <Users size={24} />
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
                  <th className="py-4 px-3 w-12 text-center">No</th>
                  <th className="py-4 px-3">Nama Sekolah</th>
                  <th className="py-4 px-3">Alias</th>
                  <th className="py-4 px-3 text-center">NPSN</th>
                  <th className="py-4 px-3 text-center">Jenjang</th>
                  <th className="py-4 px-3 text-center">Siswa</th>
                  <th className="py-4 px-3 text-center">Guru</th>
                  <th className="py-4 px-3 text-center">Kelas</th>
                  <th className="py-4 px-3 text-center">Mapel</th>
                  <th className="py-4 px-3 text-center">Absensi</th>
                  <th className="py-4 px-3 text-center">Keuangan</th>
                  <th className="py-4 px-3 text-center">Jurnal</th>
                  <th className="py-4 px-3 text-center">E-Poin</th>
                  <th className="py-4 px-3 text-center">Health</th>
                  <th className="py-4 px-3 text-center">DB Rows</th>
                  <th className="py-4 px-3 text-center">Status</th>
                  <th className="py-4 px-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-xs font-bold text-slate-455">
                      Memuat data sekolah...
                    </td>
                  </tr>
                ) : filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-xs font-bold text-slate-455">
                      Tidak ada sekolah yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((item: any, index: number) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100/70 hover:bg-slate-50/30 transition-colors duration-200 text-xs font-bold text-slate-650"
                    >
                      <td className="py-4 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-4 px-3 text-slate-800 font-black">
                        <button
                          type="button"
                          onClick={() => handleDetailClick(item)}
                          className="text-left font-black text-slate-800 hover:text-teal-650 hover:underline cursor-pointer transition-colors duration-200 outline-none"
                        >
                          {item.namaSekolah}
                        </button>
                      </td>
                      <td className="py-4 px-3">
                        {item.namaSingkat ? (
                          <span className="text-teal-650 bg-teal-50 border border-teal-100/50 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">
                            {item.namaSingkat}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.npsn || "—"}</td>
                      <td className="py-4 px-3 text-center uppercase font-black text-slate-700">{item.jenjang}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.siswa ?? 0}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.guru ?? 0}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.kelas ?? 0}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.mapel ?? 0}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.absensi ?? 0}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.invoice ?? 0}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.jurnal ?? 0}</td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">{item.stats?.poin ?? 0}</td>
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          item.stats?.health === "hijau" ? "bg-emerald-500" :
                          item.stats?.health === "kuning" ? "bg-amber-400" :
                          item.stats?.health === "merah" ? "bg-rose-500" : "bg-slate-400"
                        }`} title={`Status: ${item.stats?.health}`} />
                      </td>
                      <td className="py-4 px-3 text-center font-mono text-slate-700">
                        {item.stats?.dbRows?.toLocaleString("id-ID") ?? 0}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
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
                      <td className="py-4 px-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer flex items-center justify-center">
                              <MoreVertical size={16} />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl border border-slate-100 bg-white">
                            <DropdownMenuItem onClick={() => handleDetailClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                              <Activity size={14} className="text-slate-500" />
                              <span>Detail Sumber Daya</span>
                            </DropdownMenuItem>
                            {item.active && (
                              <DropdownMenuItem onClick={() => handleImpersonate(item.id)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                                <Building size={14} className="text-teal-650" />
                                <span>Kelola Sekolah</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEditClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                              <Pencil size={14} className="text-slate-500" />
                              <span>Edit Sekolah</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPasswordClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                              <Key size={14} className="text-amber-500" />
                              <span>Reset Password</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: item.id })} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                              {item.active ? (
                                <>
                                  <ShieldAlert size={14} className="text-rose-500" />
                                  <span>Suspend Sekolah</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck size={14} className="text-emerald-500" />
                                  <span>Aktifkan Sekolah</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-slate-100" />
                            <DropdownMenuItem onClick={() => handleDeleteClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700 py-2">
                              <Trash2 size={14} />
                              <span>Hapus Permanen</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              <p className="text-center py-6 text-xs font-bold text-slate-455">Memuat data sekolah...</p>
            ) : filteredSchools.length === 0 ? (
              <p className="text-center py-6 text-xs font-bold text-slate-455">Tidak ada sekolah ditemukan.</p>
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
                        <span className="text-teal-650 bg-teal-550/10 border border-teal-500/20 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">
                          {item.namaSingkat}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-bold">Tidak ada alias</span>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1 border-slate-200 text-slate-655 hover:bg-slate-50 cursor-pointer flex items-center justify-center">
                          <MoreVertical size={14} />
                          <span>Aksi</span>
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl border border-slate-100 bg-white">
                        <DropdownMenuItem onClick={() => handleDetailClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                          <Activity size={14} className="text-slate-500" />
                          <span>Detail Sumber Daya</span>
                        </DropdownMenuItem>
                        {item.active && (
                          <DropdownMenuItem onClick={() => handleImpersonate(item.id)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                            <Building size={14} className="text-teal-650" />
                            <span>Kelola Sekolah</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEditClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                          <Pencil size={14} className="text-slate-500" />
                          <span>Edit Sekolah</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPasswordClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                          <Key size={14} className="text-amber-500" />
                          <span>Reset Password</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: item.id })} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-slate-700 py-2">
                          {item.active ? (
                            <>
                              <ShieldAlert size={14} className="text-rose-500" />
                              <span>Suspend Sekolah</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={14} className="text-emerald-500" />
                              <span>Aktifkan Sekolah</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                        <DropdownMenuItem onClick={() => handleDeleteClick(item)} className="cursor-pointer font-bold text-xs rounded-xl flex items-center gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700 py-2">
                          <Trash2 size={14} />
                          <span>Hapus Permanen</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {/* Modals & Dialogs */}
      <DaftarSekolahDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => utils.superAdmin.listSekolah.invalidate()}
      />

      <EditSekolahDialog
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        sekolah={selectedSekolahForEdit}
        onSuccess={() => utils.superAdmin.listSekolah.invalidate()}
      />

      <ResetPasswordDialog
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        sekolah={selectedSekolahForReset}
      />

      <DeleteSekolahDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        sekolah={selectedSekolahForDelete}
        onSuccess={() => utils.superAdmin.listSekolah.invalidate()}
      />

      <DetailSekolahDialog
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        sekolah={selectedSekolahForDetail}
        onEdit={handleEditClick}
        onResetPassword={handleResetPasswordClick}
        onImpersonate={handleImpersonate}
        onDelete={handleDeleteClick}
      />
    </div>
  )
}
