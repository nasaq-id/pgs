"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Bell, Menu, CalendarDays } from "lucide-react"

const pageTitles: Record<string, string> = {
  "/": "Dashboard", "/lembaga": "Lembaga",
  "/manajemen/siswa": "Siswa", "/manajemen/guru": "Guru & Tendik",
  "/manajemen/kelas": "Rombongan Belajar",
  "/akademik": "Akademik",
  "/sarana": "Sarana & Prasarana",
  "/lms/jurnal": "Jurnal Mengajar", "/lms/tugas": "Tugas",
  "/evaluasi/buku-nilai": "Buku Nilai",
  "/pengaturan": "Pengaturan",
}

interface TopbarProps { onMenuClick: () => void }

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const user = session?.user

  const displayName = (user?.name) || user?.email?.split("@")[0] || "Admin"
  const initials = (user?.name?.[0] || user?.email?.[0] || "A").toUpperCase()
  const pageTitle = pageTitles[pathname] ?? "Dashboard"

  return (
    <div className="sticky top-0 z-40 glass h-16 flex items-center gap-4 px-5 rounded-b-2xl mx-2 mt-2">
      <button
        onClick={onMenuClick}
        className="lg:hidden flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block flex-shrink-0">
        <p className="text-[15px] font-bold text-foreground leading-none">Hi, {displayName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{pageTitle}</p>
      </div>
      <p className="lg:hidden text-base font-bold text-foreground flex-1">{pageTitle}</p>

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground px-3 py-1.5 rounded-xl glass-badge">
          <CalendarDays className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
        </div>

        <button className="relative rounded-xl h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 ring-2 ring-background" />
        </button>

        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-600/20 ml-1 cursor-pointer">
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>
      </div>
    </div>
  )
}
