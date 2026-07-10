"use client"

import { type ReactNode } from "react"
import { Card } from "@/components/ui/card"

interface Props {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
}

export default function StatCard({ icon, label, value, sub, trend, trendLabel }: Props) {
  return (
    <Card className="p-4 flex items-start gap-4">
      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {(sub || trendLabel) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {trend === "up" && <span className="text-emerald-600">↑ </span>}
            {trend === "down" && <span className="text-red-600">↓ </span>}
            {trendLabel || sub}
          </p>
        )}
      </div>
    </Card>
  )
}
