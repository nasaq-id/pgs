"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, CheckCircle2, ShieldAlert, Loader2, Scan, QrCode } from "lucide-react"
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

interface Props {
  open: boolean
  onClose: () => void
}

export default function QRScannerModal({ open, onClose }: Props) {
  const [scanResult, setScanResult] = useState<{
    success: boolean
    name?: string
    action?: string
    status?: string
    message: string
  } | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const html5QrcodeRef = useRef<any>(null)
  const barcodeScanMutation = api.absensi.absenViaBarcode.useMutation()

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
        navigator.vibrate(type === "success" ? [40, 30, 40] : [80, 40, 80])
      }
    } catch {}
  }, [])

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      try {
        hapticFeedback("success")
        const result = await barcodeScanMutation.mutateAsync({ barcode: decodedText })
        playSound("success")
        setScanResult({
          success: true,
          name: result.name,
          action: result.action === "masuk" ? "MASUK" : "PULANG",
          status: STATUS_LABELS[result.status as StatusAbsensi],
          message: `${result.name} — ${result.action === "masuk" ? "Masuk" : "Pulang"} (${STATUS_LABELS[result.status as StatusAbsensi]})`,
        })
        setTimeout(() => onClose(), 2000)
      } catch (err: any) {
        hapticFeedback("error")
        playSound("error")
        setScanResult({
          success: false,
          message: err.message || "Gagal memproses absensi",
        })
      }
    },
    [barcodeScanMutation, onClose, playSound, hapticFeedback],
  )

  useEffect(() => {
    if (!open) {
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().then(() => html5QrcodeRef.current.clear())
          }
        } catch {}
      }
      html5QrcodeRef.current = null
      setScanResult(null)
      setCameraReady(false)
      return
    }

    const timer = setTimeout(() => {
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        const scanner = new Html5Qrcode("mobile-qr-reader")
        html5QrcodeRef.current = scanner
        scanner
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
              handleScanSuccess(decodedText)
            },
            () => {},
          )
          .then(() => setCameraReady(true))
          .catch((err: any) => {
            console.error("Camera start failed:", err)
            toast.error("Gagal mengaktifkan kamera")
          })
      })
    }, 500)

    return () => {
      clearTimeout(timer)
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            html5QrcodeRef.current.stop().then(() => html5QrcodeRef.current.clear())
          }
        } catch {}
      }
    }
  }, [open, handleScanSuccess])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-white" />
            <h3 className="text-white font-bold text-base">Scan QR Absensi</h3>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden bg-black shadow-2xl shadow-black/50">
            {!cameraReady && !scanResult && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              </div>
            )}

            <div id="mobile-qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

            {!scanResult && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-52 h-52">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-xl" />
                </div>
              </div>
            )}

            {scanResult && !scanResult.success && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                <button
                  onClick={() => {
                    setScanResult(null)
                    setCameraReady(false)
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-sm active:scale-95 transition-transform"
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-4">
          {scanResult ? (
            <div className="glass rounded-2xl p-4 animate-in fade-in duration-200">
              {scanResult.success ? (
                <div className="text-center space-y-1.5">
                  <div className="h-12 w-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <p className="text-white font-bold text-lg">{scanResult.name}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      {scanResult.action}
                    </span>
                    <span className="text-[11px] font-bold text-white/70">{scanResult.status}</span>
                  </div>
                  <p className="text-white/50 text-xs">{scanResult.message}</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="h-12 w-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="h-6 w-6 text-red-400" />
                  </div>
                  <p className="text-red-300 text-sm font-medium">{scanResult.message}</p>
                  <button
                    onClick={() => {
                      setScanResult(null)
                      setCameraReady(false)
                    }}
                    className="text-sm text-blue-400 font-semibold active:scale-95 transition-transform"
                  >
                    Ketuk untuk mencoba lagi
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-1">
              <Scan className="h-5 w-5 text-white/30 mx-auto" />
              <p className="text-white/40 text-xs">Arahkan kamera ke QR Code siswa atau guru</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
