"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Play, ChevronRight, ChevronLeft, X, Sparkles, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  title: string
  content: string
  targetId?: string
}

const STEPS: Step[] = [
  {
    title: "Selamat Datang di PGS!",
    content: "Kami telah memperbarui sistem navigasi dan absensi sekolah. Ikuti tur singkat 1 menit ini untuk mengenal fitur dashboard Anda yang baru.",
  },
  {
    title: "Toggle Lebar Menu",
    content: "Tombol ini digunakan untuk melipat atau memperluas menu samping. Berguna untuk memberikan ruang kerja yang lebih luas saat Anda mengelola data.",
    targetId: "sidebar-toggle-tour",
  },
  {
    title: "Kalender Akademik",
    content: "Ketuk tanggal ini untuk membuka Kalender Sekolah secara instan. Anda dapat memantau hari libur, jadwal kegiatan, dan agenda penting lainnya.",
    targetId: "calendar-toggle-btn",
  },
  {
    title: "Profil & Menu Keluar",
    content: "Di sini Anda bisa mengakses profil pribadi atau keluar dari sistem secara aman melalui pop-up konfirmasi.",
    targetId: "profile-dropdown-tour",
  },
]

export default function DashboardTour() {
  const [active, setActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  // Check if tour should run automatically (only on first visit of dashboard)
  useEffect(() => {
    const isCompleted = localStorage.getItem("dashboard-tour-completed")
    if (!isCompleted) {
      const timer = setTimeout(() => {
        setActive(true)
      }, 1500) // Show after 1.5s page load for smooth entry
      return () => clearTimeout(timer)
    }
  }, [])

  const updateCoords = useCallback(() => {
    const step = STEPS[currentStep]
    if (!step?.targetId) {
      setCoords(null)
      return
    }
    const el = document.getElementById(step.targetId)
    if (el) {
      const rect = el.getBoundingClientRect()
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    } else {
      setCoords(null)
    }
  }, [currentStep])

  // Watch currentStep, resize, scroll, and poll at 30ms to follow transition animations smoothly
  useEffect(() => {
    if (!active) return

    updateCoords()
    
    const interval = setInterval(updateCoords, 30)

    window.addEventListener("resize", updateCoords)
    window.addEventListener("scroll", updateCoords, { capture: true })

    return () => {
      clearInterval(interval)
      window.removeEventListener("resize", updateCoords)
      window.removeEventListener("scroll", updateCoords, { capture: true })
    }
  }, [active, currentStep, updateCoords])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem("dashboard-tour-completed", "true")
    setActive(false)
    setCurrentStep(0)
  }

  const handleResetTour = () => {
    setCurrentStep(0)
    setActive(true)
  }

  if (!active) {
    // Show a small subtle help floating button on the screen to trigger the tour again if they want
    return (
      <button
        onClick={handleResetTour}
        className="fixed bottom-[6rem] right-6 lg:bottom-8 lg:right-8 z-40 h-10 w-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-teal-600 dark:text-teal-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md group cursor-pointer focus:outline-none"
        title="Ulangi Tur Dashboard"
      >
        <HelpCircle className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
      </button>
    )
  }

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1

  // Tooltip positioning
  let tooltipStyle: React.CSSProperties = {}
  if (coords) {
    const spacing = 12
    const tooltipWidth = 310
    const tooltipHeight = 180

    // Position vertically
    let top = coords.top + coords.height + spacing
    if (top + tooltipHeight > window.innerHeight) {
      top = coords.top - tooltipHeight - spacing
    }

    // Position horizontally
    let left = coords.left + (coords.width / 2) - (tooltipWidth / 2)
    if (left < 16) {
      left = 16
    } else if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16
    }

    tooltipStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 9999,
    }
  } else {
    // Centered modal
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "340px",
      zIndex: 9999,
    }
  }

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden select-none">
      {/* Background Masking Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-all duration-300" 
        onClick={handleComplete}
      />

      {/* Spotlight for target element */}
      {coords && (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.75)] border border-white/20 dark:border-slate-800/40 shadow-[0_0_15px_rgba(255,255,255,0.06)]"
          style={{
            top: coords.top - 4,
            left: coords.left - 4,
            width: coords.width + 8,
            height: coords.height + 8,
            zIndex: 9998,
          }}
        />
      )}

      {/* Tooltip Card (Hybrid Glassmorphic + Neomorphic Style) */}
      <div
        style={tooltipStyle}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl animate-in zoom-in-95 duration-200 text-left"
      >
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200/50 dark:border-teal-800/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                Langkah {currentStep + 1} dari {STEPS.length}
              </span>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight mt-0.5">{step.title}</h4>
            </div>
          </div>

          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-350 leading-relaxed">
            {step.content}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/30 dark:border-slate-800/20">
            <button
              onClick={handleComplete}
              className="text-[10px] font-black uppercase tracking-wider text-slate-450 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              Lewati
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 flex items-center justify-center gap-1 cursor-pointer transition-all text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Kembali</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="h-8 px-3 rounded-lg bg-teal-600 dark:bg-teal-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 shadow-sm hover:bg-teal-700 transition-all cursor-pointer"
              >
                <span>{isLastStep ? "Selesai" : "Lanjut"}</span>
                {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
