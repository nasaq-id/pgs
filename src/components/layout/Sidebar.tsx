"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, GraduationCap, Building2, Settings, LogOut,
  BookUser, School, BookOpen, Monitor, ClipboardCheck, ChevronDown, ChevronUp,
  Trophy, Megaphone, DoorOpen, QrCode, Bell, Wallet, Compass, X, CalendarDays
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
      { label: "Kurikulum", path: "/lembaga/kurikulum" },
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
    allowedRoles: ["super_admin", "admin_sekolah", "tu", "guru"],
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
      { label: "Poin Siswa", path: "/kesiswaan/poin-siswa" },
      { label: "Monitoring Poin", path: "/kesiswaan/monitoring-poin" },
      { label: "Laporan Poin", path: "/kesiswaan/laporan-poin" },
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
]

interface SidebarProps {
  onClose?: () => void
  isMinimized?: boolean
  setIsMinimized?: (val: boolean) => void
}

export default function Sidebar({ onClose, isMinimized = false, setIsMinimized }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role || "siswa"
  const [logoutOpen, setLogoutOpen] = useState(false)

  // Fetch school information
  const { data: sekolahData } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: !!session,
  })

  // Fetch active academic year
  const { data: activeTa } = api.lembaga.getActiveTahunAjaran.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30000,
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

  const schoolName = (sekolahData?.namaSekolah || "SIM Sekolah")
    .replace(/SMP Negeri/gi, "SMPN")
    .replace(/SMA Negeri/gi, "SMAN")
    .replace(/SMK Negeri/gi, "SMKN")
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20 text-white flex-shrink-0 transform group-hover:scale-105 transition-transform duration-300">
            <Compass className="w-5 h-5 animate-spin-slow stroke-[2]" />
          </div>

          {/* Logo Text */}
          {!isMinimized && (
            <div className="flex flex-col whitespace-nowrap logo-text animate-fade-in text-left">
              <span className="text-foreground font-extrabold text-[15px] leading-none tracking-tight flex items-center gap-1">
                {prefix} <span className="text-teal-600 dark:text-teal-400 font-extrabold">{mainName}</span>
              </span>
              <span className="text-muted-foreground text-[8px] font-bold tracking-[0.2em] mt-1 uppercase">MANAGEMENT SYSTEM</span>
            </div>
          )}
        </div>

        {/* Toggle Button for Desktop */}
        {!isMinimized && setIsMinimized && (
          <div className="hidden lg:block">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-foreground/[0.06] text-muted-foreground hover:text-foreground rounded-lg transition-colors duration-200 cursor-pointer"
              title="Sembunyikan Menu"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}

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

      {/* Dynamic Desktop Expander Toggler */}
      {isMinimized && setIsMinimized && (
        <div className="hidden lg:flex justify-center py-4 border-b border-border/50">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 hover:bg-foreground/[0.06] text-muted-foreground hover:text-foreground rounded-lg transition-colors duration-200 cursor-pointer"
            title="Tampilkan Menu"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Academic Year Info */}
      {!isMinimized ? (
        <div className="mx-4 mt-4 p-3 bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-800/20 rounded-xl border border-border/60 sidebar-text-container transition-all duration-300">
          <div className="flex items-center space-x-2 text-muted-foreground mb-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-[9px] font-black uppercase tracking-wider">Tahun Akademik</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">{activeTa?.namaTahunAjaran || "-"}</span>
            <span className="text-[9px] font-black px-2 py-0.5 bg-teal-50/80 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded-full tracking-wider uppercase">
              {activeTa?.semester || "-"}
            </span>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-col items-center py-4 text-muted-foreground border-b border-border/50" title={`Tahun Ajaran ${activeTa?.namaTahunAjaran || "-"}`}>
          <CalendarDays className="w-5 h-5 text-teal-500 mb-1" />
          <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-teal-50/80 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded border border-teal-500/20 uppercase">
            {activeTa?.semester?.slice(0, 3) || "-"}
          </span>
        </div>
      )}

      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
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
                <Link
                  key={item.label}
                  href={firstChildPath || "#"}
                  onClick={onClose}
                  className={cn(
                    "relative flex items-center px-4 py-3 mx-3 rounded-xl cursor-pointer select-none group transition-all duration-200 justify-center border border-transparent",
                    isGroupActive
                      ? "bg-gradient-to-r from-teal-50/80 to-emerald-50/40 text-teal-700 dark:from-teal-950/40 dark:to-emerald-950/20 dark:text-teal-400 border-teal-100/50 dark:border-teal-900/50 font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                  )}
                  title={item.label}
                >
                  {isGroupActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-teal-500 rounded-r-full" />
                  )}
                  <Icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105", isGroupActive ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground group-hover:text-foreground")} />
                </Link>
              )
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className={cn(
                    "w-full relative flex items-center gap-2.5 px-4 py-3 mx-3 rounded-xl text-sm cursor-pointer border transition-all duration-200",
                    isGroupActive
                      ? "bg-gradient-to-r from-teal-50/80 to-emerald-50/40 text-teal-700 dark:from-teal-950/40 dark:to-emerald-950/20 dark:text-teal-400 border-teal-100/50 dark:border-teal-900/50 font-bold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] border-transparent"
                  )}
                >
                  {isGroupActive && (
                    <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-teal-500 rounded-r-full" />
                  )}
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    isGroupActive
                      ? "bg-teal-100/60 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left truncate ml-1">{item.label}</span>
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
                  <div className="mx-7 pl-4 mt-1 mb-1.5 space-y-1 border-l border-slate-100 dark:border-slate-800">
                    {item.children!.map(child => (
                      <Link
                        key={child.path}
                        href={child.path}
                        onClick={onClose}
                        className={cn(
                          "flex items-center px-3 py-1.5 rounded-lg cursor-pointer select-none text-[12px] transition-all duration-150",
                          isActive(child.path)
                            ? "bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-bold border border-teal-100/50 dark:border-teal-900/50"
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
                "relative flex items-center px-4 py-3 mx-3 rounded-xl cursor-pointer select-none group transition-all duration-200 border text-sm",
                isMinimized ? "lg:justify-center lg:px-0 lg:mx-2.5" : "justify-start",
                isItemActive
                  ? "bg-gradient-to-r from-teal-50/80 to-emerald-50/40 text-teal-700 dark:from-teal-950/40 dark:to-emerald-950/20 dark:text-teal-400 border-teal-100/50 dark:border-teal-900/50 font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] border-transparent"
              )}
              title={isMinimized ? item.label : undefined}
            >
              {isItemActive && !isMinimized && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-teal-500 rounded-r-full" />
              )}
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                isItemActive
                  ? "bg-teal-100/60 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                  : "bg-muted/50 text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {!isMinimized && <span className="truncate ml-1.5">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer Info & Admin Card */}
      <div className="border-t border-border/50 p-4 bg-slate-50/50 dark:bg-slate-900/20">
        {!isMinimized ? (
          <div className="sidebar-text-container">
            <div className="flex items-center space-x-3 bg-card border border-border p-2.5 rounded-xl shadow-sm">
              {userPhoto ? (
                <div className="w-8.5 h-8.5 rounded-xl overflow-hidden border border-border flex-shrink-0">
                  <img src={userPhoto} alt={displayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-foreground truncate leading-none">{displayName}</p>
                <p className="text-[8px] text-muted-foreground font-semibold leading-none mt-1.5 uppercase tracking-wide">
                  {userRoleLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5 px-1">
              <span className="text-[8px] text-muted-foreground font-bold tracking-wider uppercase">Sistem Portal</span>
              <span className="text-[8px] text-teal-600 dark:text-teal-400 font-black bg-teal-50/80 dark:bg-teal-950/50 px-2 py-0.5 rounded-full border border-teal-100/30">v1.0.5</span>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center gap-1.5" title={`${displayName} - ${userRoleLabel}`}>
            {userPhoto ? (
              <div className="w-8.5 h-8.5 rounded-xl overflow-hidden border border-border flex-shrink-0">
                <img src={userPhoto} alt={displayName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm flex-shrink-0">
                {initials}
              </div>
            )}
            <span className="text-[8px] text-teal-600 dark:text-teal-400 font-bold">v1.0.5</span>
          </div>
        )}
      </div>

      {/* Dialog Konfirmasi Keluar */}
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
