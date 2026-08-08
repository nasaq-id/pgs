"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, X, Smartphone } from "lucide-react"

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
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full p-5 rounded-2xl bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] neumo-card border border-teal-500/10 text-left shadow-2xl"
        >
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                  Install Aplikasi PGS
                </h4>
                <button
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isIos && !deferredPrompt ? (
                <>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                    Buka menu <strong>Bagikan (Share)</strong> di Safari, lalu pilih{" "}
                    <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> agar PGS bisa dibuka seperti aplikasi.
                  </p>
                  <button
                    onClick={handleDismiss}
                    className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-teal-500/5 transition-all cursor-pointer"
                  >
                    Mengerti
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                    Pasang PGS di perangkat Anda agar bisa diakses lebih cepat, kapan saja, seperti aplikasi.
                  </p>
                  <button
                    onClick={handleInstall}
                    disabled={installing}
                    className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-teal-500/5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {installing ? "Memproses..." : "Install Sekarang"}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
