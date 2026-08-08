"use client"

import SiswaListView from "@/components/siswa/SiswaListView"

export default function SiswaMutasiKeluarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mutasi Keluar</h2>
        <p className="text-muted-foreground">Catat dan kelola siswa yang pindah keluar</p>
      </div>
      <SiswaListView activeTab="mutasi_keluar" />
    </div>
  )
}
