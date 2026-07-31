"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Zap, ZapOff, Loader2, CheckCircle2, AlertTriangle, Camera } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"

type StatusAbsensi = "hadir" | "izin" | "sakit" | "alpha" | "terlambat"

const STATUS_LABELS: Record<StatusAbsensi, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpha: "Alpha",
  terlambat: "Terlambat",
}

type ScannerState =
  | "idle"
  | "scanning"
  | "detecting"
  | "verifying"
  | "success"
  | "error"
  | "permission_denied"
  | "require_reason"

interface Props {
  open: boolean
  onClose: () => void
}

export default function QRScannerModal({ open, onClose }: Props) {
  const router = useRouter()
  const [state, setState] = useState<ScannerState>("idle")
  const [cameraReady, setCameraReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [flashOn, setFlashOn] = useState(false)
  const [dwellProgress, setDwellProgress] = useState(0)
  const [result, setResult] = useState<{
    success: boolean
    name?: string
    action?: string
    status?: string
    message: string
  } | null>(null)

  const [pendingQrCode, setPendingQrCode] = useState("")
  const [lateReason, setLateReason] = useState("")
  const [lateName, setLateName] = useState("")

  const html5QrcodeRef = useRef<any>(null)
  const stateRef = useRef<ScannerState>("idle")
  const processingLockRef = useRef(false)
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null)
  const dwellIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const detectedCodeRef = useRef<string | null>(null)
  const resultTimerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)

  const barcodeScanMutation = api.absensi.absenViaBarcode.useMutation()
  const guruScanMutation = api.absensi.scanSingleQrGuru.useMutation()

  /* ─── Sound & Haptic ─── */
  const playSound = useCallback((type: "success" | "error") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.18)
      } else {
        osc.frequency.setValueAtTime(350, ctx.currentTime)
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      }
    } catch {}
  }, [])

  const hapticFeedback = useCallback((type: "success" | "error") => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(type === "success" ? [100] : [80, 40, 80])
      }
    } catch {}
  }, [])

  /* ─── Geolocation ─── */
  const getGeolocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) return null
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }, [])

  /* ─── Flashlight ─── */
  const toggleFlash = useCallback(async () => {
    if (!trackRef.current) return
    try {
      const capabilities = trackRef.current.getCapabilities() as any
      if (capabilities?.torch) {
        await trackRef.current.applyConstraints({
          advanced: [{ torch: !flashOn } as any],
        })
        setFlashOn(!flashOn)
      }
    } catch {
      toast.error("Flashlight tidak didukung device ini")
    }
  }, [flashOn])

  /* ─── Scanner Controls ─── */
  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop()
        }
      } catch {}
      try { html5QrcodeRef.current.clear() } catch {}
      html5QrcodeRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      trackRef.current = null
    }
  }, [])

  const clearDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) { clearTimeout(dwellTimerRef.current); dwellTimerRef.current = null }
    if (dwellIntervalRef.current) { clearInterval(dwellIntervalRef.current); dwellIntervalRef.current = null }
    detectedCodeRef.current = null
    setDwellProgress(0)
  }, [])

  /* ─── Validate QR ─── */
  const handleValidate = useCallback(
    async (decodedText: string, reason?: string) => {
      const isSubmittingReason = !!reason
      if (!isSubmittingReason) {
        if (processingLockRef.current || stateRef.current !== "detecting") return
        processingLockRef.current = true
        clearDwellTimer()
        setState("verifying")
        await stopScanner()
      } else {
        setState("verifying")
      }

      try {
        const coords = await getGeolocation()
        const isGuruQr = decodedText.startsWith("PGS-PRESENSI-GURU-")
        let resultData: any

        if (isGuruQr) {
          resultData = await guruScanMutation.mutateAsync({
            qrCode: decodedText,
            alasan: reason,
          })
        } else {
          resultData = await barcodeScanMutation.mutateAsync({
            barcode: decodedText,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
            alasan: reason,
          })
        }

        /* Late reason required */
        if (resultData.requireReason) {
          processingLockRef.current = false
          playSound("error")
          hapticFeedback("error")
          setPendingQrCode(decodedText)
          setLateName(resultData.name || "")
          setLateReason("")
          setState("require_reason")
          return
        }

        /* Success */
        playSound("success")
        hapticFeedback("success")
        setResult({
          success: true,
          name: resultData.name,
          action: resultData.action === "masuk" ? "MASUK" : "PULANG",
          status: STATUS_LABELS[resultData.status as StatusAbsensi] || resultData.status,
          message: `${resultData.name} — ${resultData.action === "masuk" ? "Masuk" : "Pulang"}`,
        })
        setState("success")

        resultTimerRef.current = setTimeout(() => {
          onClose()
          router.push("/")
        }, 1800)
      } catch (err: any) {
        playSound("error")
        hapticFeedback("error")
        setErrorMessage(err.message || "Gagal memproses absensi. Silakan coba lagi.")
        setState("error")
      }
    },
    [barcodeScanMutation, guruScanMutation, stopScanner, playSound, hapticFeedback, getGeolocation, clearDwellTimer, onClose, router],
  )

  const handleReasonSubmit = async () => {
    if (!pendingQrCode || !lateReason.trim()) return
    await handleValidate(pendingQrCode, lateReason.trim())
  }

  /* ─── QR Detected → Dwell Timer ─── */
  const handleQrDetected = useCallback(
    (decodedText: string) => {
      if (processingLockRef.current || stateRef.current !== "scanning") return
      if (detectedCodeRef.current === decodedText && dwellTimerRef.current) return

      clearDwellTimer()
      detectedCodeRef.current = decodedText
      setState("detecting")
      setDwellProgress(0)

      const startTime = Date.now()
      const DWELL_MS = 1000

      dwellIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / DWELL_MS, 1)
        setDwellProgress(progress)
        if (progress >= 1 && dwellIntervalRef.current) clearInterval(dwellIntervalRef.current)
      }, 30)

      dwellTimerRef.current = setTimeout(() => {
        handleValidate(decodedText)
      }, DWELL_MS)
    },
    [clearDwellTimer, handleValidate],
  )

  /* ─── Reset to scanning ─── */
  const handleRetry = useCallback(() => {
    processingLockRef.current = false
    setErrorMessage("")
    setResult(null)
    clearDwellTimer()
    setState("scanning")
    /* Re-start scanner */
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode("qr-scanner-feed")
      html5QrcodeRef.current = scanner
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          (text: string) => handleQrDetected(text),
          () => {},
        )
        .then(() => {
          setCameraReady(true)
          /* grab stream ref for flashlight */
          const videoEl = document.querySelector("#qr-scanner-feed video") as HTMLVideoElement
          if (videoEl?.srcObject) {
            streamRef.current = videoEl.srcObject as MediaStream
            trackRef.current = streamRef.current.getVideoTracks()[0] ?? null
          }
        })
        .catch(() => setState("permission_denied"))
    })
  }, [clearDwellTimer, handleQrDetected])

  /* ─── Lifecycle ─── */
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!open) {
      stopScanner()
      clearDwellTimer()
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
      setState("idle")
      setCameraReady(false)
      setErrorMessage("")
      setResult(null)
      setFlashOn(false)
      setDwellProgress(0)
      processingLockRef.current = false
      return
    }

    const timer = setTimeout(() => {
      /* Check camera permission first */
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          /* Permission granted — stop this temp stream, html5-qrcode will open its own */
          stream.getTracks().forEach((t) => t.stop())

          import("html5-qrcode").then(({ Html5Qrcode }) => {
            const scanner = new Html5Qrcode("qr-scanner-feed")
            html5QrcodeRef.current = scanner
            scanner
              .start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 280, height: 280 } },
                (text: string) => handleQrDetected(text),
                () => {},
              )
              .then(() => {
                setCameraReady(true)
                setState("scanning")
                /* Grab stream for flashlight */
                setTimeout(() => {
                  const videoEl = document.querySelector("#qr-scanner-feed video") as HTMLVideoElement
                  if (videoEl?.srcObject) {
                    streamRef.current = videoEl.srcObject as MediaStream
                    trackRef.current = streamRef.current.getVideoTracks()[0] ?? null
                  }
                }, 500)
              })
              .catch(() => setState("permission_denied"))
          })
        })
        .catch(() => {
          setState("permission_denied")
        })
    }, 300)

    return () => {
      clearTimeout(timer)
      clearDwellTimer()
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
      stopScanner()
    }
  }, [open])

  if (!open) return null

  /* ─── Ring geometry for dwell progress ─── */
  const ringR = 100
  const ringStroke = 5
  const circumference = 2 * Math.PI * ringR
  const ringDashoffset = circumference * (1 - dwellProgress)

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* ─── Camera Feed ─── */}
      <div className="absolute inset-0">
        <div id="qr-scanner-feed" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
      </div>

      {/* ─── Dark Scrim (hanya saat hasil/verifikasi/alasan) ─── */}
      {(state === "verifying" || state === "success" || state === "error" || state === "permission_denied" || state === "require_reason") && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10" />
      )}

      {/* ─── Top Bar ─── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] py-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={toggleFlash}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          {flashOn ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── Center: Cutout + Scan Animation ─── */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        {/* Idle / Scanning */}
        {(state === "idle" || state === "scanning" || state === "detecting") && (
          <div className="relative flex items-center justify-center">
            {/* SVG progress ring */}
            {state === "detecting" && (
              <svg
                width={ringR * 2 + 20}
                height={ringR * 2 + 20}
                className="absolute"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx={ringR + 10}
                  cy={ringR + 10}
                  r={ringR}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={ringStroke}
                  strokeDasharray={circumference}
                  strokeDashoffset={ringDashoffset}
                  strokeLinecap="round"
                  className="transition-none"
                />
              </svg>
            )}

            {/* Cutout square */}
            <div className="relative w-[280px] h-[280px]">
              {/* Modern rounded corner frame via SVG */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280" fill="none">
                {/* Top-left */}
                <path d="M4 40 Q4 4 40 4" stroke={state === "detecting" ? "#10b981" : "white"} strokeWidth="4" strokeLinecap="round" opacity={state === "detecting" ? 1 : 0.7} />
                {/* Top-right */}
                <path d="M240 4 Q276 4 276 40" stroke={state === "detecting" ? "#10b981" : "white"} strokeWidth="4" strokeLinecap="round" opacity={state === "detecting" ? 1 : 0.7} />
                {/* Bottom-right */}
                <path d="M276 240 Q276 276 240 276" stroke={state === "detecting" ? "#10b981" : "white"} strokeWidth="4" strokeLinecap="round" opacity={state === "detecting" ? 1 : 0.7} />
                {/* Bottom-left */}
                <path d="M40 276 Q4 276 4 240" stroke={state === "detecting" ? "#10b981" : "white"} strokeWidth="4" strokeLinecap="round" opacity={state === "detecting" ? 1 : 0.7} />
              </svg>

              {/* Scanning line — only when scanning, not detecting */}
              {state === "scanning" && (
                <div className="scan-line absolute left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              )}

              {/* Detecting pulse indicator */}
              {state === "detecting" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verifying */}
        {state === "verifying" && (
          <div className="flex flex-col items-center gap-5 animate-fade-in">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-white animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              </div>
            </div>
            <p className="text-white text-base font-semibold tracking-wide">Memverifikasi...</p>
          </div>
        )}

        {/* Success */}
        {state === "success" && result && (
          <div className="flex flex-col items-center gap-4 animate-success-pop">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center relative">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-white text-xl font-bold">{result.name}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full">
                  {result.action}
                </span>
                <span className="text-[11px] font-bold text-white/50">{result.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="flex flex-col items-center gap-5 px-10 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-400/30 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-red-300 text-base font-semibold leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={handleRetry}
              className="mt-2 px-8 py-3 rounded-2xl bg-white/10 backdrop-blur-md text-white text-sm font-bold active:scale-95 transition-transform border border-white/10"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Permission Denied */}
        {state === "permission_denied" && (
          <div className="flex flex-col items-center gap-5 px-10 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-white/40" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white/80 text-base font-semibold">Izin kamera diperlukan</p>
              <p className="text-white/40 text-sm leading-relaxed">
                Aktifkan izin kamera di pengaturan browser untuk menggunakan fitur scan QR.
              </p>
            </div>
            <button
              onClick={() => {
                onClose()
                router.push("/absensi")
              }}
              className="mt-2 px-8 py-3 rounded-2xl bg-white/10 backdrop-blur-md text-white text-sm font-bold active:scale-95 transition-transform border border-white/10"
            >
              Absen Manual
            </button>
          </div>
        )}
        {state === "require_reason" && (
          <div className="w-full max-w-sm mx-4 bg-slate-900/90 dark:bg-slate-950/95 p-6 rounded-[28px] border border-white/10 shadow-2xl flex flex-col gap-4 text-left z-30 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="text-sm font-black text-white uppercase tracking-wider">
                ⚠️ Konfirmasi Keterlambatan
              </span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs font-semibold text-amber-300">
              Waktu presensi masuk untuk <strong>{lateName}</strong> telah melewati batas toleransi 15 menit. Harap isi alasan keterlambatan Anda.
            </div>

            <div className="space-y-1.5">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Alasan Terlambat (Wajib)
              </span>
              <textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Misalnya: macet di jalan, kendala kendaraan, dll..."
                rows={3}
                className="w-full rounded-xl border border-white/10 focus:ring-teal-500/10 focus:border-teal-500 bg-white/5 text-xs p-3 font-semibold text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReasonSubmit}
                disabled={!lateReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Kirim & Absen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom Sheet ─── */}
      <div className="absolute bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)] px-6 pb-8">
        {(state === "idle" || state === "scanning") && (
          <div className="text-center space-y-1 animate-fade-in">
            <p className="text-white text-sm font-semibold drop-shadow-lg">Arahkan kamera ke QR Code absensi</p>
            <p className="text-white/70 text-xs drop-shadow-lg">Tahan stabil selama 1 detik untuk memvalidasi</p>
          </div>
        )}
        {state === "detecting" && (
          <div className="text-center space-y-2 animate-fade-in">
            <p className="text-emerald-400 text-sm font-bold drop-shadow-lg">QR terdeteksi — tahan stabil...</p>
            <div className="h-1 w-52 bg-white/20 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${dwellProgress * 100}%` }} />
            </div>
          </div>
        )}
        {state === "verifying" && (
          <p className="text-white text-sm font-semibold text-center drop-shadow-lg">Memproses absensi ke server...</p>
        )}
        {state === "success" && (
          <p className="text-emerald-400 text-sm font-semibold text-center drop-shadow-lg animate-fade-in">Mengalihkan ke dashboard...</p>
        )}
        {state === "error" && (
          <p className="text-red-300 text-sm font-semibold text-center drop-shadow-lg animate-fade-in">Periksa koneksi lalu coba lagi</p>
        )}
        {state === "permission_denied" && (
          <p className="text-white/70 text-sm font-semibold text-center drop-shadow-lg animate-fade-in">Atau gunakan absensi manual</p>
        )}
      </div>

      {/* ─── CSS Animations ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        #qr-shaded-region {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        #qr-scanner-feed > div {
          background: transparent !important;
        }
        .scan-line {
          animation: scan-sweep 2s ease-in-out infinite;
        }
        @keyframes scan-sweep {
          0%, 100% { top: 4px; }
          50% { top: calc(100% - 4px); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-success-pop {
          animation: success-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes success-pop {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  )
}
