"use client"

import { useSession } from "next-auth/react"
import { Users, GraduationCap, BookOpen, Hand, Trophy, AlertTriangle, Star } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Skeleton } from "@/components/ui/skeleton"

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
  const role = user?.role

  const { data: dashboardSiswa, isLoading: loadingSiswa } = api.poin.getDashboardSiswa.useQuery(undefined, {
    enabled: role === "siswa",
  })
  const { data: dashboardGuruAdmin, isLoading: loadingGuruAdmin } = api.poin.getDashboardGuruAdmin.useQuery(undefined, {
    enabled: role === "guru" || role === "admin_sekolah" || role === "super_admin",
  })

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

      {/* Siswa Dashboard Widget */}
      {role === "siswa" && (
        <>
          {loadingSiswa ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                    <Star className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Poin Saya</p>
                    <p className="text-3xl font-black text-foreground">{dashboardSiswa?.totalPoin ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top 5 Poin Positif</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {dashboardSiswa?.leaderboard?.length ? (
                    dashboardSiswa.leaderboard.map((item: any, i: number) => (
                      <div key={item.siswaId} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? "bg-amber-100 text-amber-700" :
                            i === 1 ? "bg-gray-100 text-gray-600" :
                            i === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <span className="truncate max-w-[120px]">{item.namaLengkap}</span>
                        </span>
                        <span className="font-bold text-green-600">+{item.totalPoin}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Guru / Admin Dashboard Widget */}
      {(role === "guru" || role === "admin_sekolah" || role === "super_admin") && (
        <>
          {loadingGuruAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top 5 Poin Positif</p>
                    <p className="text-[10px] text-muted-foreground">Siswa teladan</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {dashboardGuruAdmin?.topPositif?.length ? (
                    dashboardGuruAdmin.topPositif.map((item: any, i: number) => (
                      <div key={item.siswaId} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? "bg-amber-100 text-amber-700" :
                            i === 1 ? "bg-gray-100 text-gray-600" :
                            i === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <span className="truncate max-w-[150px]">{item.namaLengkap}</span>
                        </span>
                        <span className="font-bold text-green-600">+{item.totalPoin}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top 5 Poin Negatif</p>
                    <p className="text-[10px] text-muted-foreground">Pelanggaran terberat</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {dashboardGuruAdmin?.topNegatif?.length ? (
                    dashboardGuruAdmin.topNegatif.map((item: any, i: number) => (
                      <div key={item.siswaId} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? "bg-red-100 text-red-700" :
                            i === 1 ? "bg-red-50 text-red-600" :
                            i === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <span className="truncate max-w-[150px]">{item.namaLengkap}</span>
                        </span>
                        <span className="font-bold text-red-600">{item.totalPoin}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">Modul Tersedia</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Gunakan menu sidebar untuk mengakses modul Siswa, Guru, Akademik, LMS, dan lainnya.
        </p>
      </div>
    </div>
  )
}
