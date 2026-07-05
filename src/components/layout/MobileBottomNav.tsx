"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, QrCode, Menu, ClipboardCheck } from "lucide-react"
import QRScannerModal from "./QRScannerModal"

interface Props {
  onMenuClick: () => void
}

export default function MobileBottomNav({ onMenuClick }: Props) {
  const pathname = usePathname()
  const [scannerOpen, setScannerOpen] = useState(false)

  const hapticFeedback = useCallback(() => {
    try {
      if (navigator.vibrate) navigator.vibrate(15)
    } catch {}
  }, [])

  return (
    <>
      <div className="fixed left-3 right-3 z-50 lg:hidden" style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="glass-card rounded-3xl px-2 py-1.5 flex items-center justify-around shadow-xl shadow-black/10">
          <Link
            href="/"
            onClick={hapticFeedback}
            className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-90 ${
              pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wide">Beranda</span>
          </Link>

          <Link
            href="/absensi"
            onClick={hapticFeedback}
            className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-90 ${
              pathname === "/absensi" || pathname.startsWith("/absensi")
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wide">Absensi</span>
          </Link>

          <button
            onClick={() => {
              hapticFeedback()
              setScannerOpen(true)
            }}
            className="relative -mt-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform"
          >
            <QrCode className="h-6 w-6" />
          </button>

          <button
            onClick={() => {
              hapticFeedback()
              onMenuClick()
            }}
            className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-90 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wide">Menu</span>
          </button>
        </div>
      </div>
      <QRScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </>
  )
}
