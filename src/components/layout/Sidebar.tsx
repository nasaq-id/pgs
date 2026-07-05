"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, GraduationCap, Building2, Settings, LogOut,
  BookUser, School, BookOpen, Monitor, ClipboardCheck, ChevronDown,
  Trophy, Megaphone, DoorOpen,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface MenuItem {
  icon: React.ElementType
  label: string
  path?: string
  allowedRoles?: ("super_admin" | "admin_sekolah" | "tu" | "guru" | "siswa" | "ortu")[]
  children?: {
    label: string
    path: string
    allowedRoles?: ("super_admin" | "admin_sekolah" | "tu" | "guru" | "siswa" | "ortu")[]
  }[]
}

const menuItems: MenuItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "Dashboard", 
    path: "/" 
  },
  { 
    icon: Building2, 
    label: "Lembaga", 
    path: "/lembaga",
    allowedRoles: ["super_admin", "admin_sekolah"]
  },
  { 
    icon: Users, 
    label: "Siswa", 
    path: "/manajemen/siswa",
    allowedRoles: ["super_admin", "admin_sekolah", "tu"]
  },
  { 
    icon: BookUser, 
    label: "Guru & Tendik", 
    path: "/manajemen/guru",
    allowedRoles: ["super_admin", "admin_sekolah", "tu"]
  },
  { 
    icon: School, 
    label: "Sarpras", 
    path: "/sarpras",
    allowedRoles: ["super_admin", "admin_sekolah", "tu"]
  },
  { 
    icon: BookOpen, 
    label: "Akademik", 
    path: "/akademik",
    allowedRoles: ["super_admin", "admin_sekolah", "tu"]
  },
  { 
    icon: Monitor, 
    label: "LMS", 
    allowedRoles: ["guru"],
    children: [
      { label: "Jurnal Mengajar", path: "/lms/jurnal" },
      { label: "Asesmen", path: "/lms/asesmen" },
    ]
  },
  { 
    icon: ClipboardCheck, 
    label: "Absensi", 
    children: [
      { label: "Absensi Harian", path: "/absensi" },
      { label: "Pengajuan Izin", path: "/absensi/izin" },
    ]
  },
  { 
    icon: ClipboardCheck, 
    label: "Buku Nilai", 
    path: "/evaluasi/buku-nilai",
    allowedRoles: ["super_admin", "admin_sekolah", "guru", "siswa", "ortu"]
  },
  { 
    icon: Trophy, 
    label: "Kesiswaan", 
    allowedRoles: ["super_admin", "admin_sekolah", "guru"],
    children: [
      { label: "Ekstrakurikuler", path: "/kesiswaan/ekstrakurikuler" },
      { label: "Prestasi", path: "/kesiswaan/prestasi" },
    ]
  },
  { 
    icon: DoorOpen, 
    label: "Sarana", 
    allowedRoles: ["super_admin", "admin_sekolah", "tu"],
    children: [
      { label: "Ruang Kelas", path: "/sarana/ruang-kelas" },
    ]
  },
  { 
    icon: Megaphone, 
    label: "Konten", 
    children: [
      { label: "Pengumuman", path: "/konten/pengumuman" },
    ]
  },
  { 
    icon: Building2, 
    label: "Keuangan", 
    path: "/keuangan/tagihan",
    allowedRoles: ["super_admin", "admin_sekolah", "tu", "siswa", "ortu"]
  },
  { 
    icon: Settings, 
    label: "Pengaturan", 
    allowedRoles: ["super_admin", "admin_sekolah"],
    children: [
      { label: "Umum", path: "/pengaturan" },
      { label: "Kalender Akademik", path: "/pengaturan/kalender" },
    ]
  },
]

interface SidebarProps { onClose?: () => void }

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role || "siswa"
  const [logoutOpen, setLogoutOpen] = useState(false)

  // Filter menu items based on role
  const visibleMenuItems = menuItems.filter(item => {
    if (item.allowedRoles && !item.allowedRoles.includes(role as any)) {
      return false
    }
    return true
  }).map(item => {
    if (item.children) {
      const visibleChildren = item.children.filter(child => {
        if (child.allowedRoles && !child.allowedRoles.includes(role as any)) {
          return false
        }
        return true
      })
      return { ...item, children: visibleChildren }
    }
    return item
  }).filter(item => {
    if (item.children && item.children.length === 0) {
      return false
    }
    return true
  })

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    visibleMenuItems.forEach(item => {
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
    <div className="flex h-full w-full flex-col glass-strong rounded-r-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-600/20 flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight truncate">SIM Sekolah</p>
          <p className="text-[10px] text-muted-foreground leading-tight tracking-wide uppercase">Sistem Informasi</p>
        </div>
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin">
        {visibleMenuItems.map((item) => {
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
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm glass-nav-item cursor-pointer",
                      isGroupActive
                        ? "text-foreground font-semibold bg-foreground/[0.06]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    isGroupActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>
                {isOpen && (
                  <div className="ml-4 pl-4 mt-1 mb-1.5 space-y-0.5 border-l-2 border-blue-200/60 dark:border-blue-500/20">
                    {item.children!.map(child => (
                      <Link
                        key={child.path}
                        href={child.path}
                        onClick={onClose}
                        className={cn(
                          "block px-3 py-1.5 rounded-lg text-[13px] transition-all duration-150",
                          isActive(child.path)
                            ? "glass-active font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
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
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm glass-nav-item",
                isItemActive
                  ? "glass-active font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                isItemActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground"
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="px-3 py-3">
        <button
          onClick={() => setLogoutOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground glass-nav-item hover:text-destructive group cursor-pointer"
        >
          <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/50 group-hover:bg-destructive/10 transition-all duration-200">
            <LogOut className="h-3.5 w-3.5" />
          </div>
          <span>Keluar</span>
        </button>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Keluar</DialogTitle>
            <DialogDescription>
              Apakah kamu yakin ingin keluar? Kamu akan kembali ke halaman login.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => { signOut(); setLogoutOpen(false) }}>
              Ya, Keluar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
