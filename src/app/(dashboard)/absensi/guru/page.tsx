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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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
  Maximize2,
  ShieldAlert,
  X,
  Loader2
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
  const [html5QrcodeClass, setHtml5QrcodeClass] = useState<any>(null)

  const scannerRef = useRef<{ instance: any | null; stopped: boolean }>({
    instance: null,
    stopped: false,
  })
  const scanProcessingLockRef = useRef(false)

  const [lateDialogOpen, setLateDialogOpen] = useState(false)
  const [lateReason, setLateReason] = useState("")
  const [pendingQrCode, setPendingQrCode] = useState("")
  const [pendingAction, setPendingAction] = useState<"masuk" | "pulang">("masuk")

  // Menyimpan koordinat GPS dari percobaan scan pertama siswa, agar bisa
  // dipakai ulang saat mengirim alasan keterlambatan (requireReason).
  const pendingCoordsRef = useRef<{ latitude: number | null; longitude: number | null } | null>(null)

  const { data: staticQrData, isLoading: isLoadingStaticQr } = api.absensi.getStaticQrGuru.useQuery()
  const { data: guruLogs, isLoading: isLoadingLogs, refetch: refetchLogs } = api.absensi.getGuruAbsensi.useQuery({
    tanggal: new Date(),
  })

  useEffect(() => {
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      setHtml5QrcodeClass(() => Html5Qrcode)
    }).catch((err) => {
      console.error("Failed to load html5-qrcode:", err)
    })
  }, [])

  const scanMutation = api.absensi.scanSingleQrGuru.useMutation({
    onSuccess: (res) => {
      if ("requireReason" in res && res.requireReason) {
        return
      }
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

  // Mutation untuk absensi SISWA via barcode (dual-fungsi scanner guru)
  const barcodeScanMutation = api.absensi.absenViaBarcode.useMutation({
    onError: (err) => {
      toast.error(err.message || "Gagal memproses absensi siswa")
    },
  })

  /* ─── Geolocation (diperlukan untuk absensi siswa / geofencing) ─── */
  const getGeolocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) return null
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }

  const resetAndRestartScanner = async () => {
    scanProcessingLockRef.current = false
    setIsScanning(true)
    setTimeout(() => {
      startCamera()
    }, 100)
  }

  const handleScanSubmit = async (codeToSubmit: string, reason?: string) => {
    if (!codeToSubmit.trim()) return
    setScanResult(null)
    try {
      const code = codeToSubmit.trim()
      const isGuruQr = code.startsWith("PGS-PRESENSI-GURU-")

      if (isGuruQr) {
        // ── Path 1: Absensi guru diri sendiri (scan QR statik sekolah) ──
        const res = await scanMutation.mutateAsync({ qrCode: code, alasan: reason })
        if (res && 'requireReason' in res && res.requireReason) {
          setPendingQrCode(code)
          setLateReason("")
          setPendingAction(res.action === "pulang" ? "pulang" : "masuk")
          setLateDialogOpen(true)
          toast.warning(res.action === "pulang" ? "Pulang Cepat: Harap konfirmasi alasan kepulangan lebih awal." : "Terlambat: Harap masukkan alasan keterlambatan.")
          await stopCamera()
        } else {
          setLateDialogOpen(false)
          setLateReason("")
          setPendingQrCode("")
          // Stop camera on successful attendance to show final result card
          await stopCamera()
        }
      } else {
        // ── Path 2: Absensi SISWA (scan QR/kartu siswa = NISN/id) ──
        // Ambil GPS hanya pada percobaan pertama (reason kosong);
        // saat mengirim alasan keterlambatan, pakai ulang koordinat tersimpan.
        let coords: { latitude: number | null; longitude: number | null } | null = pendingCoordsRef.current
        if (!reason) {
          coords = await getGeolocation()
          pendingCoordsRef.current = coords
        }

        const res = await barcodeScanMutation.mutateAsync({
          barcode: code,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          alasan: reason,
        })

        if (res && 'requireReason' in res && res.requireReason) {
          setPendingQrCode(code)
          setLateReason("")
          setPendingAction(res.action === "pulang" ? "pulang" : "masuk")
          setLateDialogOpen(true)
          toast.warning(res.action === "pulang" ? "Pulang Cepat: Harap konfirmasi alasan kepulangan lebih awal." : "Terlambat: Harap masukkan alasan keterlambatan.")
          await stopCamera()
        } else {
          // Sukses — tampilkan kartu hasil absensi siswa
          setScanResult({
            success: true,
            name: res.name,
            action: res.action,
            status: res.status,
            time: new Date(),
          })
          toast.success(`Absensi Siswa: ${res.name} (${res.action === "masuk" ? "Masuk" : "Pulang"})`)
          setLateDialogOpen(false)
          setLateReason("")
          setPendingQrCode("")
          pendingCoordsRef.current = { latitude: null, longitude: null }
          await stopCamera()
        }
      }
    } catch (err) {
      // Handled in onError of scanMutation / barcodeScanMutation
      scanProcessingLockRef.current = false
    }
  }

  const handleLateReasonSubmit = async () => {
    if (!pendingQrCode || !lateReason.trim()) return
    await handleScanSubmit(pendingQrCode, lateReason.trim())
  }

  const startCamera = async () => {
    if (!html5QrcodeClass) {
      toast.warning("Pemindai kamera sedang disiapkan. Silakan coba beberapa saat lagi.")
      return
    }

    setIsScanning(true)
    scanProcessingLockRef.current = false
    scannerRef.current.stopped = false

    const scannerId = "reader"
    scannerRef.current.instance = new html5QrcodeClass(scannerId)

    try {
      await scannerRef.current.instance.start(
        { facingMode: { ideal: "environment" } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          if (scanProcessingLockRef.current) return
          scanProcessingLockRef.current = true
          
          // Stop camera scanning visually while processing
          const instance = scannerRef.current.instance
          if (instance && !scannerRef.current.stopped) {
            try {
              await instance.stop()
              scannerRef.current.stopped = true
            } catch {}
          }
          
          await handleScanSubmit(decodedText)
        },
        () => {},
      )
    } catch (err: any) {
      console.error("Camera scanner start failed:", err)
      let msg = "Gagal mengakses kamera."
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Akses kamera ditolak. Silakan izinkan kamera di pengaturan browser/iOS Anda."
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Kamera tidak ditemukan pada perangkat Anda."
      } else if (err.name === "OverconstrainedError") {
        msg = "Spesifikasi kamera belakang tidak didukung oleh perangkat ini."
      } else {
        msg = `Gagal mengakses kamera: ${err.message || err}`
      }
      toast.error(msg)
      setIsScanning(false)
    }
  }

  const stopCamera = async () => {
    const scanner = scannerRef.current
    scanner.stopped = true
    if (scanner.instance) {
      try {
        await scanner.instance.stop()
        scanner.instance.clear()
      } catch {}
      scanner.instance = null
    }
    setIsScanning(false)
  }

  const handleToggleCamera = async () => {
    if (isScanning) {
      await stopCamera()
    } else {
      await startCamera()
    }
  }

  useEffect(() => {
    if (activeTab !== "scan") {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [activeTab])

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
            Presensi Guru &amp; Scan Siswa
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Sistem presensi digital guru (QR Statik) sekaligus pemindai kehadiran siswa via QR kartu
          </p>
        </div>
      </div>

      {/* Centered Neomorphic Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className=" w-full max-w-lg flex gap-2 ">
            <TabsTrigger value="scan" className="rounded-xl px-4 py-2.5 font-bold transition-all  cursor-pointer text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Camera className="w-4 h-4" />
              <span>Scan QR</span>
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="rounded-xl px-4 py-2.5 font-bold transition-all  cursor-pointer text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4" />
              <span>QR Code</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl px-4 py-2.5 font-bold transition-all  cursor-pointer text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <ClipboardList className="w-4 h-4" />
              <span>Log Presensi</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Tab 1: Scan QR Sekolah */}
      {activeTab === "scan" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Camera Scanner Box */}
          <Card className="p-6 rounded-[28px] neumo-card bg-background space-y-5 text-left">
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
            <div className="relative aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-teal-500/40 flex flex-col items-center justify-center shadow-inner w-full">
              <div id="reader" className="w-full h-full object-cover [&_video]:object-cover" style={{ display: isScanning ? "block" : "none" }} />
              {!isScanning && (
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
                onClick={handleToggleCamera}
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
              <Card className="p-6 rounded-[28px] neumo-card bg-background text-left space-y-4">
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
                  <div className="flex items-start gap-2 pt-1 mt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <span><strong>Scan Siswa:</strong> Arahkan kamera ke QR Code kartu siswa (NISN) untuk mencatat kehadiran siswa secara langsung — sama seperti admin. Sistem otomatis mendeteksi apakah QR milik guru atau siswa.</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: QR Code Sekolah (Tampilan QR Code Statik Utama) */}
      {activeTab === "qrcode" && (
        <Card className="p-8 rounded-[32px] neumo-card bg-background max-w-2xl mx-auto space-y-6 text-center">
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
        <Card className="p-6 rounded-[28px] neumo-card bg-background space-y-4 text-left">
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

      {/* Printable QR Code Card - only visible when printing */}
      <div
        id="printable-qr-area"
        className="hidden print:flex flex-col items-center justify-center text-center p-10 bg-white text-black border-4 border-double border-teal-600 rounded-[32px] max-w-xl mx-auto my-auto min-h-[85vh] space-y-6"
      >
        <div className="space-y-2">
          <span className="text-xs font-black tracking-widest text-teal-600 uppercase">
            KARTU PRESENSI DIGITAL
          </span>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            {staticQrData?.sekolahNama || "SEKOLAH"}
          </h1>
          <div className="h-1 w-24 bg-teal-500 mx-auto rounded-full" />
        </div>

        <div className="p-6 border-4 border-slate-900 rounded-3xl bg-white shadow-md">
          {qrImageUrl && (
            <img
              src={qrImageUrl}
              alt="QR Presensi Guru"
              className="w-72 h-72 mx-auto object-contain"
            />
          )}
        </div>

        <span className="font-mono text-xs font-bold text-slate-500">
          {staticQrData?.qrCodeValue}
        </span>

        <div className="border-t border-slate-200 pt-5 w-full max-w-sm space-y-3 text-left text-xs text-slate-700">
          <p className="font-black text-center text-slate-800 mb-1 uppercase tracking-wider">
            Petunjuk Scan Presensi Guru:
          </p>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <span>Buka aplikasi <strong>PGS</strong> di HP Anda dan masuk ke menu <strong>Presensi Guru</strong>.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <span>Klik tombol <strong>"Scan QR Sekolah"</strong> dan arahkan kamera HP ke QR Code ini.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <span>Sistem akan mencatat jam presensi Masuk / Pulang Anda secara real-time.</span>
          </div>
        </div>
      </div>

      {/* Dialog Alasan Keterlambatan / Pulang Cepat */}
      <Dialog open={lateDialogOpen} onOpenChange={(v) => { if (!v) { setLateDialogOpen(false); setPendingQrCode(""); setPendingAction("masuk"); resetAndRestartScanner(); } }}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                {pendingAction === "pulang" ? "Konfirmasi Pulang Cepat" : "Konfirmasi Keterlambatan"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => { setLateDialogOpen(false); setPendingQrCode(""); setPendingAction("masuk"); resetAndRestartScanner(); }}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <p className="font-bold">⚠️ Perhatian:</p>
              <p className="mt-1">
                {pendingAction === "pulang"
                  ? "Presensi pulang dilakukan sebelum jam pulang sekolah. Anda wajib mengisi alasan pulang cepat untuk mencatat kepulangan ini."
                  : "Waktu pemindaian absensi masuk telah melewati batas toleransi keterlambatan 15 menit dari jam pelajaran (JP) Anda. Anda wajib mengisi alasan keterlambatan untuk mencatat kehadiran ini."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                {pendingAction === "pulang" ? "Alasan Pulang Cepat (Wajib)" : "Alasan Terlambat (Wajib)"}
              </Label>
              <textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder={pendingAction === "pulang" ? "Masukkan alasan pulang cepat (misalnya: urusan keluarga, keperluan mendesak, dll)..." : "Masukkan alasan keterlambatan (misalnya: macet di jalan, kendala kendaraan, dll)..."}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 dark:bg-slate-900/50 text-xs p-3 font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setLateDialogOpen(false); setPendingQrCode(""); setPendingAction("masuk"); resetAndRestartScanner(); }}
              disabled={scanMutation.isPending}
              className="gap-2 cursor-pointer border-slate-200 hover:bg-slate-50 font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleLateReasonSubmit}
              disabled={scanMutation.isPending || !lateReason.trim()}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-md shadow-teal-500/5 transition-all"
            >
              {scanMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              <span>Kirim & Absen</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global CSS for Print Media */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-qr-area, #printable-qr-area * {
            visibility: visible !important;
          }
          #printable-qr-area {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 100% !important;
            max-width: 550px !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            border: 4px double #0d9488 !important;
            border-radius: 24px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 40px !important;
          }
        }
      `}} />
    </div>
  )
}
