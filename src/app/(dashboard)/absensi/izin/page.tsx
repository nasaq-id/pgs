"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Plus, Calendar, Check, X, FileText, Upload, Eye } from "lucide-react"

const JENIS_IZIN_LABEL: Record<string, string> = {
  terlambat: "Izin Terlambat",
  pulang_cepat: "Izin Pulang Cepat",
  tidak_masuk: "Sakit / Izin Tidak Masuk",
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  disetujui: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  ditolak: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
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
      const res = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const uploadRes = await fetch(data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!uploadRes.ok) throw new Error("Gagal mengunggah file ke storage")

      setBuktiUrl(data.publicUrl)
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
  const historyList = daftarPengajuan?.data?.filter((r) => r.siswaId === session?.user?.id || r.guruId === ownGuru?.id) || []
  const approvalList = daftarPengajuan?.data?.filter((r) => r.status === "pending" && (r.siswaId !== session?.user?.id && r.guruId !== ownGuru?.id)) || []
  const processedList = daftarPengajuan?.data?.filter((r) => r.status !== "pending" && (r.siswaId !== session?.user?.id && r.guruId !== ownGuru?.id)) || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pengajuan Izin</h2>
        <p className="text-sm text-muted-foreground">Kelola pengajuan izin terlambat, pulang cepat, dan sakit/izin tidak masuk</p>
      </div>

      <div className="flex gap-2 border-b pb-px">
        {isGuruOrSiswa && (
          <button
            onClick={() => setActiveTab("form")}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "form" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Formulir Pengajuan
          </button>
        )}
        {isGuruOrSiswa && (
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "riwayat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Riwayat Saya
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => setActiveTab("approval")}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "approval" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Persetujuan Izin {approvalList.length > 0 && <span className="ml-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{approvalList.length}</span>}
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => setActiveTab("riwayat_approval")}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "riwayat_approval" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Riwayat Persetujuan
          </button>
        )}
      </div>

      {activeTab === "form" && isGuruOrSiswa && (
        <Card className="glass-card p-6 max-w-xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Izin</Label>
              <Select value={jenisIzin} onValueChange={(v: any) => setJenisIzin(v)}>
                <SelectTrigger className="w-full">
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
              <Label>Tanggal Mulai</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" className="pl-9" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
              </div>
            </div>

            {jenisIzin === "tidak_masuk" && (
              <div className="space-y-2">
                <Label>Jumlah Hari</Label>
                <Input type="number" min={1} value={jumlahHari} onChange={(e) => setJumlahHari(parseInt(e.target.value) || 1)} />
              </div>
            )}

            {jenisIzin === "pulang_cepat" && (
              <div className="space-y-2">
                <Label>Jam Rencana Pulang</Label>
                <Input type="time" value={jamPulang} onChange={(e) => setJamPulang(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Alasan Pengajuan</Label>
              <Textarea placeholder="Tulis alasan lengkap pengajuan izin..." value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Surat Bukti / Surat Dokter (Opsional)</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Unggah Surat/Foto
                </Button>
                <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                {buktiUrl && (
                  <a href={buktiUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
                    <FileText className="h-3.5 w-3.5" /> Lihat Bukti
                  </a>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button style={{ backgroundColor: "hsl(142 72% 40%)" }} className="w-full text-white" onClick={handleSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Kirim Pengajuan
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "riwayat" && isGuruOrSiswa && (
        <Card className="glass-card p-5">
          {isListLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Belum ada riwayat pengajuan izin</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Jenis Izin</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Durasi / Detail</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyList.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                    <TableCell className="font-semibold">{JENIS_IZIN_LABEL[row.jenisIzin]}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.alasan}>{row.alasan}</TableCell>
                    <TableCell>
                      {row.jenisIzin === "tidak_masuk" && `${row.jumlahHari} Hari`}
                      {row.jenisIzin === "pulang_cepat" && `Jam ${row.jamPulang}`}
                      {row.jenisIzin === "terlambat" && "Harian"}
                    </TableCell>
                    <TableCell>
                      {row.bukti ? (
                        <a href={row.bukti} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Lihat
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[row.status]} variant="secondary">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{row.catatanApproval ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {activeTab === "approval" && canApprove && (
        <Card className="glass-card p-5">
          {isListLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : approvalList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Tidak ada pengajuan izin pending yang perlu persetujuan</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengaju</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Jenis Izin</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Durasi / Detail</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Catatan Verifikasi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalList.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{(row as any).name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{(row as any).detail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(row.tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                    <TableCell className="font-semibold">{JENIS_IZIN_LABEL[row.jenisIzin]}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.alasan}>{row.alasan}</TableCell>
                    <TableCell>
                      {row.jenisIzin === "tidak_masuk" && `${row.jumlahHari} Hari`}
                      {row.jenisIzin === "pulang_cepat" && `Jam ${row.jamPulang}`}
                      {row.jenisIzin === "terlambat" && "Harian"}
                    </TableCell>
                    <TableCell>
                      {row.bukti ? (
                        <a href={row.bukti} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Lihat
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Catatan persetujuan (opsional)"
                        className="h-8 max-w-[200px]"
                        value={catatanApproval[row.id] || ""}
                        onChange={(e) => setCatatanApproval({ ...catatanApproval, [row.id]: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          style={{ backgroundColor: "hsl(142 72% 40%)" }}
                          className="text-white h-8"
                          onClick={() => handleApprove(row.id, "disetujui")}
                          disabled={processingId === row.id}
                        >
                          {processingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          onClick={() => handleApprove(row.id, "ditolak")}
                          disabled={processingId === row.id}
                        >
                          {processingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {activeTab === "riwayat_approval" && canApprove && (
        <Card className="glass-card p-5">
          {isListLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : processedList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Belum ada riwayat persetujuan izin</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengaju</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Jenis Izin</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Durasi / Detail</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead>Catatan Approval</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedList.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{(row as any).name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{(row as any).detail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(row.tanggalMulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                    <TableCell className="font-semibold">{JENIS_IZIN_LABEL[row.jenisIzin]}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.alasan}>{row.alasan}</TableCell>
                    <TableCell>
                      {row.jenisIzin === "tidak_masuk" && `${row.jumlahHari} Hari`}
                      {row.jenisIzin === "pulang_cepat" && `Jam ${row.jamPulang}`}
                      {row.jenisIzin === "terlambat" && "Harian"}
                    </TableCell>
                    <TableCell>
                      {row.bukti ? (
                        <a href={row.bukti} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Lihat
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{row.catatanApproval ?? "-"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[row.status]} variant="secondary">
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  )
}
