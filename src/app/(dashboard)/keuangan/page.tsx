"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StatCard from "@/components/keuangan/StatCard"
import TrendChart from "@/components/keuangan/TrendChart"
import { DollarSign, CreditCard, AlertTriangle, TrendingUp, Clock } from "lucide-react"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

export default function KeuanganDashboardPage() {
  const tahunSkrg = new Date().getFullYear()
  const [tahun] = useState(tahunSkrg)

  const { data: summary, isLoading: summaryLoading } = api.keuangan.report.dashboardSummary.useQuery({ tahun })
  const { data: trend, isLoading: trendLoading } = api.keuangan.report.monthlyTrend.useQuery({ tahun })
  const { data: pendingCount } = api.keuangan.payment.getPendingCount.useQuery()

  const now = new Date()
  const bulanIni = now.getMonth() + 1

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Keuangan</h2>
        <p className="text-muted-foreground">Ringkasan keuangan {BULAN[bulanIni - 1]} {tahun}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          label="Total Piutang"
          value={summaryLoading ? "..." : fmtRupiah(summary?.totalPiutang || 0)}
          sub="Bulan ini"
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
          label="Terkumpul"
          value={summaryLoading ? "..." : fmtRupiah(summary?.totalTerbayar || 0)}
          sub={`Sisa: ${fmtRupiah(summary?.sisaPiutang || 0)}`}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label="Menunggak"
          value={summaryLoading ? "..." : String(summary?.jumlahMenunggak || 0)}
          sub={`Dari ${summary?.totalSiswa || 0} siswa`}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          label="Kepatuhan"
          value={summaryLoading ? "..." : `${summary?.tingkatKepatuhan || 0}%`}
          trend={summary && summary.tingkatKepatuhan >= 70 ? "up" : "down"}
        />
      </div>

      <TrendChart data={trend || []} loading={trendLoading} />

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Perlu Tindakan</h3>
        {pendingCount && pendingCount > 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">{pendingCount} pembayaran</span> menunggu verifikasi
            </div>
            <Badge variant="secondary" className="ml-auto">{pendingCount}</Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Tidak ada tindakan yang perlu dilakukan.</p>
        )}
      </Card>
    </div>
  )
}
