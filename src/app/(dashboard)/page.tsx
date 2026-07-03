"use client"

import { useSession } from "next-auth/react"
import { Users, GraduationCap, BookOpen, Hand } from "lucide-react"

const statCards = [
  { label: "Total Siswa", value: "0", icon: Users, accent: "--chart-2" },
  { label: "Guru & Tendik", value: "0", icon: GraduationCap, accent: "--chart-1" },
  { label: "Rombel", value: "0", icon: BookOpen, accent: "--chart-3" },
  { label: "Tagihan Pending", value: "0", icon: BookOpen, accent: "--chart-4" },
]

export default function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const displayName = user?.name || user?.email?.split("@")[0] || "Admin"

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Hand className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Selamat datang, <span className="text-primary">{displayName}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Berikut ringkasan aktivitas lembaga hari ini.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="glass-card rounded-2xl p-5 flex items-center gap-4 clickable">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `hsl(var(${s.accent}) / 0.15)` }}
              >
                <Icon className="h-6 w-6" style={{ color: `hsl(var(${s.accent}))` }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">Modul Tersedia</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Gunakan menu sidebar untuk mengakses modul Siswa, Guru, Akademik, LMS, dan lainnya.
        </p>
      </div>
    </div>
  )
}
