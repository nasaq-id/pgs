"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { DashboardStats, SiswaStats } from "./dashboard-stats"

// Fallback saat fetch server gagal: fetch dari client dengan retry react-query
// dan tampilkan error + tombol muat ulang. Ini menggantikan skeleton permanen.
export default function DashboardStatsClient({ role }: { role?: string | null }) {
  const now = new Date()
  const { data, isLoading, isError, refetch } = api.dashboard.getOverview.useQuery(
    { tahun: now.getFullYear(), bulan: now.getMonth() + 1 },
    { retry: 2, staleTime: 30000 }
  )

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (isError && !data) {
    return (
      <div className="neumo-card bg-background p-10 rounded-[2rem] text-center">
        <p className="text-sm font-bold text-rose-500">Data dashboard gagal dimuat</p>
        <p className="text-[11px] text-muted-foreground mt-1.5">Coba muat ulang — jika terus gagal, hubungi administrator.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950/20 rounded-xl cursor-pointer hover:bg-teal-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Muat Ulang
        </button>
      </div>
    )
  }

  if (!data) return null
  return role === "siswa" ? <SiswaStats data={data} /> : <DashboardStats data={data} />
}
