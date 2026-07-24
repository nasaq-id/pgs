"use client"

import { BookMarked } from "lucide-react"

export default function KurikulumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Kurikulum</h2>
        <p className="text-sm text-muted-foreground">Kelola kurikulum dan struktur pembelajaran</p>
      </div>
      <div className="neumo-card bg-background rounded-[24px] p-12 text-center">
        <BookMarked className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Kurikulum</h3>
        <p className="text-muted-foreground">Halaman ini akan menampilkan dan mengelola data kurikulum.</p>
      </div>
    </div>
  )
}
