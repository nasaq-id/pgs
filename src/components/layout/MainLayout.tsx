"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import MobileBottomNav from "./MobileBottomNav"
import DashboardTour from "./DashboardTour"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { ShieldAlert, LogOut } from "lucide-react"

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/notifikasi": "Notifikasi",
  "/lembaga": "Profil Lembaga",
  "/lembaga/tahun-ajaran": "Tahun Ajaran",
  "/manajemen/siswa": "Manajemen Siswa",
  "/manajemen/guru": "Manajemen Guru & Tendik",
  "/manajemen/id-card": "Cetak Kartu ID",
  "/manajemen/kelas": "Rombongan Belajar",
  "/sarpras": "Sarana & Prasarana",
  "/akademik": "Akademik",
  "/akademik/jadwal": "Jadwal Pelajaran",
  "/akademik/mapel": "Mata Pelajaran",
  "/lms/e-materi": "e-Materi LMS",
  "/lms/jurnal": "Jurnal Mengajar",
  "/lms/asesmen": "Asesmen LMS",
  "/absensi": "Presensi Harian",
  "/absensi/guru": "Presensi Guru",
  "/absensi/izin": "Pengajuan Izin",
  "/absensi/rekap": "Rekap Presensi",
  "/evaluasi/buku-nilai": "Buku Nilai",
  "/kesiswaan/ekstrakurikuler": "Ekstrakurikuler",
  "/kesiswaan/prestasi": "Prestasi Siswa",
  "/kesiswaan/poin-siswa": "Poin Siswa",
  "/kesiswaan/monitoring-poin": "Monitoring Poin",
  "/kesiswaan/laporan-poin": "Laporan Poin",
  "/sarana/ruang-kelas": "Ruang Kelas",
  "/konten/pengumuman": "Pengumuman",
  "/keuangan": "Dashboard Keuangan",
  "/keuangan/tagihan": "Tagihan Keuangan",
  "/keuangan/tagihan/generate": "Generate Tagihan",
  "/keuangan/verifikasi": "Verifikasi Keuangan",
  "/keuangan/diskon": "Diskon & Beasiswa",
  "/keuangan/laporan": "Laporan Keuangan",
  "/keuangan/pengaturan": "Pengaturan Keuangan",
  "/pengaturan": "Pengaturan Umum",
  "/pengaturan/kalender": "Kalender Akademik",
  "/pengaturan/poin": "Pengaturan Poin",
  "/profil": "Profil Saya",
  "/super-admin": "Super Admin",
}

const getPageTitle = (pathname: string): string => {
  if (routeTitles[pathname]) return routeTitles[pathname]
  
  if (pathname.startsWith("/keuangan/tagihan/")) {
    return "Detail Tagihan Siswa"
  }
  
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1]
    return lastPart
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
  }
  
  return "Dashboard"
}

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  const { data: session } = useSession()
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  const pageTitle = getPageTitle(pathname)

  useEffect(() => {
    const getImpersonationCookie = () => {
      const match = document.cookie.match(/(?:^|; )impersonated_sekolah_id=([^;]*)/)
      return match ? match[1] : null
    }
    setImpersonatedId(getImpersonationCookie())
  }, [])

  const { data: sekolahInfo } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: session?.user?.role === "super_admin" && !!impersonatedId,
  })

  const handleExitImpersonate = () => {
    document.cookie = "impersonated_sekolah_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    window.location.href = "/super-admin"
  }

  const isImpersonating = session?.user?.role === "super_admin" && !!impersonatedId

  return (
    <div className={cn("min-h-screen relative", isImpersonating && "pt-11")}>
      <title>{pageTitle}</title>
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 h-11 bg-amber-500 dark:bg-amber-600 text-white z-[100] flex items-center justify-between px-4 sm:px-6 shadow-md select-none animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 animate-pulse text-amber-100" />
            <span className="text-xs font-black uppercase tracking-wider">
              Mode Superadmin: <span className="font-extrabold normal-case bg-amber-600 dark:bg-amber-700/80 px-2.5 py-0.5 rounded-lg border border-amber-400/40 ml-1">{sekolahInfo?.namaSekolah || "Memuat..."}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleExitImpersonate}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm cursor-pointer active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Mode</span>
          </button>
        </div>
      )}

      <motion.div
        animate={{ width: isDesktop ? (isMinimized ? 80 : 308) : 308 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "hidden lg:fixed lg:left-0 lg:z-50 lg:flex lg:flex-col lg:p-2 lg:py-2 overflow-hidden",
          isImpersonating ? "lg:top-11 lg:bottom-0" : "lg:inset-y-0",
          isMinimized ? "sidebar-minimized" : ""
        )}
      >
        <Sidebar isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      </motion.div>
 
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden glass-overlay"
            onClick={() => setSidebarOpen(false)}
          />
          <div className={cn(
            "fixed left-0 z-50 w-[308px] p-2 py-2 lg:hidden animate-in slide-in-from-left duration-300",
            isImpersonating ? "top-11 bottom-0" : "inset-y-0"
          )}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <motion.div
        animate={{ paddingLeft: isDesktop ? (isMinimized ? 80 : 298) : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full flex-grow flex flex-col"
      >
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          isMinimized={isMinimized}
          setIsMinimized={setIsMinimized}
        />
        <main className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto pb-20 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      {pathname === "/" && <DashboardTour />}
      <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  )
}
