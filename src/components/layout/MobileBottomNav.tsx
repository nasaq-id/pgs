"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Home, QrCode, ClipboardCheck, Bell, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

const QRScannerModal = dynamic(() => import("./QRScannerModal"), { ssr: false })

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [scannerOpen, setScannerOpen] = useState(false)

  const hapticFeedback = useCallback(() => {
    try {
      if (navigator.vibrate) navigator.vibrate(15)
    } catch {}
  }, [])

  const isHomeActive = pathname === "/"
  const isAbsensiActive = pathname === "/absensi" || pathname.startsWith("/absensi/")
  const isNotifikasiActive = pathname === "/notifikasi"
  const isJadwalActive = pathname === "/akademik/jadwal" || pathname.startsWith("/akademik/jadwal/")

  return (
    <>
      <div className="fixed left-3 right-3 z-30 lg:hidden" style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-3xl px-2 py-1.5 flex items-center justify-between neumo-card border border-white/40 dark:border-slate-800/40">
          
          {/* 1. BERANDA */}
          <Link
            href="/"
            onClick={hapticFeedback}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90",
              isHomeActive
                ? "neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] text-teal-600 dark:text-teal-400 font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-wide">Beranda</span>
          </Link>

          {/* 2. ABSENSI */}
          <Link
            href="/absensi"
            onClick={hapticFeedback}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90",
              isAbsensiActive
                ? "neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] text-teal-600 dark:text-teal-400 font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-wide">Absensi</span>
          </Link>

          {/* 3. QR SCANNER (CENTER) */}
          <button
            onClick={() => {
              hapticFeedback()
              setScannerOpen(true)
            }}
            className="relative -mt-6 h-13 w-13 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center active:scale-90 transition-all shadow-[0_0_15px_rgba(20,184,166,0.4)] border border-teal-400/20 z-10 hover:brightness-105"
            title="Scan Absensi"
          >
            <QrCode className="h-6 w-6 stroke-[2]" />
          </button>

          {/* 4. NOTIFIKASI */}
          <Link
            href="/notifikasi"
            onClick={hapticFeedback}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90",
              isNotifikasiActive
                ? "neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] text-teal-600 dark:text-teal-400 font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bell className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-wide">Notif</span>
          </Link>

          {/* 5. JADWAL PELAJARAN (pengganti tombol Menu — sidebar sudah bisa dibuka via toggle kiri atas) */}
          <Link
            href="/akademik/jadwal"
            onClick={hapticFeedback}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-90",
              isJadwalActive
                ? "neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] text-teal-600 dark:text-teal-400 font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[9px] font-black uppercase tracking-wide">Jadwal</span>
          </Link>

        </div>
      </div>
      {scannerOpen && <QRScannerModal open onClose={() => setScannerOpen(false)} />}
    </>
  )
}
