"use client"

import { useSession } from "next-auth/react"
import { Users, GraduationCap, BookOpen, Hand, Trophy, AlertTriangle, Star, Megaphone } from "lucide-react"
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
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                    <Star className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Poin Saya</p>
                    <p className="text-3xl font-black text-foreground">{dashboardSiswa?.totalPoin ?? 0}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.abs(dashboardSiswa?.totalPoin ?? 0) / 2, 100)}%`,
                      backgroundColor: (dashboardSiswa?.totalPoin ?? 0) >= 0 ? "hsl(142 72% 40%)" : "hsl(0 84% 60%)",
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {(dashboardSiswa?.totalPoin ?? 0) >= 0 ? "Poin positif" : "Poin negatif"}
                </p>
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
                      <div key={item.siswaId} className={`flex items-center justify-between text-sm p-1.5 rounded-lg ${
                        i === 0 ? "bg-amber-50 dark:bg-amber-950/20" :
                        i === 1 ? "bg-gray-50 dark:bg-gray-800/20" :
                        i === 2 ? "bg-orange-50 dark:bg-orange-950/20" : ""
                      }`}>
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            i === 0 ? "bg-amber-400 text-white shadow-sm" :
                            i === 1 ? "bg-gray-300 text-white shadow-sm" :
                            i === 2 ? "bg-orange-400 text-white shadow-sm" :
                            "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <span className="truncate">{item.namaLengkap}</span>
                        </span>
                        <span className="font-bold text-green-600 shrink-0">+{item.totalPoin}</span>
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
                      <div key={item.siswaId} className={`flex items-center justify-between text-sm p-1.5 rounded-lg ${
                        i === 0 ? "bg-amber-50 dark:bg-amber-950/20" :
                        i === 1 ? "bg-gray-50 dark:bg-gray-800/20" :
                        i === 2 ? "bg-orange-50 dark:bg-orange-950/20" : ""
                      }`}>
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            i === 0 ? "bg-amber-400 text-white shadow-sm" :
                            i === 1 ? "bg-gray-300 text-white shadow-sm" :
                            i === 2 ? "bg-orange-400 text-white shadow-sm" :
                            "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <span className="truncate">{item.namaLengkap}</span>
                        </span>
                        <span className="font-bold text-green-600 shrink-0">+{item.totalPoin}</span>
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
                      <div key={item.siswaId} className={`flex items-center justify-between text-sm p-1.5 rounded-lg ${
                        i === 0 ? "bg-red-50 dark:bg-red-950/20" :
                        i === 1 ? "bg-red-50/50 dark:bg-red-900/10" :
                        i === 2 ? "bg-orange-50 dark:bg-orange-950/20" : ""
                      }`}>
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            i === 0 ? "bg-red-500 text-white shadow-sm" :
                            i === 1 ? "bg-red-300 text-white shadow-sm" :
                            i === 2 ? "bg-orange-400 text-white shadow-sm" :
                            "bg-muted text-muted-foreground"
                          }`}>{i + 1}</span>
                          <span className="truncate">{item.namaLengkap}</span>
                        </span>
                        <span className="font-bold text-red-600 shrink-0">{item.totalPoin}</span>
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

      {/* Pengumuman Widget */}
      <AnnouncementWidget />

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">Modul Tersedia</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Gunakan menu sidebar untuk mengakses modul Siswa, Guru, Akademik, LMS, dan lainnya.
        </p>
      </div>
    </div>
  )
}

function AnnouncementWidget() {
  const { data: announcements, isLoading } = api.pengumuman.getPublished.useQuery(
    { limit: 5 },
  )

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="h-5 w-40 rounded bg-muted animate-pulse mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!announcements?.length) return null

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pengumuman</p>
          <p className="text-sm text-foreground font-medium">Informasi terbaru</p>
        </div>
      </div>
      <div className="space-y-2">
        {announcements.slice(0, 5).map((a: any) => (
          <a
            key={a.id}
            href={"/konten/pengumuman"}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <div className="min-w-0 flex-1 mr-3">
              <p className="text-sm font-medium text-foreground truncate">{a.judul}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {a.tanggalPublish
                  ? new Date(a.tanggalPublish).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                    })
                  : "-"}
              </p>
            </div>
            <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              a.target === "guru" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" :
              a.target === "siswa" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" :
              a.target === "orang_tua" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200" :
              "bg-muted text-muted-foreground"
            }`}>
              {a.target === "semua" ? "Semua" :
               a.target === "guru" ? "Guru" :
               a.target === "siswa" ? "Siswa" : "Ortu"}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
