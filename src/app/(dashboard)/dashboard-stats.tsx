import Link from "next/link"
import {
  Users, GraduationCap, BookOpen, Wallet,
  ClipboardCheck, TrendingUp, Building2, Star,
  Megaphone, ArrowRight, Award, TrendingDown,
} from "lucide-react"
import type { OverviewData } from "./dashboard-page"

// ─── FORMATTER ───

function fmtRupiahCompact(num: number) {
  return new Intl.NumberFormat("id-ID", { notation: "compact", style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

// ─── STAT CARDS ───

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="neumo-card bg-background p-5 rounded-2xl">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <p className="text-2xl font-black text-foreground leading-none">{value}</p>
      <p className="text-xs font-bold text-muted-foreground mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">{sub}</p>}
    </div>
  )
}

function CompactCard({ icon: Icon, label, value, sub, isNull }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  label: string
  value: string | number
  sub?: string
  isNull?: boolean
}) {
  return (
    <div className={`neumo-card bg-background p-5 rounded-2xl ${isNull ? "opacity-70" : ""}`}>
      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <p className="text-xl font-black text-foreground leading-none">{value}</p>
      <p className="text-xs font-bold text-muted-foreground mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 font-semibold mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── PENGUMUMAN ───

function AnnouncementList({ d }: { d: OverviewData | null | undefined }) {
  if (!d?.announcements || d.announcements.length === 0) return null
  return (
    <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] p-6 rounded-[2rem]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <p className="text-xs font-extrabold text-slate-700">Pengumuman</p>
      </div>
      <div className="space-y-2">
        {d.announcements.slice(0, 5).map((a: { id: string; judul: string; tanggalPublish: Date | string | null }) => (
          <Link key={a.id} href="/konten/pengumuman" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="min-w-0 flex-1 mr-3">
              <p className="text-sm font-bold text-slate-800 truncate">{a.judul}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {a.tanggalPublish ? new Date(a.tanggalPublish).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── SEKSI 1: STATISTIK ADMIN ───

export function DashboardStats({ data }: { data: OverviewData | null }) {
  const d = data
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Aktivitas Hari Ini</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/manajemen/siswa" className="bg-[#d5f2e8] dark:bg-[oklch(0.20_0.02_140)] neumo-sm p-6 rounded-[2rem] flex flex-col justify-between h-[180px] hover:scale-[1.02] transition-transform cursor-pointer group">
            <div className="flex items-start justify-between">
              <span className="px-3 py-1 bg-white/70 dark:bg-slate-900/40 text-emerald-800 dark:text-emerald-300 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-sm border border-transparent dark:border-emerald-500/20">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {d?.studentSummary?.total ?? 0}
              </span>
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm group-hover:bg-slate-900 transition-colors">
                <ArrowRight size={18} className="text-slate-800 dark:text-slate-200" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-emerald-100 tracking-tight leading-none">Manajemen Siswa</h3>
              <p className="text-[11px] text-emerald-800/70 dark:text-emerald-300/70 font-semibold mt-1">Kelola data & rekap profil</p>
            </div>
          </Link>
          <Link href="/manajemen/guru" className="bg-[#e0e7ff] dark:bg-[oklch(0.20_0.02_250)] neumo-sm p-6 rounded-[2rem] flex flex-col justify-between h-[180px] hover:scale-[1.02] transition-transform cursor-pointer group">
            <div className="flex items-start justify-between">
              <span className="px-3 py-1 bg-white/70 dark:bg-slate-900/40 text-indigo-900 dark:text-indigo-300 rounded-full text-[11px] font-extrabold flex items-center gap-1 shadow-sm border border-transparent dark:border-indigo-500/20">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {d?.staffSummary?.total ?? 0}
              </span>
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm">
                <ArrowRight size={18} className="text-slate-800 dark:text-slate-200" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-indigo-100 tracking-tight leading-none">Pendidik & Tendik</h3>
              <p className="text-[11px] text-indigo-900/70 dark:text-indigo-300/70 font-semibold mt-1">Staf pengajar & kurikulum</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Ringkasan</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Siswa" value={d?.studentSummary?.total ?? "—"} sub={d?.studentSummary ? `${d.studentSummary.newThisMonth} baru` : undefined} />
          <StatCard icon={GraduationCap} label="Guru & Tendik" value={d?.staffSummary?.total ?? "—"} sub={d?.staffSummary ? `${d.staffSummary.newThisMonth} baru` : undefined} />
          <StatCard icon={BookOpen} label="Rombel" value={d?.classSummary?.total ?? "—"} sub={d?.classSummary ? `${d.classSummary.distinctTingkat} jenjang` : undefined} />
          <StatCard icon={Wallet} label="Tagihan Pending" value={d?.pendingPayment?.count ?? "—"} sub="Belum dibayar" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Perlu Perhatian Hari Ini</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CompactCard
            icon={ClipboardCheck} label="Kehadiran Hari Ini"
            value={d?.attendance ? `${d.attendance.rate}%` : "—"}
            sub={d?.attendance ? `${d.attendance.present} dari ${d.attendance.total} siswa hadir` : undefined}
            isNull={d?.attendance == null}
          />
          <CompactCard
            icon={TrendingUp} label="Total Tunggakan SPP"
            value={d?.receivables ? fmtRupiahCompact(d.receivables.total) : "—"}
            sub={d?.receivables && d.receivables.total > 0 ? fmtRupiah(d.receivables.total) : d?.receivables?.total === 0 ? "Tidak ada tunggakan" : undefined}
          />
          <CompactCard
            icon={Building2} label="Ruang Kelas Aktif"
            value={d?.ruangKelas?.total ?? "—"}
            sub={d?.ruangKelas ? `Kapasitas ${d.ruangKelas.totalKapasitas} siswa` : undefined}
          />
        </div>
      </div>

      <PoinSection d={d} />
      <AnnouncementList d={d} />
    </div>
  )
}

// ─── SEKSI 2: POIN + PENGUMUMAN ───

function PoinSection({ d }: { d: OverviewData | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-[2rem] p-6">
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
          {d?.topPoints?.positive?.length ? (
            d?.topPoints?.positive.map((item: { siswaId: string; totalPoin: number; namaLengkap: string }, i: number) => (
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

      <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-[2rem] p-6">
        <div className="flex items-center justify-between border-b border-rose-50 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-rose-500/10">
              <TrendingDown size={16} />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm tracking-tight">Top 5 Pelanggaran</p>
              <p className="text-[10px] text-slate-400 font-bold">Total: {d?.topPoints?.totalNegativeThisMonth ?? "—"} poin</p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full uppercase">Perlu Pembinaan</span>
        </div>
        <div className="space-y-3">
          {d?.topPoints?.negative?.length ? (
            d?.topPoints?.negative.map((item: { siswaId: string; totalPoin: number; namaLengkap: string }, i: number) => (
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
  )
}

// ─── SEKSI SISWA ───

export function SiswaStats({ data }: { data: OverviewData | null }) {
  const d = data
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <span className="text-5xl font-black tracking-tight">{d?.dashboardSiswa?.totalPoin ?? 0}</span>
              <span className="text-xs font-bold text-teal-200">Poin</span>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-wider text-teal-100">Positif</p>
              <p className="text-base font-black text-emerald-300 mt-0.5">+{d?.dashboardSiswa?.totalPoin && d.dashboardSiswa.totalPoin > 0 ? d.dashboardSiswa.totalPoin : 0}</p>
            </div>
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-wider text-teal-100">Negatif</p>
              <p className="text-base font-black text-rose-300 mt-0.5">0</p>
            </div>
          </div>
        </div>

        <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-[2rem] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Star size={16} className="text-amber-400 fill-amber-400" />
                Top 5 Poin Positif
              </p>
              <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full uppercase">Teladan</span>
            </div>
            <div className="divide-y divide-slate-100">
              {d?.dashboardSiswa?.leaderboard?.length ? (
                d?.dashboardSiswa.leaderboard.slice(0, 5).map((item: { siswaId: string; totalPoin: number; namaLengkap: string }, i: number) => (
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

      <AnnouncementList d={d} />
    </div>
  )
}

// Fallback skeleton untuk Suspense server-side
export function DashboardStatsFallback() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="h-[180px] rounded-[2rem] bg-slate-100 dark:bg-slate-900/50" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900/50" />
        ))}
      </div>
    </div>
  )
}
