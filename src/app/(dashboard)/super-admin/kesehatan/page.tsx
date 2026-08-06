"use client"

import { Activity, Sparkles } from "lucide-react"
import PlatformMetricsTab from "../_components/PlatformMetricsTab"

export default function KesehatanPlatformPage() {
  return (
    <div className="space-y-6 text-left">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-teal-655 bg-teal-50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={12} />
            <span>Platform Diagnostics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase flex items-center gap-2">
            <Activity size={24} className="text-teal-600" />
            <span>Kesehatan Platform</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Pemantauan performa database, beban CPU server, penyimpanan berkas, dan latensi TRPC secara real-time.
          </p>
        </div>
      </div>

      {/* ── Diagnostics Content ── */}
      <PlatformMetricsTab />
    </div>
  )
}
