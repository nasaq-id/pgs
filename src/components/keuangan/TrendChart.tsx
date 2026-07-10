"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

interface DataPoint {
  bulan: number
  total: number
  paid: number
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

interface Props {
  data: DataPoint[]
  loading?: boolean
}

export default function TrendChart({ data, loading }: Props) {
  const chartData = data.map((d) => ({
    name: BULAN[d.bulan - 1] || `B${d.bulan}`,
    Tagihan: d.total,
    Terbayar: d.paid,
  }))

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Tren Pembayaran</h3>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Memuat...</div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 13 }}
            />
            <Bar dataKey="Tagihan" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Terbayar" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
