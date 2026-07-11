"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Users, GraduationCap, BookOpen, Hand, Wallet,
  ClipboardCheck, TrendingUp, Building2, Star, AlertTriangle,
  Megaphone, Trophy, Sparkles, ArrowRight, Award, TrendingDown,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Skeleton } from "@/components/ui/skeleton"

function fmtRupiahCompact(num: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

function StatCardSkeleton() {
  return <Skeleton className="h-[120px] rounded-[1.75rem]" />
}

function StatCard({ icon: Icon, label, value, sub, isLoading }: {
  icon: React.ComponentType<any>; label: string; value: string | number; sub?: string; isLoading?: boolean
}) {
  if (isLoading) return <StatCardSkeleton />
  return (
    <div className="bg-white border border-slate-100 p-5 rounded-[1.75rem] shadow-sm flex flex-col justify-between h-[120px] hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function CompactCard({ icon: Icon, label, value, sub, accent = "slate", isLoading, isNull }: {
  icon: React.ComponentType<any>; label: string; value: string | number | React.ReactNode; sub?: string; accent?: string; isLoading?: boolean; isNull?: boolean
}) {
  if (isLoading) return <Skeleton className="h-[104px] rounded-[1.75rem]" />
  if (isNull) {
    return (
      <div className="bg-white border border-slate-100 p-5 rounded-[1.75rem] shadow-sm opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-xl font-black text-slate-900">&mdash;</p>
            <p className="text-[10px] text-slate-400 font-medium">Data belum tersedia</p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-white border border-slate-100 p-5 rounded-[1.75rem] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-extrabold text-slate-900">{value}</p>
          {sub && <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{sub}</p>}
        </div>
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

  const { data: dashboardSiswa, isLoading: loadingSiswa } = api.poin.getDashboardSiswa.useQuery(undefined, { enabled: role === "siswa" })
  const { data: dashboardGuruAdmin } = api.poin.getDashboardGuruAdmin.useQuery(undefined, { enabled: role === "guru" || role === "admin_sekolah" || role === "super_admin" })
  const { data: announcements, isLoading: annLoading } = api.pengumuman.getPublished.useQuery({ limit: 5 })

  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())

  const calendarEvents = api.kalender.getAll.useQuery(
    {
      tahun: calendarYear,
      bulan: calendarMonth + 1,
      limit: 200,
    },
    {
      enabled: role !== "siswa",
      staleTime: 30000,
    }
  )

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear(prev => prev - 1)
    } else {
      setCalendarMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear(prev => prev + 1)
    } else {
      setCalendarMonth(prev => prev + 1)
    }
  }

  const getEventsForDay = (day: number) => {
    if (!calendarEvents.data) return []
    return calendarEvents.data.filter(event => {
      const startDate = new Date(event.tanggalMulai)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = event.tanggalSelesai ? new Date(event.tanggalSelesai) : new Date(event.tanggalMulai)
      endDate.setHours(23, 59, 59, 999)
      
      const checkDate = new Date(calendarYear, calendarMonth, day, 12, 0, 0)
      return checkDate >= startDate && checkDate <= endDate
    })
  }

  const isAdminRole = role && ["super_admin", "admin_sekolah", "tu", "yayasan", "guru"].includes(role)

  // ─── SISWA DASHBOARD ──────────────────────────────────────────
  if (role === "siswa") {
    return (
      <div className="animate-fade-in space-y-8">
        <div className="flex items-center gap-2 text-teal-600 text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Portal Siswa</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Assalamu&apos;alaikum, <span className="text-teal-600">{displayName}</span>
        </h1>

        {loadingSiswa ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-48 rounded-[2rem]" />
            <Skeleton className="h-48 rounded-[2rem]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Poin Card */}
            <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white p-6 rounded-[2rem] shadow-lg shadow-teal-700/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-100 bg-white/10 px-3 py-1 rounded-full">
                    Kedisiplinan & Prestasi
                  </span>
                  <Award size={20} className="text-amber-300" />
                </div>
                <p className="text-sm font-bold text-teal-100">Total Poin Anda</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-5xl font-black tracking-tight">{dashboardSiswa?.totalPoin ?? 0}</span>
                  <span className="text-xs font-bold text-teal-200">Poin</span>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-teal-100">Positif</p>
                  <p className="text-base font-black text-emerald-300 mt-0.5">+{dashboardSiswa?.totalPoin && dashboardSiswa.totalPoin > 0 ? dashboardSiswa.totalPoin : 0}</p>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-teal-100">Negatif</p>
                  <p className="text-base font-black text-rose-300 mt-0.5">0</p>
                </div>
              </div>
            </div>

            {/* Leaderboard Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    Top 5 Poin Positif
                  </p>
                  <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full uppercase">Teladan</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {dashboardSiswa?.leaderboard?.length ? (
                    dashboardSiswa.leaderboard.slice(0, 5).map((item: any, i: number) => (
                      <div key={item.siswaId} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"
                          }`}>{i + 1}</span>
                          <p className="text-xs font-black text-slate-700">{item.namaLengkap}</p>
                        </div>
                        <span className="text-xs font-black text-emerald-600">+{item.totalPoin} Poin</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 font-semibold py-4 text-center">Belum ada data</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Announcements */}
        {announcements && announcements.length > 0 && (
          <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-700">Pengumuman</p>
              </div>
            </div>
            <div className="space-y-2">
              {announcements.slice(0, 5).map((a: any) => (
                <a key={a.id} href="/konten/pengumuman" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-bold text-slate-800 truncate">{a.judul}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {a.tanggalPublish ? new Date(a.tanggalPublish).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── ADMIN / GURU DASHBOARD ────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-8">
      {/* Welcome */}
      <div>
        <div className="flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Sistem Manajemen Sekolah</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
          Welcome back, <span className="text-teal-600">{displayName}</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT + MIDDLE COLUMNS */}
        <div className="lg:col-span-2 space-y-8">

          {/* Aktivitas Utama */}
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Aktivitas Hari Ini
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#d5f2e8] p-6 rounded-[2rem] flex flex-col justify-between h-[180px] hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => window.location.href = "/manajemen/siswa"}>
                <div className="flex items-start justify-between">
                  <span className="px-3 py-1 bg-white/70 text-emerald-800 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-sm">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {studentSummary.data?.total ?? 0}
                  </span>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:bg-slate-900 transition-colors">
                    <ArrowRight size={18} className="text-slate-800" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Manajemen Siswa</h3>
                  <p className="text-[11px] text-emerald-800/70 font-semibold mt-1">Kelola data & rekap profil</p>
                </div>
              </div>
              <div className="bg-[#e0e7ff] p-6 rounded-[2rem] flex flex-col justify-between h-[180px] hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => window.location.href = "/manajemen/guru"}>
                <div className="flex items-start justify-between">
                  <span className="px-3 py-1 bg-white/70 text-indigo-900 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-sm">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {staffSummary.data?.total ?? 0}
                  </span>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <ArrowRight size={18} className="text-slate-800" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Pendidik & Tendik</h3>
                  <p className="text-[11px] text-indigo-900/70 font-semibold mt-1">Staf pengajar & kurikulum</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Ringkasan</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Siswa" value={studentSummary.data?.total ?? "—"} sub={studentSummary.data ? `${studentSummary.data.newThisMonth} baru` : undefined} isLoading={studentSummary.isLoading} />
              <StatCard icon={GraduationCap} label="Guru & Tendik" value={staffSummary.data?.total ?? "—"} sub={staffSummary.data ? `${staffSummary.data.newThisMonth} baru` : undefined} isLoading={staffSummary.isLoading} />
              <StatCard icon={BookOpen} label="Rombel" value={classSummary.data?.total ?? "—"} sub={classSummary.data ? `${classSummary.data.distinctTingkat} jenjang` : undefined} isLoading={classSummary.isLoading} />
              <StatCard icon={Wallet} label="Tagihan Pending" value={pendingPayment.data?.count ?? "—"} sub="Belum dibayar" isLoading={pendingPayment.isLoading} />
            </div>
          </div>

          {/* Poin Kedisiplinan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 Positif */}
            <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm p-6">
              <div className="flex items-center justify-between border-b border-emerald-50 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/10">
                    <Award size={16} />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800 text-sm tracking-tight">Top 5 Siswa Teladan</p>
                    <p className="text-[10px] text-slate-400 font-bold">Poin Positif Tertinggi</p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase">Sikap Baik</span>
              </div>
              <div className="space-y-3">
                {topPoints.isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl" />)}</div>
                ) : topPoints.data?.positive?.length ? (
                  topPoints.data.positive.map((item: any, i: number) => (
                    <div key={item.siswaId} className="flex items-center justify-between hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 font-black text-xs flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">{item.namaLengkap}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600">+{item.totalPoin} Poin</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 font-semibold text-center py-4">Belum ada data</p>
                )}
              </div>
            </div>

            {/* Top 5 Negatif */}
            <div className="bg-white rounded-[2.5rem] border border-rose-100 shadow-sm p-6">
              <div className="flex items-center justify-between border-b border-rose-50 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-rose-500/10">
                    <TrendingDown size={16} />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800 text-sm tracking-tight">Top 5 Pelanggaran</p>
                    <p className="text-[10px] text-slate-400 font-bold">Total: {topPoints.data?.totalNegativeThisMonth ?? "—"} poin</p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full uppercase">Perlu Pembinaan</span>
              </div>
              <div className="space-y-3">
                {topPoints.isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-xl" />)}</div>
                ) : topPoints.data?.negative?.length ? (
                  topPoints.data.negative.map((item: any, i: number) => (
                    <div key={item.siswaId} className="flex items-center justify-between hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 font-black text-xs flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">{item.namaLengkap}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-600">{item.totalPoin} Poin</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 font-semibold text-center py-4">Belum ada data</p>
                )}
              </div>
            </div>
          </div>

          {/* Perlu Perhatian */}
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Perlu Perhatian Hari Ini</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CompactCard
                icon={ClipboardCheck} label="Kehadiran Hari Ini"
                value={attendance.data ? `${attendance.data.rate}%` : "—"}
                sub={attendance.data ? `${attendance.data.present} dari ${attendance.data.total} siswa hadir` : undefined}
                isLoading={attendance.isLoading} isNull={attendance.data === null && !attendance.isLoading}
              />
              <CompactCard
                icon={TrendingUp} label="Total Tunggakan SPP"
                value={receivables.data ? fmtRupiahCompact(receivables.data.total) : "—"}
                sub={receivables.data && receivables.data.total > 0 ? fmtRupiah(receivables.data.total) : receivables.data?.total === 0 ? "Tidak ada tunggakan" : undefined}
                isLoading={receivables.isLoading}
              />
              <CompactCard
                icon={Building2} label="Ruang Kelas Aktif"
                value={ruangKelas.data?.total ?? "—"}
                sub={ruangKelas.data ? `Kapasitas ${ruangKelas.data.totalKapasitas} siswa` : undefined}
                isLoading={ruangKelas.isLoading}
              />
            </div>
          </div>

          {/* Announcements */}
          {annLoading ? (
            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-extrabold text-slate-700">Pengumuman</p>
              </div>
              <div className="space-y-2">
                {announcements.slice(0, 5).map((a: any) => (
                  <a key={a.id} href="/konten/pengumuman" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-bold text-slate-800 truncate">{a.judul}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {a.tanggalPublish ? new Date(a.tanggalPublish).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT COLUMN — Calendar & Agenda */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Kalender & Agenda</h2>
          </div>

          {/* Calendar Card */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">
                {monthNames[calendarMonth]} {calendarYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer border border-transparent hover:border-slate-200/50"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors cursor-pointer border border-transparent hover:border-slate-200/50"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {(calendarMonth !== new Date().getMonth() || calendarYear !== new Date().getFullYear()) && (
                  <button
                    onClick={() => {
                      setCalendarMonth(new Date().getMonth())
                      setCalendarYear(new Date().getFullYear())
                    }}
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg ml-1 transition-colors cursor-pointer"
                  >
                    Hari Ini
                  </button>
                )}
                {calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear() && (
                  <span className="text-[9px] font-black px-2 py-1 bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 rounded-lg ml-1">Bulan Ini</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
              {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, i) => (
                <div key={`e-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, idx) => {
                const day = idx + 1
                const today = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear()
                const dayEvents = getEventsForDay(day)
                const hasHoliday = dayEvents.some(e => e.isLiburNasional || e.tipe === "libur")
                const hasKegiatan = dayEvents.some(e => e.tipe === "kegiatan")
                const hasLainnya = dayEvents.some(e => e.tipe === "lainnya")
                
                const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay()
                const colIndex = (firstDayIndex + idx) % 7

                let cellColorClass = "text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                if (today) {
                  cellColorClass = "bg-slate-900 text-white font-extrabold shadow-sm border border-slate-900 dark:bg-slate-150 dark:text-slate-900 dark:border-slate-150"
                } else if (hasHoliday || colIndex === 0) {
                  cellColorClass = "bg-rose-500/10 text-rose-600 dark:text-rose-455 font-extrabold border border-rose-500/20"
                } else if (hasKegiatan) {
                  cellColorClass = "bg-teal-500/10 text-teal-650 dark:text-teal-400 font-extrabold border border-teal-500/20"
                } else if (hasLainnya) {
                  cellColorClass = "bg-sky-500/10 text-sky-650 dark:text-sky-400 font-extrabold border border-sky-500/20"
                }

                return (
                  <div key={idx} className="relative group aspect-square flex items-center justify-center cursor-pointer">
                    <div className={`w-8 h-8 flex items-center justify-center text-xs rounded-xl transition-all ${cellColorClass}`}>
                      {day}
                    </div>
                    {/* Tooltip */}
                    {dayEvents.length > 0 && (
                      <div className={`absolute bottom-full mb-2 hidden group-hover:flex z-55 w-52 bg-slate-950 text-white p-3 rounded-2xl shadow-xl border border-slate-800 flex-col gap-2 text-left animate-fade-in pointer-events-none ${
                        colIndex <= 1 ? "left-0 origin-bottom-left" : colIndex >= 5 ? "right-0 origin-bottom-right" : "left-1/2 -translate-x-1/2"
                      }`}>
                        <p className="font-black text-[9px] uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
                          {new Date(calendarYear, calendarMonth, day).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
                        </p>
                        <div className="space-y-2">
                          {dayEvents.map((ev, i) => (
                            <div key={ev.id || i} className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  ev.isLiburNasional || ev.tipe === "libur" ? "bg-rose-500" : ev.tipe === "kegiatan" ? "bg-teal-400" : "bg-sky-400"
                                }`} />
                                <span className="font-extrabold text-[11px] leading-tight text-white">{ev.judul}</span>
                              </div>
                              {ev.deskripsi && (
                                <p className="text-[10px] text-slate-400 leading-snug pl-3 line-clamp-2">
                                  {ev.deskripsi}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agenda */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Kegiatan Terdekat</h3>
            <div className="space-y-3">
              <div className="bg-[#e0f2fe]/60 border border-[#bae6fd]/50 p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sky-600 shadow-xs flex-shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs leading-snug">Pantau Tagihan & Tunggakan SPP</p>
                  <p className="text-[10px] text-sky-800/80 mt-1 font-semibold">Keuangan — {pendingPayment.data?.count ?? 0} tagihan pending</p>
                </div>
              </div>
              <div className="bg-[#f1f5f9]/80 border border-[#cbd5e1]/50 p-4 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-xs flex-shrink-0">
                  <BookOpen size={16} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs leading-snug">Kelola Akademik</p>
                  <p className="text-[10px] text-slate-700/80 mt-1 font-semibold">{classSummary.data?.total ?? 0} rombel aktif</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}