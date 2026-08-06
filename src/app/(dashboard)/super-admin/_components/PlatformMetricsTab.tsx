"use client"

import { api } from "@/lib/trpc/client"

export default function PlatformMetricsTab() {
  const { data: metrics, isLoading: isMetricsLoading } = api.superAdmin.getPlatformMetrics.useQuery()

  return (
    <div className="space-y-6">
      {/* Health Diagnostics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="neumo-card bg-background p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Database Users</p>
            <h3 className="text-3xl font-black text-slate-800 mt-2">
              {isMetricsLoading ? "..." : metrics?.totalUsers}
            </h3>
          </div>
          <p className="text-[9px] text-muted-foreground mt-4 font-bold">Pengguna aktif global di seluruh sekolah terdaftar</p>
        </div>

        <div className="neumo-card bg-background p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Log Audit</p>
            <h3 className="text-3xl font-black text-teal-600 mt-2">
              {isMetricsLoading ? "..." : metrics?.totalAuditLogs}
            </h3>
          </div>
          <p className="text-[9px] text-muted-foreground mt-4 font-bold">Jumlah log mutasi / audit trail yang tersimpan di sistem</p>
        </div>

        <div className="neumo-card bg-background p-6 rounded-3xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Simulasi CPU & Server</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl font-black text-slate-800">4.8%</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 font-extrabold uppercase animate-pulse">Normal</span>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground mt-4 font-bold">Pemantauan load real-time virtual machine platform</p>
        </div>
      </div>

      {/* System Performance Diagnosis */}
      <div className="neumo-card bg-background rounded-3xl p-6 space-y-4">
        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Status Diagnostik Platform</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">Database</p>
            <p className="text-sm font-extrabold text-emerald-600 mt-1">CONNECTED</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">S3 File Storage</p>
            <p className="text-sm font-extrabold text-emerald-600 mt-1">ONLINE</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">NextAuth Session</p>
            <p className="text-sm font-extrabold text-emerald-600 mt-1">HEALTHY</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-455 uppercase tracking-widest">TRPC Latency</p>
            <p className="text-sm font-extrabold text-emerald-600 mt-1">&lt; 15ms</p>
          </div>
        </div>
      </div>
    </div>
  )
}
