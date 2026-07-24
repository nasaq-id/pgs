"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import ResponsiveTable from "@/components/ui/responsive-table"
import type { Column } from "@/components/ui/responsive-table"
import { toast } from "sonner"
import { Loader2, Plus, Calendar, Check, X, FileText, Upload, Eye } from "lucide-react"
import { uploadToCloudinary } from "@/lib/cloudinary"

const JENIS_IZIN_LABEL: Record<string, string> = {
  terlambat: "Izin Terlambat",
  pulang_cepat: "Izin Pulang Cepat",
  tidak_masuk: "Sakit / Izin Tidak Masuk",
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-full font-bold text-[10px] uppercase tracking-wider px-2 py-0.5",
  disetujui: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-full font-bold text-[10px] uppercase tracking-wider px-2 py-0.5",
  ditolak: "bg-destructive/10 text-destructive border border-destructive/20 rounded-full font-bold text-[10px] uppercase tracking-wider px-2 py-0.5",
}

export default function IzinPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const utils = api.useUtils()

  const [activeTab, setActiveTab] = useState<"form" | "riwayat" | "approval" | "riwayat_approval">("form")
  const [jenisIzin, setJenisIzin] = useState<"terlambat" | "pulang_cepat" | "tidak_masuk">("tidak_masuk")
  const [alasan, setAlasan] = useState("")
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split("T")[0])
  const [jumlahHari, setJumlahHari] = useState(1)
  const [jamPulang, setJamPulang] = useState("12:00")
  const [buktiUrl, setBuktiUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [catatanApproval, setCatatanApproval] = useState<Record<string, string>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  // Queries & Mutations
  const { data: ownGuru } = api.lms.getCurrentGuru.useQuery(undefined, {
    enabled: role === "guru",
  })
  const { data: classes } = api.kelas.getAll.useQuery({}, {
    enabled: role === "guru",
  })

  const isWaliKelas = !!(ownGuru && classes?.some((c) => c.waliKelasId === ownGuru.id))
  const isKepsekOrWaka = !!(
    ownGuru &&
    (ownGuru.tugasUtama?.toLowerCase().includes("kepala") ||
      ownGuru.tugasUtama?.toLowerCase().includes("waka") ||
      ownGuru.tugasUtama?.toLowerCase().includes("kurikulum") ||
      ownGuru.tugasTambahan?.toLowerCase().includes("kepala") ||
      ownGuru.tugasTambahan?.toLowerCase().includes("waka") ||
      ownGuru.tugasTambahan?.toLowerCase().includes("kurikulum"))
  )

  const canApprove = role === "super_admin" || role === "admin_sekolah" || role === "tu" || isWaliKelas || isKepsekOrWaka

  useEffect(() => {
    if (role) {
      if (role === "siswa" || role === "guru") {
        setActiveTab("form")
      } else if (canApprove) {
        setActiveTab("approval")
      }
    }
  }, [role, canApprove])

  const { data: daftarPengajuan, isLoading: isListLoading } = api.izin.getDaftarPengajuan.useQuery({
    limit: 100,
  })

  const submitMutation = api.izin.submitIzin.useMutation({
    onSuccess: () => {
      toast.success("Pengajuan izin berhasil dikirim")
      setAlasan("")
      setBuktiUrl("")
      setJumlahHari(1)
      utils.izin.getDaftarPengajuan.invalidate()
      setActiveTab("riwayat")
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengirim pengajuan izin")
    },
  })

  const approveMutation = api.izin.approveIzin.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`Pengajuan izin berhasil ${variables.status}`)
      setProcessingId(null)
      utils.izin.getDaftarPengajuan.invalidate()
      utils.absensi.getByKelas.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memproses pengajuan")
      setProcessingId(null)
    },
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const sekolahId = session?.user?.sekolahId || "super_admin"
      const url = await uploadToCloudinary(file, "izin-bukti", { sekolahId })
      setBuktiUrl(url)
      toast.success("Surat/bukti berhasil diunggah")
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah surat/bukti")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!alasan.trim()) {
      toast.error("Alasan pengajuan harus diisi")
      return
    }

    submitMutation.mutate({
      jenisIzin,
      alasan: alasan.trim(),
      tanggalMulai: new Date(tanggalMulai + "T00:00:00"),
      jumlahHari: jenisIzin === "tidak_masuk" ? jumlahHari : 1,
      jamPulang: jenisIzin === "pulang_cepat" ? jamPulang : undefined,
      bukti: buktiUrl || undefined,
    })
  }

  const handleApprove = (id: string, status: "disetujui" | "ditolak") => {
    setProcessingId(id)
    approveMutation.mutate({
      id,
      status,
      catatanApproval: catatanApproval[id] || undefined,
    })
  }

  const isGuruOrSiswa = role === "siswa" || role === "guru"
  const historyList = daftarPengajuan?.data?.filter((r) => role === "siswa" || r.guruId === ownGuru?.id) || []
  const approvalList = daftarPengajuan?.data?.filter((r) => r.status === "pending" && (r.siswaId !== session?.user?.id && r.guruId !== ownGuru?.id)) || []
  const processedList = daftarPengajuan?.data?.filter((r) => r.status !== "pending" && (r.siswaId !== session?.user?.id && r.guruId !== ownGuru?.id)) || []

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="w-5 h-5 text-teal-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Layanan Kehadiran Mandiri</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Pengajuan Izin</h2>
          <p className="text-muted-foreground text-xs mt-1">Kelola pengajuan izin terlambat, pulang cepat, dan sakit/izin tidak masuk</p>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl overflow-x-auto w-full max-w-4xl hide-scrollbar border border-slate-200/50 dark:border-slate-800/40 flex items-center gap-0.5">
        {isGuruOrSiswa && (
          <button
            onClick={() => setActiveTab("form")}
            className={`rounded-xl text-[10.5px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer px-4 py-2.5 flex items-center justify-center ${
              activeTab === "form" ? "bg-white dark:bg-slate-950 text-teal-650 dark:text-teal-400 shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Formulir Pengajuan
          </button>
        )}
        {isGuruOrSiswa && (
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`rounded-xl text-[10.5px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer px-4 py-2.5 flex items-center justify-center ${
              activeTab === "riwayat" ? "bg-white dark:bg-slate-950 text-teal-650 dark:text-teal-400 shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Riwayat Saya
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => setActiveTab("approval")}
            className={`rounded-xl text-[10.5px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer px-4 py-2.5 flex items-center justify-center ${
              activeTab === "approval" ? "bg-white dark:bg-slate-950 text-teal-650 dark:text-teal-400 shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Persetujuan Izin {approvalList.length > 0 && <span className="ml-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{approvalList.length}</span>}
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => setActiveTab("riwayat_approval")}
            className={`rounded-xl text-[10.5px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer px-4 py-2.5 flex items-center justify-center ${
              activeTab === "riwayat_approval" ? "bg-white dark:bg-slate-950 text-teal-650 dark:text-teal-400 shadow-xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Riwayat Persetujuan
          </button>
        )}
      </div>

      {activeTab === "form" && isGuruOrSiswa && (
        <div className="neumo-card bg-background rounded-[26px] p-6 max-w-xl text-left">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Jenis Izin</Label>
              <Select value={jenisIzin} onValueChange={(v: any) => setJenisIzin(v)}>
                <SelectTrigger className="w-full !h-10 !rounded-2xl border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
                  <SelectValue placeholder="Pilih jenis izin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tidak_masuk">Sakit / Izin Tidak Masuk</SelectItem>
                  <SelectItem value="terlambat">Izin Terlambat</SelectItem>
                  <SelectItem value="pulang_cepat">Izin Pulang Cepat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Tanggal Mulai</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450 dark:text-slate-500" />
                <input
                  type="date"
                  lang="id-ID"
                  className="pl-9 h-10 rounded-2xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full cursor-pointer"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                />
              </div>
            </div>

            {jenisIzin === "tidak_masuk" && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Jumlah Hari</Label>
                <input
                  type="number"
                  min={1}
                  value={jumlahHari}
                  onChange={(e) => setJumlahHari(parseInt(e.target.value) || 1)}
                  className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                />
              </div>
            )}

            {jenisIzin === "pulang_cepat" && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Jam Rencana Pulang</Label>
                <input
                  type="time"
                  value={jamPulang}
                  onChange={(e) => setJamPulang(e.target.value)}
                  className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Alasan Pengajuan</Label>
              <textarea
                placeholder="Tulis alasan lengkap pengajuan izin..."
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                rows={3}
                className="p-3 rounded-2xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Surat Bukti / Surat Dokter (Opsional)</Label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 transition-all shadow-sm px-4 text-slate-700 dark:text-slate-300 flex items-center justify-center"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2 text-teal-600" />}
                  <span>Unggah Surat/Foto</span>
                </button>
                <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                {buktiUrl && (
                  <a href={buktiUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1 font-extrabold uppercase tracking-wider">
                    <FileText className="h-3.5 w-3.5" /> Lihat Bukti
                  </a>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer bg-teal-600 hover:bg-teal-700 text-white border-none w-full flex items-center justify-center transition-all disabled:opacity-50"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <span>Kirim Pengajuan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "riwayat" && isGuruOrSiswa && (
        <div className="neumo-card bg-background rounded-[22px] overflow-hidden text-left">
          {isListLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold text-sm rounded-[22px] m-4">
              Belum ada riwayat pengajuan izin
            </div>
          ) : (
            <ResponsiveTable
              columns={[
                { header: "Tanggal Mulai", mobileLabel: "Tanggal", accessor: (row: any) => new Date(row.tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
                { header: "Jenis Izin", mobileLabel: "Jenis", accessor: (row: any) => JENIS_IZIN_LABEL[row.jenisIzin] },
                { header: "Alasan", mobileLabel: "Alasan", accessor: (row: any) => <span title={row.alasan} className="block max-w-[200px] truncate">{row.alasan}</span>, hideOnMobile: true, headerClassName: "max-w-[200px]" },
                { header: "Durasi / Detail", mobileLabel: "Detail", accessor: (row: any) => row.jenisIzin === "tidak_masuk" ? `${row.jumlahHari} Hari` : row.jenisIzin === "pulang_cepat" ? `Jam ${row.jamPulang}` : "Harian" },
                { header: "Bukti", mobileLabel: "Bukti", accessor: (row: any) => row.bukti ? <a href={row.bukti} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline inline-flex items-center gap-1 font-bold text-xs"><Eye className="h-3.5 w-3.5" /> Lihat</a> : "-" },
                { header: "Status", mobileLabel: "Status", accessor: (row: any) => <Badge className={STATUS_BADGE[row.status]} variant="secondary">{row.status}</Badge> },
                { header: "Catatan Approval", mobileLabel: "Catatan", accessor: (row: any) => row.catatanApproval ?? "-", hideOnMobile: true },
              ]}
              data={historyList}
              keyExtractor={(row: any) => row.id}
              emptyMessage="Belum ada riwayat pengajuan izin"
              mobileCardTitle={(row: any) => (
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{JENIS_IZIN_LABEL[row.jenisIzin]}</span>
                  <Badge className={STATUS_BADGE[row.status]} variant="secondary">{row.status}</Badge>
                </div>
              )}
            />
          )}
        </div>
      )}

      {activeTab === "approval" && canApprove && (
        <div className="neumo-card bg-background rounded-[22px] overflow-hidden text-left">
          {isListLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : approvalList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold text-sm rounded-[22px] m-4">
              Tidak ada pengajuan izin pending yang perlu persetujuan
            </div>
          ) : (
            <ResponsiveTable
              columns={[
                { header: "Pengaju", mobileLabel: "Pengaju", accessor: (row: any) => <div><p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{row.name}</p><p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.detail}</p></div> },
                { header: "Tanggal Mulai", mobileLabel: "Tanggal", accessor: (row: any) => new Date(row.tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
                { header: "Jenis Izin", accessor: (row: any) => JENIS_IZIN_LABEL[row.jenisIzin], hideOnMobile: true },
                { header: "Alasan", accessor: (row: any) => <span title={row.alasan} className="block max-w-[200px] truncate">{row.alasan}</span>, hideOnMobile: true },
                { header: "Durasi / Detail", mobileLabel: "Detail", accessor: (row: any) => row.jenisIzin === "tidak_masuk" ? `${row.jumlahHari} Hari` : row.jenisIzin === "pulang_cepat" ? `Jam ${row.jamPulang}` : "Harian" },
                { header: "Bukti", mobileLabel: "Bukti", accessor: (row: any) => row.bukti ? <a href={row.bukti} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline inline-flex items-center gap-1 font-bold text-xs"><Eye className="h-3.5 w-3.5" /> Lihat</a> : "-" },
                { header: "Catatan Verifikasi", mobileLabel: "Catatan", accessor: (row: any) => (
                  <input
                    placeholder="Catatan (opsional)"
                    className="h-8 px-2 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500/20 w-full max-w-[200px]"
                    value={catatanApproval[row.id] || ""}
                    onChange={(e) => setCatatanApproval({ ...catatanApproval, [row.id]: e.target.value })}
                  />
                ), className: "max-w-[220px]" },
                { header: "Aksi", accessor: () => null, headerClassName: "text-right", className: "text-right" },
              ]}
              data={approvalList}
              keyExtractor={(row: any) => row.id}
              emptyMessage="Tidak ada pengajuan izin pending yang perlu persetujuan"
              mobileCardTitle={(row: any) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{row.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{row.detail}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{JENIS_IZIN_LABEL[row.jenisIzin]}</span>
                </div>
              )}
              mobileCardActions={(row: any) => (
                <div className="flex gap-2 w-full">
                  <div className="flex-1">
                    <input
                      placeholder="Catatan"
                      className="h-8 px-2 rounded-lg text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500/20 w-full"
                      value={catatanApproval[row.id] || ""}
                      onChange={(e) => setCatatanApproval({ ...catatanApproval, [row.id]: e.target.value })}
                    />
                  </div>
                  <button
                    className="text-white h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                    style={{ backgroundColor: "hsl(142 72% 40%)" }}
                    onClick={() => handleApprove(row.id, "disetujui")}
                    disabled={processingId === row.id}
                    title="Setujui"
                  >
                    {processingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    className="bg-rose-600 text-white h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-rose-700 transition-colors shrink-0"
                    onClick={() => handleApprove(row.id, "ditolak")}
                    disabled={processingId === row.id}
                    title="Tolak"
                  >
                    {processingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-4 w-4" />}
                  </button>
                </div>
              )}
            />
          )}
        </div>
      )}

      {activeTab === "riwayat_approval" && canApprove && (
        <div className="neumo-card bg-background rounded-[22px] overflow-hidden text-left">
          {isListLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : processedList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold text-sm rounded-[22px] m-4">
              Belum ada riwayat persetujuan izin
            </div>
          ) : (
            <ResponsiveTable
              columns={[
                { header: "Pengaju", mobileLabel: "Pengaju", accessor: (row: any) => <div><p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{row.name}</p><p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.detail}</p></div> },
                { header: "Tanggal Mulai", mobileLabel: "Tanggal", accessor: (row: any) => new Date(row.tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
                { header: "Jenis Izin", accessor: (row: any) => JENIS_IZIN_LABEL[row.jenisIzin], hideOnMobile: true },
                { header: "Alasan", accessor: (row: any) => <span title={row.alasan} className="block max-w-[200px] truncate">{row.alasan}</span>, hideOnMobile: true },
                { header: "Durasi / Detail", mobileLabel: "Detail", accessor: (row: any) => row.jenisIzin === "tidak_masuk" ? `${row.jumlahHari} Hari` : row.jenisIzin === "pulang_cepat" ? `Jam ${row.jamPulang}` : "Harian" },
                { header: "Bukti", mobileLabel: "Bukti", accessor: (row: any) => row.bukti ? <a href={row.bukti} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline inline-flex items-center gap-1 font-bold text-xs"><Eye className="h-3.5 w-3.5" /> Lihat</a> : "-" },
                { header: "Catatan Approval", accessor: (row: any) => row.catatanApproval ?? "-", hideOnMobile: true },
                { header: "Status", mobileLabel: "Status", accessor: (row: any) => <Badge className={STATUS_BADGE[row.status]} variant="secondary">{row.status}</Badge> },
              ]}
              data={processedList}
              keyExtractor={(row: any) => row.id}
              emptyMessage="Belum ada riwayat persetujuan izin"
              mobileCardTitle={(row: any) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{row.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{row.detail}</p>
                  </div>
                  <Badge className={STATUS_BADGE[row.status]} variant="secondary">{row.status}</Badge>
                </div>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}
