"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, CheckCircle2, ShieldAlert, Loader2, Scan, QrCode } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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

type ScannerState = "idle" | "scanning" | "processing" | "success" | "error" | "cooldown"

interface Props {
  open: boolean
  onClose: () => void
}

export default function QRScannerModal({ open, onClose }: Props) {
  const [state, setState] = useState<ScannerState>("idle")
  const [cameraReady, setCameraReady] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    name?: string
    action?: string
    status?: string
    message: string
  } | null>(null)

  const [lateDialogOpen, setLateDialogOpen] = useState(false)
  const [lateData, setLateData] = useState<{
    barcode: string
    latitude: number | null
    longitude: number | null
    name: string
  } | null>(null)
  const [lateReason, setLateReason] = useState("")
  const [submittingLateReason, setSubmittingLateReason] = useState(false)

  const html5QrcodeRef = useRef<any>(null)
  const stateRef = useRef<ScannerState>("idle")
  const processingLockRef = useRef(false)
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const cooldownEndTimerRef = useRef<NodeJS.Timeout | null>(null)
  const resultTimerRef = useRef<NodeJS.Timeout | null>(null)

  const barcodeScanMutation = api.absensi.absenViaBarcode.useMutation()
  const guruScanMutation = api.absensi.scanSingleQrGuru.useMutation()

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

  const getGeolocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) return null
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }, [])

  const stopScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop()
        }
      } catch {}
      try {
        html5QrcodeRef.current.clear()
      } catch {}
      html5QrcodeRef.current = null
    }
  }, [])

  const startCooldown = useCallback(() => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
    if (cooldownEndTimerRef.current) clearTimeout(cooldownEndTimerRef.current)

    setState("cooldown")

    cooldownTimerRef.current = setTimeout(() => {
      processingLockRef.current = false
      setState("scanning")
      setCameraReady(true)

      cooldownEndTimerRef.current = setTimeout(() => {
        if (stateRef.current === "scanning") {
          try {
            if (html5QrcodeRef.current?.isScanning) {
              html5QrcodeRef.current.stop().then(() => {
                html5QrcodeRef.current?.start(
                  { facingMode: "environment" },
                  { fps: 10, qrbox: { width: 250, height: 250 } },
                  () => {},
                  () => {},
                )
              })
            }
          } catch {}
        }
      }, 100)
    }, 2500)
  }, [])

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (processingLockRef.current || stateRef.current !== "scanning") return
      processingLockRef.current = true

      setState("processing")

      await stopScanner()

      try {
        const coords = await getGeolocation()

        const isGuruQr = decodedText.startsWith("PGS-PRESENSI-GURU-")
        let resultData: any
        if (isGuruQr) {
          resultData = await guruScanMutation.mutateAsync({ qrCode: decodedText })
        } else {
          resultData = await barcodeScanMutation.mutateAsync({
            barcode: decodedText,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
          })
        }

        if (resultData.requireReason) {
          setLateData({
            barcode: decodedText,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
            name: resultData.name ?? "",
          })
          setLateReason("")
          setLateDialogOpen(true)
          playSound("error")
          hapticFeedback("error")
          toast.warning("Terlambat: Harap masukkan alasan keterlambatan.")
          return
        }

        playSound("success")
        hapticFeedback("success")

        const res = {
          success: true,
          name: resultData.name,
          action: resultData.action === "masuk" ? "MASUK" : "PULANG",
          status: STATUS_LABELS[resultData.status as StatusAbsensi] || resultData.status,
          message: `${resultData.name} — ${resultData.action === "masuk" ? "Masuk" : "Pulang"} (${STATUS_LABELS[resultData.status as StatusAbsensi] || resultData.status})`,
        }
        setResult(res)
        setState("success")

        resultTimerRef.current = setTimeout(() => {
          startCooldown()
        }, 3000)
      } catch (err: any) {
        playSound("error")
        hapticFeedback("error")

        const res = {
          success: false,
          message: err.message || "Gagal memproses absensi",
        }
        setResult(res)
        setState("error")

        resultTimerRef.current = setTimeout(() => {
          startCooldown()
        }, 3000)
      }
    },
    [barcodeScanMutation, guruScanMutation, stopScanner, playSound, hapticFeedback, startCooldown, getGeolocation],
  )

  const handleLateReasonSubmit = useCallback(async () => {
    if (!lateData || !lateReason.trim()) return
    setSubmittingLateReason(true)
    try {
      const result = await barcodeScanMutation.mutateAsync({
        barcode: lateData.barcode,
        latitude: lateData.latitude,
        longitude: lateData.longitude,
        alasan: lateReason.trim(),
      }) as any
      playSound("success")
      hapticFeedback("success")
      setLateDialogOpen(false)
      setLateData(null)
      setLateReason("")

      const res = {
        success: true,
        name: result.name,
        action: result.action === "masuk" ? "MASUK" : "PULANG",
        status: STATUS_LABELS[result.status as StatusAbsensi],
        message: `Absensi Masuk untuk ${result.name} berhasil dicatat dengan status ${STATUS_LABELS[result.status as StatusAbsensi]}. Alasan: ${lateReason.trim()}`,
      }
      setResult(res)
      setState("success")
      toast.success(`Scan Berhasil: ${result.name} (Masuk - Terlambat)`)

      resultTimerRef.current = setTimeout(() => {
        startCooldown()
      }, 3000)
    } catch (err: any) {
      playSound("error")
      hapticFeedback("error")
      setLateDialogOpen(false)
      setLateData(null)
      setLateReason("")

      const res = {
        success: false,
        message: err.message || "Gagal mengirimkan alasan terlambat",
      }
      setResult(res)
      setState("error")
      toast.error(err.message || "Gagal Kirim Alasan")

      resultTimerRef.current = setTimeout(() => {
        startCooldown()
      }, 3000)
    } finally {
      setSubmittingLateReason(false)
    }
  }, [lateData, lateReason, barcodeScanMutation, playSound, hapticFeedback, startCooldown])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!open) {
      stopScanner()
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      if (cooldownEndTimerRef.current) clearTimeout(cooldownEndTimerRef.current)
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current)

      setState("idle")
      setResult(null)
      setCameraReady(false)
      setLateDialogOpen(false)
      setLateData(null)
      setLateReason("")
      processingLockRef.current = false
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
          .then(() => {
            setCameraReady(true)
            setState("scanning")
          })
          .catch((err: any) => {
            console.error("Camera start failed:", err)
            setState("idle")
          })
      })
    }, 500)

    return () => {
      clearTimeout(timer)
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      if (cooldownEndTimerRef.current) clearTimeout(cooldownEndTimerRef.current)
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
      stopScanner()
    }
  }, [open])

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
            {!cameraReady && state === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              </div>
            )}

            <div id="mobile-qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />

            {state === "scanning" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="relative w-52 h-52">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-xl" />
                </div>
              </div>
            )}

            {state === "processing" && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
                <p className="text-white text-sm font-bold">Memverifikasi absensi...</p>
              </div>
            )}

            {(state === "success" || state === "error") && result && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                <div className="text-center px-4 space-y-3">
                  {result.success ? (
                    <>
                      <div className="h-14 w-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                      </div>
                      <p className="text-white font-bold text-lg">{result.name}</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          {result.action}
                        </span>
                        <span className="text-[11px] font-bold text-white/70">{result.status}</span>
                      </div>
                      <p className="text-white/50 text-xs">{result.message}</p>
                    </>
                  ) : (
                    <>
                      <div className="h-14 w-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                        <ShieldAlert className="h-8 w-8 text-red-400" />
                      </div>
                      <p className="text-red-300 text-sm font-medium">{result.message}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {state === "cooldown" && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <div className="text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-white/50 mx-auto" />
                  <p className="text-white/50 text-xs font-semibold">Menyiapkan kamera...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-4">
          {state === "scanning" && (
            <div className="text-center space-y-1">
              <Scan className="h-5 w-5 text-white/30 mx-auto" />
              <p className="text-white/40 text-xs">Arahkan kamera ke QR Code siswa atau guru</p>
            </div>
          )}
          {state === "processing" && (
            <div className="text-center">
              <p className="text-white/50 text-xs font-semibold">Harap tunggu, sedang memproses...</p>
            </div>
          )}
          {(state === "success" || state === "error") && (
            <div className="text-center">
              <p className="text-white/50 text-xs font-semibold">
                {state === "success" ? "Absensi berhasil dicatat" : "Terjadi kesalahan"}
              </p>
            </div>
          )}
          {state === "cooldown" && (
            <div className="text-center">
              <p className="text-white/50 text-xs font-semibold">Menyiapkan kamera...</p>
            </div>
          )}
          {state === "idle" && (
            <div className="text-center space-y-1">
              <Scan className="h-5 w-5 text-white/30 mx-auto" />
              <p className="text-white/40 text-xs">Memuat kamera...</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={lateDialogOpen} onOpenChange={(v) => { if (!v) { setLateDialogOpen(false); setLateData(null); } }}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                Konfirmasi Keterlambatan
              </h3>
            </div>
            <button
              type="button"
              onClick={() => { setLateDialogOpen(false); setLateData(null); }}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <p className="font-bold">Perhatian:</p>
              <p className="mt-1">
                Waktu pemindaian absensi masuk untuk <strong>{lateData?.name}</strong> telah melewati batas toleransi keterlambatan. Anda wajib mengisi alasan keterlambatan untuk mencatat kehadiran ini.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                Alasan Terlambat (Wajib)
              </Label>
              <textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Masukkan alasan keterlambatan (misalnya: macet di jalan, kendala kendaraan, dll)..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 dark:bg-slate-900/50 text-xs p-3 font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
            <button
              type="button"
              onClick={() => { setLateDialogOpen(false); setLateData(null); }}
              disabled={submittingLateReason}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-85"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleLateReasonSubmit}
              disabled={submittingLateReason || !lateReason.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 h-[38px]"
            >
              {submittingLateReason && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              <span>Kirim & Absen</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
