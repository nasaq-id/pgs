"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { BookOpen, CalendarDays } from "lucide-react"
import MapelPage from "./mapel/page"
import JadwalPage from "./jadwal/page"

const TABS = [
  { value: "mata-pelajaran", label: "Mata Pelajaran", icon: BookOpen },
  { value: "jadwal", label: "Jadwal Pelajaran", icon: CalendarDays },
]

export default function AkademikPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = searchParams.get("tab") || "mata-pelajaran"

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Akademik</h2>
        <p className="text-muted-foreground">Kelola mata pelajaran dan jadwal pelajaran</p>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? "border-[hsl(142_72%_40%)] text-[hsl(142_72%_40%)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        {tab === "mata-pelajaran" && <MapelPage />}
        {tab === "jadwal" && <JadwalPage />}
      </div>
    </div>
  )
}
