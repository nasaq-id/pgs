"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Bell, Menu, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    <div className="sticky top-0 z-40 flex h-16 items-center gap-4 bg-card border-b border-border px-5">
      <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="hidden lg:block flex-shrink-0">
        <p className="text-[15px] font-bold text-foreground leading-none">Hi, {displayName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{pageTitle}</p>
      </div>
      <p className="lg:hidden text-base font-bold text-foreground flex-1">{pageTitle}</p>
      <div className="flex-1" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button className="hidden lg:flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border transition-colors">
          <CalendarDays className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
        </button>
        <button className="rounded-xl h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-sm ml-1">
          <span className="text-sm font-bold text-primary-foreground">{initials}</span>
        </div>
      </div>
    </div>
  )
}
