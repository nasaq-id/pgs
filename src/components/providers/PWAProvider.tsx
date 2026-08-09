"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, X, Smartphone, Share2, Zap, WifiOff } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"

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
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed top-6 right-6 z-[9999] max-w-sm w-full p-5 rounded-2xl bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] neumo-card-clean border border-teal-500/10 text-left shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                Install Aplikasi PGS
              </h3>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Tutup"
                  />
                }
              >
                <X className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipPositioner side="bottom">
                  <TooltipPopup>Tutup</TooltipPopup>
                </TooltipPositioner>
              </TooltipPortal>
            </Tooltip>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 rounded-2xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] flex items-center justify-center shrink-0 p-2.5">
              <img
                src="/icon-192.png"
                alt="PGS"
                className="w-full h-full rounded-xl"
              />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">Portal Guna Sekolah</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold leading-relaxed">
                Pasang di perangkat Anda agar akses lebih cepat, seperti aplikasi.
              </p>
            </div>
          </div>

          {isIos && !deferredPrompt ? (
            <div className="neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] rounded-2xl p-4 mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <p className="font-bold flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                <Share2 className="h-3.5 w-3.5" /> Panduan Install (iOS Safari)
              </p>
              <ol className="mt-2 space-y-1.5 list-decimal list-inside">
                <li>Buka menu <strong>Bagikan (Share)</strong> di Safari</li>
                <li>Pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong></li>
                <li>Klik <strong>Tambahkan</strong> — PGS siap dibuka seperti aplikasi</li>
              </ol>
            </div>
          ) : (
            <div className="neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] rounded-2xl p-4 mt-4 text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-2.5">
              <p className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" /> Buka lebih cepat langsung dari layar utama
              </p>
              <p className="flex items-center gap-2">
                <WifiOff className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" /> Tetap bisa dipakai saat koneksi lemah
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-4">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleDismiss}
                    disabled={installing}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all disabled:opacity-85"
                  />
                }
              >
                {isIos && !deferredPrompt ? "Nanti Saja" : "Batal"}
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipPositioner side="top">
                  <TooltipPopup>{isIos && !deferredPrompt ? "Tutup dan tunda pemasangan" : "Batalkan pemasangan aplikasi"}</TooltipPopup>
                </TooltipPositioner>
              </TooltipPortal>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={installing || (isIos && !deferredPrompt)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border-0 rounded-xl hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
                  />
                }
              >
                <Download className="h-4 w-4" />
                {installing ? "Memproses..." : "Install Sekarang"}
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipPositioner side="top">
                  <TooltipPopup>{installing ? "Sedang memasang aplikasi..." : "Pasang aplikasi PGS ke perangkat"}</TooltipPopup>
                </TooltipPositioner>
              </TooltipPortal>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
