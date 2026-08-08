"use client"

import SiswaListView from "@/components/siswa/SiswaListView"

export default function SiswaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Siswa Aktif</h2>
        <p className="text-muted-foreground">Kelola data siswa yang masih aktif</p>
      </div>
      <SiswaListView activeTab="aktif" />
    </div>
  )
}
