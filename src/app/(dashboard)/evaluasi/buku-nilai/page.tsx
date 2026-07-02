"use client"

import { ClipboardCheck, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function BukuNilaiPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Buku Nilai</h2>
          <p className="text-muted-foreground">Evaluasi dan rekapitulasi nilai pembelajaran siswa</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" /> Input Nilai
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input placeholder="Cari kelas atau mapel..." className="max-w-sm" disabled />
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Fitur Segera Hadir</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Kelola penilaian harian, PTS, PAS, dan rapor siswa secara terintegrasi.
            Fitur ini sedang dalam tahap pengembangan.
          </p>
        </div>
      </Card>
    </div>
  )
}
