"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Download, X, Smartphone, Share2, Zap, WifiOff } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function PWAProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    // 1. Daftarkan Service Worker (persyaratan installable PWA)
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("Service Worker gagal didaftarkan:", err))
    })

    // 2. Tangkap event install prompt (Chrome/Edge/Android)
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    const onAppInstalled = () => {
      setShowBanner(false)
      setDeferredPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    window.addEventListener("appinstalled", onAppInstalled)

    // 3. iOS Safari: tidak mendukung beforeinstallprompt — tampilkan panduan manual
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOSDevice && !standalone) {
      setIsIos(true)
      const timer = setTimeout(() => {
        // Tampilkan hanya jika belum pernah menutup (session)
        if (!sessionStorage.getItem("pgs-pwa-dismissed")) setShowBanner(true)
      }, 5000)
      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
      window.removeEventListener("appinstalled", onAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setShowBanner(false)
      }
    } catch (err) {
      console.warn("Gagal menampilkan prompt install:", err)
    } finally {
      setDeferredPrompt(null)
      setInstalling(false)
      setShowBanner(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    try {
      sessionStorage.setItem("pgs-pwa-dismissed", "1")
    } catch {}
  }

  return (
    <Dialog open={showBanner} onOpenChange={(v) => { if (!v) handleDismiss() }}>
      <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-teal-500" />
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
              Install Aplikasi PGS
            </h3>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt="PGS"
              className="w-16 h-16 rounded-2xl shadow-lg shadow-teal-500/10 border border-slate-200 dark:border-slate-800"
            />
            <div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">Portal Guna Sekolah</p>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                Pasang di perangkat Anda agar akses lebih cepat, seperti aplikasi.
              </p>
            </div>
          </div>

          {isIos && !deferredPrompt ? (
            <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-2xl p-4 text-xs font-semibold text-teal-800 dark:text-teal-300">
              <p className="font-bold flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" /> Panduan Install (iOS Safari)
              </p>
              <ol className="mt-2 space-y-1.5 list-decimal list-inside">
                <li>Buka menu <strong>Bagikan (Share)</strong> di Safari</li>
                <li>Pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong></li>
                <li>Klik <strong>Tambahkan</strong> — PGS siap dibuka seperti aplikasi</li>
              </ol>
            </div>
          ) : (
            <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-2xl p-4 text-xs font-semibold text-teal-800 dark:text-teal-300 space-y-2">
              <p className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 shrink-0" /> Buka lebih cepat langsung dari layar utama
              </p>
              <p className="flex items-center gap-2">
                <WifiOff className="h-3.5 w-3.5 shrink-0" /> Tetap bisa dipakai saat koneksi lemah
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={installing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-85"
          >
            {isIos && !deferredPrompt ? "Nanti Saja" : "Batal"}
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing || (isIos && !deferredPrompt)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 h-[38px]"
          >
            <Download className="h-4 w-4" />
            {installing ? "Memproses..." : "Install Sekarang"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
