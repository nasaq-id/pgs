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

      <div className="bg-slate-100/80 dark:bg-slate-900/60 p-1.5 rounded-2xl flex flex-wrap gap-1 sm:gap-1.5 w-full sm:w-max">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
              className={`flex-1 shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-teal-650 dark:text-teal-400 shadow-sm border border-slate-200/20 dark:border-slate-700/50"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <div className={tab === "mata-pelajaran" ? "block" : "hidden"}>
          <MapelPage />
        </div>
        <div className={tab === "jadwal" ? "block" : "hidden"}>
          <JadwalPage />
        </div>
      </div>
    </div>
  )
}
