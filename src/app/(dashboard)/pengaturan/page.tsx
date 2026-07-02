"use client"

import { Settings } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function PengaturanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
        <p className="text-muted-foreground">Pengaturan sistem dan preferensi aplikasi</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Fitur Segera Hadir</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Halaman pengaturan sistem sedang dalam tahap pengembangan.
          </p>
        </div>
      </Card>
    </div>
  )
}
