"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  LayoutDashboard, Users, GraduationCap, Building2, Settings,
  BookUser, School, BookOpen, Monitor, ClipboardCheck, ChevronDown, ChevronUp,
  Trophy, Megaphone, QrCode, Bell, Wallet, Compass, X, Shield, Activity, ScrollText, Database, Layers, LogOut
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/trpc/client"

interface MenuItem {
  icon: React.ElementType
  label: string
  path?: string
  allowedRoles?: ("super_admin" | "admin_sekolah" | "tu" | "guru" | "siswa" | "ortu" | "yayasan")[]
  children?: {
    label: string
    path: string
    allowedRoles?: ("super_admin" | "admin_sekolah" | "tu" | "guru" | "siswa" | "ortu" | "yayasan")[]
  }[]
}

const menuItems: MenuItem[] = [
  { 
    icon: LayoutDashboard, 
    label: "Dashboard", 
    path: "/" 
  },
  { 
    icon: Bell, 
    label: "Notifikasi", 
    path: "/notifikasi" 
  },
  { 
    icon: Building2, 
    label: "Lembaga", 
    allowedRoles: ["super_admin", "admin_sekolah"],
    children: [
      { label: "Profil Lembaga", path: "/lembaga" },
      { label: "Tahun Ajaran", path: "/lembaga/tahun-ajaran" },
    ]
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
    icon: QrCode, 
    label: "Cetak Kartu ID", 
    path: "/manajemen/id-card",
    allowedRoles: ["super_admin", "admin_sekolah", "tu"]
  },
  { 
    icon: GraduationCap, 
    label: "Rombongan Belajar", 
    path: "/manajemen/kelas",
    allowedRoles: ["super_admin", "admin_sekolah", "tu"]
  },
  { 
    icon: BookOpen, 
    label: "Akademik", 
    allowedRoles: ["super_admin", "admin_sekolah", "tu"],
    children: [
      { label: "Mata Pelajaran", path: "/akademik/mapel" },
      { label: "Jadwal Pelajaran", path: "/akademik/jadwal" },
    ]
  },
  { 
    icon: Monitor, 
    label: "LMS", 
    allowedRoles: ["super_admin", "admin_sekolah", "tu", "guru", "siswa"],
    children: [
      { label: "e-Materi", path: "/lms/e-materi", allowedRoles: ["super_admin", "admin_sekolah", "tu", "guru", "siswa"] },
      { label: "Jurnal Mengajar", path: "/lms/jurnal", allowedRoles: ["super_admin", "admin_sekolah", "tu", "guru"] },
      { label: "Asesmen", path: "/lms/asesmen", allowedRoles: ["super_admin", "admin_sekolah", "tu", "guru"] },
    ]
  },
  { 
    icon: ClipboardCheck, 
    label: "Presensi", 
    children: [
      { label: "Presensi Harian", path: "/absensi" },
      { label: "Presensi Guru", path: "/absensi/guru", allowedRoles: ["super_admin", "admin_sekolah", "tu", "guru"] },
      { label: "Pengajuan Izin", path: "/absensi/izin" },
      { label: "Rekap Presensi", path: "/absensi/rekap", allowedRoles: ["super_admin", "admin_sekolah", "tu", "guru"] },
      { label: "Pengaturan Presensi", path: "/absensi/pengaturan", allowedRoles: ["super_admin", "admin_sekolah"] },
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
    icon: Shield, 
    label: "E-Poin", 
    allowedRoles: ["super_admin", "admin_sekolah", "guru", "siswa", "ortu"],
    children: [
      { label: "Dashboard E-Poin", path: "/kesiswaan/poin-siswa" },
      { label: "Input & Data Poin", path: "/kesiswaan/poin-siswa/input-data", allowedRoles: ["super_admin", "admin_sekolah", "guru"] },
      { label: "Monitoring, SP & Apresiasi", path: "/kesiswaan/poin-siswa/monitoring-sp", allowedRoles: ["super_admin", "admin_sekolah", "guru"] },
      { label: "Pengaturan E-Poin", path: "/kesiswaan/poin-siswa/pengaturan", allowedRoles: ["super_admin", "admin_sekolah"] },
      { label: "SOP E-Poin", path: "/kesiswaan/poin-siswa/sop", allowedRoles: ["super_admin", "admin_sekolah", "guru"] },
    ]
  },
  { 
    icon: School, 
    label: "Sarana & Prasarana", 
    allowedRoles: ["super_admin", "admin_sekolah", "tu"],
    children: [
      { label: "Dashboard", path: "/sarpras" },
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
    icon: Wallet, 
    label: "Keuangan", 
    allowedRoles: ["super_admin", "admin_sekolah", "tu", "yayasan", "guru"],
    children: [
      { label: "Dashboard", path: "/keuangan" },
      { label: "Tagihan", path: "/keuangan/tagihan" },
      { label: "Generate Tagihan", path: "/keuangan/tagihan/generate" },
      { label: "Verifikasi", path: "/keuangan/verifikasi" },
      { label: "Diskon & Beasiswa", path: "/keuangan/diskon" },
      { label: "Laporan", path: "/keuangan/laporan" },
      { label: "Pengaturan", path: "/keuangan/pengaturan" },
    ]
  },
  { 
    icon: Settings, 
    label: "Pengaturan", 
    allowedRoles: ["super_admin", "admin_sekolah"],
    children: [
      { label: "Umum", path: "/pengaturan" },
      { label: "Kalender Akademik", path: "/pengaturan/kalender" },
      { label: "Poin", path: "/pengaturan/poin" },
    ]
  },
  {
    icon: Shield,
    label: "Super Admin",
    path: "/super-admin",
    allowedRoles: ["super_admin"]
  },
]

const SUPER_ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Daftar Lembaga",
    path: "/super-admin"
  },
  {
    icon: Activity,
    label: "Kesehatan Platform",
    path: "/super-admin/kesehatan"
  },
  {
    icon: ScrollText,
    label: "Log Audit Global",
    path: "/super-admin/log-audit"
  },
  {
    icon: Database,
    label: "Skema Database",
    path: "/super-admin/database"
  },
  {
    icon: Layers,
    label: "Kesehatan Codebase",
    path: "/super-admin/arsitektur"
  },
  {
    icon: Bell,
    label: "Notifikasi Sistem",
    path: "/notifikasi"
  }
]

interface SidebarProps {
  onClose?: () => void
  isMinimized?: boolean
  setIsMinimized?: (val: boolean) => void
}

function IosSwitch({ checked, onChange, title }: { checked: boolean; onChange: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "w-9 h-5 rounded-full relative transition-colors duration-300 outline-none cursor-pointer flex-shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]",
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-800"
      )}
      title={title}
    >
      <span
        className={cn(
          "w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-300",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

export default function Sidebar({ onClose, isMinimized = false, setIsMinimized }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role || "siswa"
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [impersonatedId, setImpersonatedId] = useState<string | null>(null)

  useEffect(() => {
    const getImpersonationCookie = () => {
      const match = document.cookie.match(/(?:^|; )impersonated_sekolah_id=([^;]*)/)
      return match ? match[1] : null
    }
    setImpersonatedId(getImpersonationCookie())
  }, [])

  // Fetch school information
  const { data: sekolahData } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: !!session,
  })

  // Fetch user profile
  const { data: profile } = api.profil.getProfile.useQuery(undefined, {
    enabled: !!session,
  })

  const displayName =
    (profile?.namaLengkap as string) ||
    (profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : null) ||
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "Admin"
  const initials = (displayName[0] || "A").toUpperCase()
  const userPhoto = (profile?.photo as string) || session?.user?.photo

  const isSuperAdmin = role === "super_admin"
  const isImpersonating = role === "super_admin" && !!impersonatedId
  const schoolName = isSuperAdmin && !isImpersonating ? "SaaS Platform" : (sekolahData?.namaSingkat || (sekolahData?.namaSekolah || "SIM Sekolah")
    .replace(/SMP Negeri/gi, "SMPN")
    .replace(/SMA Negeri/gi, "SMAN")
    .replace(/SMK Negeri/gi, "SMKN"))
  const nameParts = schoolName.split(" ")
  const prefix = nameParts[0] || "SIM"
  const mainName = nameParts.slice(1).join(" ") || "Sekolah"

  const userRoleLabel = (
    role === 'super_admin' ? 'Super Admin' :
    role === 'admin_sekolah' ? 'Admin Sekolah' :
    role === 'tu' ? 'Tata Usaha' :
    role === 'guru' ? 'Guru & Tendik' :
    role === 'siswa' ? 'Siswa' :
    role === 'ortu' ? 'Orang Tua' :
    role === 'yayasan' ? 'Yayasan' : 'User'
  );

  const activeItemsList = isSuperAdmin && !isImpersonating ? SUPER_ADMIN_MENU_ITEMS : menuItems

  // Filter menu items based on role
  const visibleMenuItems = activeItemsList.filter(item => {
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

  const toggle = (label: string) => {
    setExpanded(prev => {
      const next: Record<string, boolean> = {}
      if (!prev[label]) {
        next[label] = true
      }
      return next
    })
  }

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path))

  return (
    <div className="flex h-full w-full flex-col glass-strong rounded-r-[16px] overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Branding Section */}
      <div className={cn(
        "h-16 md:h-20 flex items-center px-5 justify-between border-b border-border/50 transition-all duration-300",
        isMinimized ? "lg:px-4 lg:justify-center" : "lg:px-5"
      )}>
        <div 
          className="flex items-center space-x-3 cursor-pointer select-none group"
          onClick={() => {
            if (isMinimized && setIsMinimized) {
              setIsMinimized(false)
            }
          }}
        >
          {/* Glowing Logo Icon */}
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transform group-hover:scale-105 transition-transform duration-300 overflow-hidden",
            isSuperAdmin
              ? "bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-md shadow-teal-500/20 text-white"
              : sekolahData?.logo 
                ? "bg-transparent" 
                : "bg-gradient-to-tr from-teal-500 to-emerald-400 shadow-md shadow-teal-500/20 text-white"
          )}>
            {isSuperAdmin ? (
              <Shield className="w-5 h-5 text-white stroke-[2.2]" />
            ) : sekolahData?.logo ? (
              <img 
                src={sekolahData.logo} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            ) : (
              <Compass className="w-5 h-5 animate-spin-slow stroke-[2]" />
            )}
          </div>

          {/* Logo Text */}
          {!isMinimized && (
            <div className="flex flex-col whitespace-nowrap logo-text animate-fade-in text-left">
              <span className="text-foreground font-extrabold text-[15px] leading-none tracking-tight flex items-center gap-1">
                {prefix} <span className="text-teal-600 dark:text-teal-400 font-extrabold">{mainName}</span>
              </span>
              <span className="text-muted-foreground text-[8px] font-bold tracking-[0.2em] mt-1 uppercase">
                {isSuperAdmin ? "SUPER ADMIN PORTAL" : "MANAGEMENT SYSTEM"}
              </span>
            </div>
          )}
        </div>

        {/* Close Button for Mobile */}
        {onClose && (
          <div className="lg:hidden">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-foreground/[0.06] text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>


      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const hasChildren = !!item.children
          const isOpen = expanded[item.label]
          const isGroupActive = hasChildren && item.children!.some(c => isActive(c.path))
          const isItemActive = item.path ? isActive(item.path) : false

          if (hasChildren) {
            if (isMinimized) {
              const firstChildPath = item.children![0]?.path
              return (
                <div key={item.label} className="relative group">
                  <Link
                    href={firstChildPath || "#"}
                    onClick={onClose}
                    className={cn(
                      "relative flex items-center px-0 py-2 rounded-xl cursor-pointer select-none transition-all duration-200 justify-center border border-transparent",
                      isGroupActive
                        ? "text-teal-655 dark:text-teal-405 border-0 font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                    )}
                  >
                    {isGroupActive && (
                      <motion.div
                        layoutId="activeSidebarIndicator"
                        className="absolute inset-0 neumo-inset bg-[oklch(0.95_0.01_250)] dark:bg-[oklch(0.15_0.01_250)] rounded-xl border border-teal-500/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {isGroupActive && (
                      <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-teal-500 rounded-r-full z-10" />
                    )}
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 z-10",
                      isGroupActive
                        ? "bg-teal-100/60 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-105" />
                    </div>
                  </Link>

                  {/* Floating child sub-menu tooltip for minimized group items */}
                  <div className="absolute left-full top-0 ml-2 py-2 w-48 bg-card border border-border shadow-xl rounded-xl opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-200 z-50 text-left">
                    <div className="px-3 py-1.5 text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest border-b border-border/50 mb-1.5">
                      {item.label}
                    </div>
                    <div className="space-y-0.5 px-1.5">
                      {item.children!.map(child => (
                        <Link
                          key={child.path}
                          href={child.path}
                          onClick={onClose}
                          className={cn(
                            "flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all text-left",
                            isActive(child.path)
                              ? "neumo-inset bg-[oklch(0.95_0.01_250)] dark:bg-[oklch(0.15_0.01_250)] text-teal-650 dark:text-teal-400 border-0"
                              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                          )}
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full mr-2 transition-all",
                            isActive(child.path)
                              ? "bg-teal-500 scale-125 shadow-[0_0_8px_rgba(20,184,166,0.6)]"
                              : "bg-muted-foreground/40"
                          )} />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className={cn(
                    "w-full relative flex items-center gap-2.5 px-4 py-2 mx-3 rounded-xl text-[13px] cursor-pointer border transition-all duration-200",
                    isGroupActive
                      ? "text-teal-650 dark:text-teal-400 border-transparent font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] border-transparent"
                  )}
                >
                  {isGroupActive && (
                    <motion.div
                      layoutId="activeSidebarIndicator"
                      className="absolute inset-0 neumo-inset bg-[oklch(0.95_0.01_250)] dark:bg-[oklch(0.15_0.01_250)] rounded-xl border border-teal-500/20"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {isGroupActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-teal-500 rounded-r-full z-10" />
                  )}
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 z-10",
                    isGroupActive
                      ? "bg-teal-100/60 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left truncate ml-1 z-10">{item.label}</span>
                  {isOpen ? (
                    <ChevronUp className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isGroupActive ? "text-teal-700 dark:text-teal-400" : "text-muted-foreground"
                    )} />
                  ) : (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isGroupActive ? "text-teal-700 dark:text-teal-400" : "text-muted-foreground"
                    )} />
                  )}
                </button>
                {isOpen && (
                  <div className="mx-7 pl-4 mt-0.5 mb-1 space-y-0.5 border-l border-slate-100 dark:border-slate-800">
                    {item.children!.map(child => (
                      <Link
                        key={child.path}
                        href={child.path}
                        onClick={onClose}
                        className={cn(
                          "relative flex items-center px-3 py-1 rounded-lg cursor-pointer select-none text-[12px] transition-all duration-150",
                          isActive(child.path)
                            ? "text-teal-650 dark:text-teal-400 font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                        )}
                      >
                        {isActive(child.path) && (
                          <motion.div
                            layoutId="activeSubSidebarIndicator"
                            className="absolute inset-0 neumo-inset bg-[oklch(0.95_0.01_250)] dark:bg-[oklch(0.15_0.01_250)] rounded-lg"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mr-2 transition-all z-10",
                          isActive(child.path)
                            ? "bg-teal-500 scale-125 shadow-[0_0_8px_rgba(20,184,166,0.6)]"
                            : "bg-muted-foreground/40"
                        )} />
                        <span className="z-10">{child.label}</span>
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
                "relative flex items-center px-4 py-2 mx-3 rounded-xl cursor-pointer select-none group transition-all duration-200 border text-[13px]",
                isMinimized ? "lg:justify-center lg:px-0 lg:mx-0" : "justify-start",
                isItemActive
                  ? "text-teal-650 dark:text-teal-400 border-transparent font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] border-transparent"
              )}
            >
              {isItemActive && (
                <motion.div
                  layoutId="activeSidebarIndicator"
                  className="absolute inset-0 neumo-inset bg-[oklch(0.95_0.01_250)] dark:bg-[oklch(0.15_0.01_250)] rounded-xl border border-teal-500/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {isItemActive && !isMinimized && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-teal-500 rounded-r-full z-10" />
              )}
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 z-10",
                isItemActive
                  ? "bg-teal-100/60 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                  : "bg-muted/50 text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={cn(
                "transition-all duration-300 overflow-hidden truncate z-10",
                isMinimized ? "max-w-0 opacity-0 ml-0" : "max-w-xs opacity-100 ml-1.5"
              )}>
                {item.label}
              </span>

              {/* Hover tooltip when minimized */}
              {isMinimized && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-950 dark:bg-slate-900 text-white text-[10px] font-black tracking-wider uppercase rounded-lg shadow-xl opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-50 border border-slate-850">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Profile Section */}
      <div className={cn(
        "p-3.5 border-t border-border/50 bg-background/30 backdrop-blur-md transition-all duration-300",
        isMinimized ? "flex flex-col items-center justify-center gap-1.5" : "flex items-center justify-between",
        "pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] lg:pb-3.5"
      )}>
        {isMinimized ? (
          <>
            <span id="sidebar-toggle-tour">
              {setIsMinimized && (
                <IosSwitch
                  checked={!isMinimized}
                  onChange={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? "Tampilkan Menu" : "Sembunyikan Menu"}
                />
              )}
            </span>
            <div className="relative group">
              <Link
                href="/profil"
                title={`Profil Saya (${displayName})`}
                className="w-10 h-10 rounded-xl overflow-hidden bg-muted/50 flex items-center justify-center cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950/20 text-muted-foreground hover:text-teal-600 transition-all duration-200 border border-transparent hover:border-teal-200/30"
              >
                {userPhoto ? (
                  <img src={userPhoto} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-xs uppercase">{initials}</span>
                )}
              </Link>
              {/* Hover tooltip when minimized */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-950 dark:bg-slate-900 text-white text-[10px] font-black tracking-wider uppercase rounded-lg shadow-xl opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-50 border border-slate-850">
                Profil Saya
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-all duration-200 border border-transparent"
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full gap-2.5">
            <Link
              href="/profil"
              title="Profil Saya"
              className="flex items-center gap-2.5 min-w-0 flex-1 rounded-xl px-1.5 py-1 -mx-1.5 transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer"
            >
              {userPhoto ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <img src={userPhoto} alt={displayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-9 h-9 bg-teal-100 dark:bg-teal-950/60 rounded-xl flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-xs shadow-sm border border-slate-100 dark:border-slate-800 uppercase flex-shrink-0">
                  <span>{initials}</span>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-black text-foreground leading-none truncate">
                  {displayName}
                </span>
                <span className="text-[9px] text-muted-foreground font-extrabold tracking-wider leading-none capitalize mt-1.5">
                  {userRoleLabel}
                </span>
              </div>
            </Link>

            <span id="sidebar-toggle-tour">
              {setIsMinimized && (
                <IosSwitch
                  checked={!isMinimized}
                  onChange={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? "Tampilkan Menu" : "Sembunyikan Menu"}
                />
              )}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLogoutOpen(true)}
              className="h-8 w-8 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer flex-shrink-0"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Dialog Konfirmasi Keluar */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
          <DialogHeader className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30 flex items-center justify-center text-red-500 mx-auto">
              <LogOut className="w-6 h-6 stroke-[2.5]" />
            </div>
            <DialogTitle className="text-base font-black text-slate-800 dark:text-slate-100">Konfirmasi Keluar</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold">
              Apakah Anda yakin ingin keluar dari sistem presensi dan manajemen PGS ini?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3.5 mt-6">
            <button
              onClick={() => setLogoutOpen(false)}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs transition-all active:scale-95 cursor-pointer text-center border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all active:scale-95 cursor-pointer text-center shadow-sm"
            >
              Keluar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
