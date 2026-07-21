"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Camera,
  QrCode,
  ClipboardList,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Sparkles,
  Lock,
  RefreshCw,
  Maximize2
} from "lucide-react"
import { toast } from "sonner"

export default function PresensiGuruPage() {
  const { data: session } = useSession()
  const isGuru = session?.user?.role === "guru"
  const isAdmin = session?.user?.role === "super_admin" || session?.user?.role === "admin_sekolah"

  const [activeTab, setActiveTab] = useState<"scan" | "qrcode" | "logs">("scan")
  const [manualCode, setManualCode] = useState("")
  const [scanResult, setScanResult] = useState<any | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const { data: staticQrData, isLoading: isLoadingStaticQr } = api.absensi.getStaticQrGuru.useQuery()
  const { data: guruLogs, isLoading: isLoadingLogs, refetch: refetchLogs } = api.absensi.getLogs.useQuery({
    tanggal: new Date(),
  })

  const scanMutation = api.absensi.scanSingleQrGuru.useMutation({
    onSuccess: (res) => {
      setScanResult(res)
      toast.success(
        res.action === "masuk"
          ? `Berhasil Presensi Masuk: ${res.name}`
          : `Berhasil Presensi Pulang: ${res.name}`
      )
      refetchLogs()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memproses presensi QR")
    },
  })

  const handleScanSubmit = async (codeToSubmit: string) => {
    if (!codeToSubmit.trim()) return
    setScanResult(null)
    await scanMutation.mutateAsync({ qrCode: codeToSubmit.trim() })
  }

  // Camera simulation / video stream trigger
  useEffect(() => {
    let stream: MediaStream | null = null
    if (activeTab === "scan" && isScanning) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s
          if (videoRef.current) {
            videoRef.current.srcObject = s
          }
        })
        .catch(() => {
          toast.error("Tidak dapat mengakses kamera device")
          setIsScanning(false)
        })
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream
        s.getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = null
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [activeTab, isScanning])

  const fmtTime = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  const qrImageUrl = staticQrData?.qrCodeValue
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(staticQrData.qrCodeValue)}`
    : ""

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
            MODUL PRESENSI GURU & TENDIK
          </span>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Presensi Single Scan QR Guru
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Sistem presensi digital guru menggunakan Single Scan QR Statik Sekolah
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/60 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "scan"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qrcode")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "qrcode"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "logs"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Log Presensi</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Scan QR Sekolah */}
      {activeTab === "scan" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Camera Scanner Box */}
          <Card className="p-6 rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 glass-card space-y-5 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Scan QR Presensi Sekolah
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arahkan kamera ke QR Code Statik yang dipajang di sekolah
                </p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 font-extrabold text-[10px]">
                Single Scan QR
              </Badge>
            </div>

            {/* Scanner Area */}
            <div className="relative aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-teal-500/40 flex flex-col items-center justify-center shadow-inner">
              {isScanning ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-x-8 top-1/2 h-0.5 bg-teal-400 shadow-[0_0_12px_#2dd4bf] animate-pulse" />
                </>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/20">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">
                    Klik tombol di bawah untuk mengaktifkan kamera HP Anda
                  </p>
                </div>
              )}
            </div>

            {/* Camera Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setIsScanning(!isScanning)}
                className={cn(
                  "flex-1 h-11 rounded-2xl text-xs font-black uppercase tracking-wider gap-2 cursor-pointer shadow-md",
                  isScanning ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
                )}
              >
                <Camera className="w-4 h-4" />
                <span>{isScanning ? "Matikan Kamera" : "Aktifkan Kamera"}</span>
              </Button>
            </div>

            {/* Simulated / Quick Scan Input for Demo */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Simulasi / Input QR Code Statik:
              </span>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={staticQrData?.qrCodeValue || "PGS-PRESENSI-GURU-..."}
                  className="rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-900"
                />
                <Button
                  type="button"
                  onClick={() => handleScanSubmit(manualCode || staticQrData?.qrCodeValue || "")}
                  disabled={scanMutation.isPending}
                  className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                >
                  {scanMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Scan QR"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Right: Scan Feedback Card & Attendance Summary */}
          <div className="space-y-6">
            {scanResult ? (
              <Card className="p-6 rounded-[28px] border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-left space-y-4 shadow-lg animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                      Presensi Berhasil Recorded!
                    </span>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {scanResult.name}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-900/40 space-y-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tindakan</span>
                    <span className="text-xs font-extrabold text-emerald-600 uppercase block">
                      {scanResult.action === "masuk" ? "Presensi Masuk" : "Presensi Pulang"}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-900/40 space-y-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status</span>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase block">
                      {scanResult.status || "Hadir"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 text-center font-semibold pt-1">
                  Waktu dicatat: {fmtTime(scanResult.time)} WIB
                </p>
              </Card>
            ) : (
              <Card className="p-6 rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 glass-card text-left space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                      Informasi Ketentuan Presensi Guru
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {staticQrData?.sekolahNama || "Sekolah"} &middot; Jam Masuk: {staticQrData?.jamMasuk || "07:00"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>Guru menscan QR Code Statik sekolah saat tiba di sekolah untuk presensi <strong>Masuk</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Keterlambatan dihitung otomatis jika scan dilakukan melewati jam <strong>{staticQrData?.jamMasuk || "07:00"} + {staticQrData?.toleransi || 15} menit</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>Saat hendak pulang, guru menscan QR yang sama sekali lagi untuk presensi <strong>Pulang</strong>.</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: QR Code Sekolah (Tampilan QR Code Statik Utama) */}
      {activeTab === "qrcode" && (
        <Card className="p-8 rounded-[32px] border border-slate-200/80 dark:border-slate-800/80 glass-card max-w-2xl mx-auto space-y-6 text-center shadow-xl">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 block">
              {staticQrData?.sekolahNama || "SEKOLAH"}
            </span>
            <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
              QR Code Presensi Guru Statis
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Cetak atau tampilkan QR Code tunggal ini di ruang guru / mading sekolah untuk dipindai oleh seluruh guru.
            </p>
          </div>

          {/* Mode Selector Toggle (Mode Statik vs Dinamis Coming Soon) */}
          <div className="flex items-center justify-center gap-2 max-w-sm mx-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              className="flex-1 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs cursor-default"
            >
              QR Statik (Aktif)
            </button>

            <button
              type="button"
              onClick={() => toast.info("Fitur QR Code Dinamis (Berganti 30s) sedang dalam pengembangan [Coming Soon]!")}
              className="flex-1 py-2 rounded-xl text-xs font-extrabold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 cursor-pointer transition-all"
            >
              <span>QR Dinamis</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-md uppercase tracking-wider">
                Coming Soon
              </span>
            </button>
          </div>

          {/* QR Code Display Container */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-lg inline-block relative group">
            {isLoadingStaticQr ? (
              <Skeleton className="w-64 h-64 rounded-2xl mx-auto" />
            ) : (
              <img
                src={qrImageUrl}
                alt="Static School Teacher Attendance QR Code"
                className="w-64 h-64 mx-auto rounded-xl object-contain"
              />
            )}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="font-mono text-[11px] font-bold text-slate-500 block">
                {staticQrData?.qrCodeValue}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              onClick={() => window.print()}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 text-xs font-extrabold uppercase tracking-wider gap-2 cursor-pointer shadow-md shadow-teal-600/10"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak QR Code</span>
            </Button>

            <a
              href={qrImageUrl}
              download="QR_Presensi_Guru_Sekolah.png"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-11 text-xs font-extrabold uppercase tracking-wider gap-2 cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Unduh QR</span>
              </Button>
            </a>
          </div>
        </Card>
      )}

      {/* Tab 3: Log Presensi Guru Hari Ini */}
      {activeTab === "logs" && (
        <Card className="p-6 rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 glass-card space-y-4 text-left shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                Log Presensi Guru Hari Ini
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daftar presensi guru yang tercatat pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchLogs()}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>

          {isLoadingLogs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : !guruLogs || guruLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <ClipboardList className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Belum ada log presensi guru hari ini
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-slate-900/40">
                  <TableRow>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">GURU / TENDIK</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">JAM MASUK</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">JAM PULANG</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guruLogs.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                      <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                        {log.guru?.namaLengkap || "Guru"}
                        {log.guru?.nipnuptk && <span className="block text-[10px] font-normal text-slate-400 font-mono">{log.guru.nipnuptk}</span>}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {fmtTime(log.jamMasuk)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {fmtTime(log.jamPulang)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                            log.status === "hadir"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : log.status === "terlambat"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          )}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
