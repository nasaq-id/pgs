"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, GraduationCap, Building2, Settings, LogOut,
  BookUser, School, BookOpen, Monitor, ClipboardCheck, ChevronDown,
} from "lucide-react"

interface MenuItem {
  icon: React.ElementType
  label: string
  path?: string
  children?: { label: string; path: string }[]
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building2, label: "Lembaga", path: "/lembaga" },
  { icon: Users, label: "Siswa", path: "/manajemen/siswa" },
  { icon: BookUser, label: "Guru & Tendik", path: "/manajemen/guru" },
  { icon: School, label: "Kelas", path: "/manajemen/kelas" },
  { icon: BookOpen, label: "Akademik", path: "/akademik" },
  { icon: Monitor, label: "LMS", children: [
    { label: "Jurnal Mengajar", path: "/lms/jurnal" },
    { label: "Tugas", path: "/lms/tugas" },
  ]},
  { icon: ClipboardCheck, label: "Absensi", path: "/absensi" },
  { icon: ClipboardCheck, label: "Nilai", path: "/nilai" },
  { icon: ClipboardCheck, label: "Evaluasi", children: [
    { label: "Buku Nilai", path: "/evaluasi/buku-nilai" },
  ]},
  { icon: Building2, label: "Keuangan", path: "/keuangan/tagihan" },
  { icon: Settings, label: "Pengaturan", path: "/pengaturan" },
]

interface SidebarProps { onClose?: () => void }

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    menuItems.forEach(item => {
      if (item.children?.some(c => pathname.startsWith(c.path))) {
        init[item.label] = true
      }
    })
    return init
  })

  const toggle = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }))

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path))

  return (
    <div className="flex h-full w-full flex-col bg-card border-r border-border">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/50">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm flex-shrink-0">
          <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight truncate">SIM Sekolah</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Sistem Informasi</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const hasChildren = !!item.children
          const isOpen = expanded[item.label]
          const isGroupActive = hasChildren && item.children!.some(c => isActive(c.path))
          const isItemActive = item.path ? isActive(item.path) : false

          if (hasChildren) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                    isGroupActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="ml-4 pl-3.5 border-l border-border/60 mt-0.5 mb-1 space-y-0.5">
                    {item.children!.map(child => (
                      <Link
                        key={child.path}
                        href={child.path}
                        onClick={onClose}
                        className={cn(
                          "block px-3 py-1.5 rounded-md text-[13px] transition-all duration-150",
                          isActive(child.path)
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.path}
              href={item.path!}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                isItemActive
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-2.5 py-3 border-t border-border/50">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  )
}
