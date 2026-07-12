"use client"

import { useState } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import MobileBottomNav from "./MobileBottomNav"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <div className="min-h-screen">
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:flex-col lg:p-2 lg:py-2 transition-all duration-300 ease-in-out",
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
          <div className="fixed inset-y-0 left-0 z-50 w-[308px] p-2 py-2 lg:hidden animate-in slide-in-from-left duration-300">
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
