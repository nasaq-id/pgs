"use client"

import SiswaListView from "@/components/siswa/SiswaListView"

export default function SiswaTidakAktifPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Alumni / Tidak Aktif</h2>
        <p className="text-muted-foreground">Data siswa alumni atau tidak aktif</p>
      </div>
      <SiswaListView activeTab="tidak_aktif" />
    </div>
  )
}
