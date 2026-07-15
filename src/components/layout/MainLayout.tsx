"use client"

import { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import MobileBottomNav from "./MobileBottomNav"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { ShieldAlert, LogOut } from "lucide-react"

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  
  const { data: session } = useSession()
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null)

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

      <div className={cn(
        "hidden lg:fixed lg:left-0 lg:z-50 lg:flex lg:flex-col lg:p-2 lg:py-2 transition-all duration-300 ease-in-out",
        isImpersonating ? "lg:top-11 lg:bottom-0" : "lg:inset-y-0",
        isMinimized ? "lg:w-20 sidebar-minimized" : "lg:w-[308px]"
      )}>
        <Sidebar isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      </div>
 
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

      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isMinimized ? "lg:pl-20" : "lg:pl-[298px]"
      )}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
    </div>
  )
}
