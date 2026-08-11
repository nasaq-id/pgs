"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Sparkles, Loader2, TrendingUp, BookOpen, RefreshCw } from "lucide-react"
import { api } from "@/lib/trpc/client"
import type { AppRouterOutput } from "@/server/api/root"

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

// Data overview = output ter-infer dari router (bukan hand-written) —
// tetap sinkron saat router berubah.
export type OverviewData = AppRouterOutput["dashboard"]["getOverview"]

function useOverview(initialData: OverviewData | null | undefined, bulan?: number, tahun?: number) {
  const now = new Date()
  const b = bulan ?? now.getMonth() + 1
  const t = tahun ?? now.getFullYear()
  const isCurrentMonth = b === now.getMonth() + 1 && t === now.getFullYear()
  return api.dashboard.getOverview.useQuery(
    { tahun: t, bulan: b },
    {
      staleTime: 30000,
      initialData: isCurrentMonth ? (initialData ?? undefined) : undefined,
    }
  )
}

// ─── SEKSI 3: Kalender & Agenda (interaktif) ───
function KalenderSection({ initialData }: { initialData: OverviewData | null | undefined }) {
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const { data: d, isLoading, isError, refetch } = useOverview(initialData, calendarMonth + 1, calendarYear)

  // Saat pindah bulan (data bulan lain belum ada), tampilkan skeleton —
  // jangan render kalender kosong tanpa indikasi.
  if (isLoading && !d) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Kalender & Agenda</h2>
        </div>
        <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-[2rem] p-6 h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </div>
    )
  }

  if (isError && !d) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Kalender & Agenda</h2>
        </div>
        <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-[2rem] p-6 text-center">
          <p className="text-xs font-bold text-rose-500">Kalender gagal dimuat</p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950/20 rounded-xl cursor-pointer hover:bg-teal-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang
          </button>
        </div>
      </div>
    )
  }

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear((prev) => prev - 1)
    } else {
      setCalendarMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear((prev) => prev + 1)
    } else {
      setCalendarMonth((prev) => prev + 1)
    }
  }

  const getEventsForDay = (day: number) => {
    if (!d?.calendarEvents) return []
    return d?.calendarEvents.filter((event) => {
      const startDate = new Date(event.tanggalMulai)
      startDate.setHours(0, 0, 0, 0)

      const endDate = event.tanggalSelesai ? new Date(event.tanggalSelesai) : new Date(event.tanggalMulai)
      endDate.setHours(23, 59, 59, 999)

      const checkDate = new Date(calendarYear, calendarMonth, day, 12, 0, 0)
      return checkDate >= startDate && checkDate <= endDate
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Kalender & Agenda</h2>
      </div>

      <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-[2rem] p-6 space-y-4">
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
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((dd) => (
            <span key={dd}>{dd}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, idx) => {
            const day = idx + 1
            const today = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear()
            const dayEvents = getEventsForDay(day)
            const hasHoliday = dayEvents.some((e) => e.isLiburNasional || e.tipe === "libur")
            const hasKegiatan = dayEvents.some((e) => e.tipe === "kegiatan")
            const hasLainnya = dayEvents.some((e) => e.tipe === "lainnya")

            const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay()
            const colIndex = (firstDayIndex + idx) % 7

            let cellColorClass = "neumo-sm bg-[oklch(0.97_0.015_250)] dark:bg-[oklch(0.17_0.01_250)] text-slate-700 dark:text-slate-350"
            if (today) {
              cellColorClass = "bg-slate-900 text-white font-extrabold shadow-sm border border-slate-900 dark:bg-slate-150 dark:text-slate-900 dark:border-slate-150"
            } else if (hasHoliday || colIndex === 0) {
              cellColorClass = "neumo-sm bg-rose-50/70 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 font-extrabold"
            } else if (hasKegiatan) {
              cellColorClass = "neumo-sm bg-teal-50 dark:bg-teal-950/20 text-teal-650 dark:text-teal-400 font-extrabold"
            } else if (hasLainnya) {
              cellColorClass = "neumo-sm bg-sky-50 dark:bg-sky-950/20 text-sky-650 dark:text-sky-400 font-extrabold"
            }

            return (
              <div key={idx} className="relative group aspect-square flex items-center justify-center cursor-pointer">
                <div className={`w-8 h-8 flex items-center justify-center text-xs rounded-xl transition-all ${cellColorClass}`}>
                  {day}
                </div>
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

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight">Kegiatan Terdekat</h3>
        <div className="space-y-3">
          <div className="bg-[#e0f2fe]/60 border border-[#bae6fd]/50 p-4 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sky-600 shadow-xs flex-shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs leading-snug">Pantau Tagihan & Tunggakan SPP</p>
              <p className="text-[10px] text-sky-800/80 mt-1 font-semibold">Keuangan — {d?.pendingPayment?.count ?? 0} tagihan pending</p>
            </div>
          </div>
          <div className="bg-[#f1f5f9]/80 border border-[#cbd5e1]/50 p-4 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-xs flex-shrink-0">
              <BookOpen size={16} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-xs leading-snug">Kelola Akademik</p>
              <p className="text-[10px] text-slate-700/80 mt-1 font-semibold">{d?.classSummary?.total ?? 0} rombel aktif</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HALAMAN (shell client minimal; stats dirender server sebagai children) ───
export default function DashboardShell({
  initialOverview,
  role,
  children,
}: {
  initialOverview: OverviewData | null | undefined
  role?: string | null
  children: ReactNode
}) {
  const { data: session } = useSession()
  const user = session?.user
  const displayName = user?.name || user?.email?.split("@")[0] || "Admin"
  const effectiveRole = role || user?.role
  const router = useRouter()

  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    const getImpersonationCookie = () => {
      const match = document.cookie.match(/(?:^|; )impersonated_sekolah_id=([^;]*)/)
      return match ? match[1] : null
    }
    const impersonating = !!getImpersonationCookie()
    setIsImpersonating(impersonating)

    if (effectiveRole === "super_admin" && !impersonating) {
      router.push("/super-admin")
    }
  }, [effectiveRole, router])

  if (effectiveRole === "super_admin" && !isImpersonating) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <div className="flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} />
          <span>{effectiveRole === "siswa" ? "Portal Siswa" : "Sistem Manajemen Sekolah"}</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
          {effectiveRole === "siswa" ? "Assalamu&apos;alaikum," : "Welcome back,"}{" "}
          <span className="text-teal-600">{displayName}</span>
        </h1>
      </div>

      {effectiveRole === "siswa" ? (
        children
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">{children}</div>
          <KalenderSection initialData={initialOverview} />
        </div>
      )}
    </div>
  )
}
