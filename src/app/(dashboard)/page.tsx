"use client"

import { useSession } from "next-auth/react"
import {
  Users, GraduationCap, BookOpen, Hand, Wallet,
  ClipboardCheck, TrendingUp, Building2,
  Trophy, AlertTriangle, Star, Megaphone, Calendar,
} from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Skeleton } from "@/components/ui/skeleton"

function fmtRupiahCompact(num: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num)
}

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num)
}

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

function SkeletonCard({ className = "h-24" }: { className?: string }) {
  return <Skeleton className={`rounded-2xl ${className}`} />
}

function NullCard({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<any>
  label: string
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4 opacity-60">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-foreground">&mdash;</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Data belum tersedia</p>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  isLoading,
}: {
  icon: React.ComponentType<any>
  label: string
  value: string | number
  sub?: string
  accent: string
  isLoading?: boolean
}) {
  if (isLoading) return <SkeletonCard className="h-24" />

  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `hsl(var(${accent}) / 0.15)` }}
      >
        <Icon className="h-6 w-6" style={{ color: `hsl(var(${accent}))` }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function CompactCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "--chart-1",
  isLoading,
  isNull,
  warning,
}: {
  icon: React.ComponentType<any>
  label: string
  value: string | number | React.ReactNode
  sub?: string
  accent?: string
  isLoading?: boolean
  isNull?: boolean
  warning?: boolean
}) {
  if (isLoading) return <SkeletonCard className="h-20" />

  if (isNull) {
    return (
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4 opacity-60">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-xl font-black text-foreground">&mdash;</p>
          <p className="text-[10px] text-muted-foreground">Data belum tersedia</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`glass-card rounded-2xl p-4 flex items-center gap-4 ${warning ? "border-warning/30" : ""}`}
      title={typeof value === "number" ? String(value) : undefined}
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          backgroundColor: warning
            ? "hsl(var(--warning) / 0.15)"
            : `hsl(var(${accent}) / 0.15)`,
        }}
      >
        <Icon
          className="h-5 w-5"
          style={{ color: warning ? "hsl(var(--warning))" : `hsl(var(${accent}))` }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const displayName = user?.name || user?.email?.split("@")[0] || "Admin"
  const role = user?.role

  const studentSummary = api.dashboard.getStudentSummary.useQuery(undefined, { staleTime: 30000 })
  const staffSummary = api.dashboard.getStaffSummary.useQuery(undefined, { staleTime: 30000 })
  const classSummary = api.dashboard.getClassSummary.useQuery(undefined, { staleTime: 30000 })
  const pendingPayment = api.dashboard.getPendingPaymentCount.useQuery(undefined, { staleTime: 30000 })
  const attendance = api.dashboard.getTodayAttendanceRate.useQuery(undefined, { staleTime: 30000 })
  const receivables = api.dashboard.getOutstandingReceivables.useQuery(undefined, { staleTime: 30000 })
  const ruangKelas = api.dashboard.getRuangKelasCount.useQuery(undefined, { staleTime: 30000 })
  const topPoints = api.dashboard.getTopStudentPoints.useQuery(undefined, { staleTime: 30000 })

  const { data: dashboardSiswa, isLoading: loadingSiswa } = api.poin.getDashboardSiswa.useQuery(undefined, {
    enabled: role === "siswa",
  })
  const { data: dashboardGuruAdmin, isLoading: loadingGuruAdmin } = api.poin.getDashboardGuruAdmin.useQuery(undefined, {
    enabled: role === "guru" || role === "admin_sekolah" || role === "super_admin",
  })
  const { data: announcements, isLoading: annLoading } = api.pengumuman.getPublished.useQuery({ limit: 5 })

  const isAdminRole = role && ["super_admin", "admin_sekolah", "tu", "yayasan", "guru"].includes(role)

  // ─── SISWA DASHBOARD ──────────────────────────────────────
  if (role === "siswa") {
    return (
      <div className="space-y-5">
        <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Hand className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Selamat datang, <span className="text-primary">{displayName}</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Berikut ringkasan aktivitas kamu.
            </p>
          </div>
        </div>

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

        {announcements && announcements.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pengumuman</p>
              </div>
            </div>
            <div className="space-y-2">
              {announcements.slice(0, 5).map((a: any) => (
                <a key={a.id} href="/konten/pengumuman" className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{a.judul}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {a.tanggalPublish ? new Date(a.tanggalPublish).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-foreground">Modul Tersedia</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gunakan menu sidebar untuk mengakses berbagai fitur.
          </p>
        </div>
      </div>
    )
  }

  // ─── ADMIN / GURU DASHBOARD ───────────────────────────────
  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
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

      {/* ─── TIER 1: RINGKASAN ────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
          Ringkasan
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Siswa"
            value={studentSummary.data?.total ?? "—"}
            sub={studentSummary.data ? `${studentSummary.data.newThisMonth} siswa baru bulan ini` : undefined}
            accent="--chart-2"
            isLoading={studentSummary.isLoading}
          />
          <StatCard
            icon={GraduationCap}
            label="Guru & Tendik"
            value={staffSummary.data?.total ?? "—"}
            sub={staffSummary.data ? `${staffSummary.data.newThisMonth} baru bulan ini` : undefined}
            accent="--chart-1"
            isLoading={staffSummary.isLoading}
          />
          {classSummary.isLoading ? (
            <StatCard icon={BookOpen} label="Rombel" value="—" accent="--chart-3" isLoading />
          ) : classSummary.data ? (
            <StatCard
              icon={BookOpen}
              label="Rombel"
              value={classSummary.data.total}
              sub={`${classSummary.data.distinctTingkat} jenjang`}
              accent="--chart-3"
            />
          ) : (
            <NullCard icon={BookOpen} label="Rombel" />
          )}
          <StatCard
            icon={Wallet}
            label="Tagihan Pending"
            value={pendingPayment.data?.count ?? "—"}
            sub="Perlu verifikasi"
            accent="--warning"
            isLoading={pendingPayment.isLoading}
          />
        </div>
      </div>

      {/* ─── TIER 2: PERLU PERHATIAN HARI INI ─────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">
          Perlu Perhatian Hari Ini
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CompactCard
            icon={ClipboardCheck}
            label="Kehadiran Hari Ini"
            value={attendance.data ? `${attendance.data.rate}%` : "—"}
            sub={
              attendance.data
                ? `${attendance.data.present} dari ${attendance.data.total} siswa hadir`
                : undefined
            }
            accent="--chart-2"
            isLoading={attendance.isLoading}
            isNull={attendance.data === null && !attendance.isLoading}
          />
          <CompactCard
            icon={TrendingUp}
            label="Total Tunggakan SPP"
            value={receivables.data ? fmtRupiahCompact(receivables.data.total) : "—"}
            sub={
              receivables.data && receivables.data.total > 0
                ? fmtRupiah(receivables.data.total)
                : receivables.data?.total === 0
                  ? "Tidak ada tunggakan"
                  : undefined
            }
            accent="--chart-4"
            isLoading={receivables.isLoading}
          />
          <CompactCard
            icon={Building2}
            label="Ruang Kelas Aktif"
            value={ruangKelas.data?.total ?? "—"}
            sub={
              ruangKelas.data
                ? `Kapasitas ${ruangKelas.data.totalKapasitas} siswa`
                : undefined
            }
            accent="--chart-1"
            isLoading={ruangKelas.isLoading}
          />
        </div>
      </div>

      {/* ─── KESISWAAN ────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Kesiswaan
          </p>
          {topPoints.data && (
            <span className="text-[10px] text-muted-foreground">
              — {monthNames[topPoints.data.period.month - 1]} {topPoints.data.period.year}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 5 Positif */}
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
              {topPoints.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : topPoints.data?.positive?.length ? (
                topPoints.data.positive.map((item: any, i: number) => (
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

          {/* Top 5 Negatif */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top 5 Poin Negatif</p>
                <p className="text-[10px] text-muted-foreground">
                  Total: {topPoints.data?.totalNegativeThisMonth ?? "—"} poin bulan ini
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {topPoints.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : topPoints.data?.negative?.length ? (
                topPoints.data.negative.map((item: any, i: number) => (
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
      </div>

      {/* ─── PENGUMUMAN ────────────────────────────────────── */}
      {annLoading ? (
        <div className="glass-card rounded-2xl p-5">
          <div className="h-5 w-40 rounded bg-muted animate-pulse mb-3" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ) : announcements && announcements.length > 0 ? (
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
              <a key={a.id} href="/konten/pengumuman" className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium text-foreground truncate">{a.judul}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {a.tanggalPublish ? new Date(a.tanggalPublish).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </p>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  a.target === "guru" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" :
                  a.target === "siswa" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" :
                  a.target === "orang_tua" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {a.target === "semua" ? "Semua" : a.target === "guru" ? "Guru" : a.target === "siswa" ? "Siswa" : "Ortu"}
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* ─── FOOTER ────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-foreground">Modul Tersedia</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Gunakan menu sidebar untuk mengakses modul Siswa, Guru, Akademik, LMS, dan lainnya.
        </p>
      </div>
    </div>
  )
}
