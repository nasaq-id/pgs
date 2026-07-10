"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface TimelineItemData {
  id: string
  tipe: string
  label: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
}

interface ExistingJadwalItem {
  id: string
  jpMulai: number | null
  jpCount: number | null
}

interface Props {
  timelineItems: TimelineItemData[]
  existingJadwal: ExistingJadwalItem[]
  selectedJpMulai: number | null
  selectedJpCount: number | null
  onSelect: (jpMulai: number | null) => void
  excludeId?: string
}

export default function TimelineView({
  timelineItems,
  existingJadwal,
  selectedJpMulai,
  selectedJpCount,
  onSelect,
  excludeId,
}: Props) {
  const sorted = useMemo(
    () => [...timelineItems].sort((a, b) => a.urutan - b.urutan),
    [timelineItems],
  )

  const occupiedMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const entry of existingJadwal) {
      if (entry.id === excludeId) continue
      if (entry.jpMulai !== null && entry.jpCount !== null) {
        for (let i = 0; i < entry.jpCount; i++) {
          map.set(entry.jpMulai + i, entry.id)
        }
      }
    }
    return map
  }, [existingJadwal, excludeId])

  const jpSlots = useMemo(() => {
    const slots: {
      jpNumber: number
      jamMulai: string
      jamSelesai: string
      occupied: boolean
      selected: boolean
    }[] = []
    let counter = 0
    for (const item of sorted) {
      if (item.tipe === "jp") {
        counter++
        const isOccupied = occupiedMap.has(counter)
        const isSelected =
          selectedJpMulai !== null &&
          selectedJpCount !== null &&
          counter >= selectedJpMulai &&
          counter < selectedJpMulai + selectedJpCount
        slots.push({
          jpNumber: counter,
          jamMulai: item.jamMulai,
          jamSelesai: item.jamSelesai,
          occupied: isOccupied,
          selected: isSelected,
        })
      }
    }
    return slots
  }, [sorted, occupiedMap, selectedJpMulai, selectedJpCount])

  const nonJpItems = useMemo(
    () => sorted.filter((t) => t.tipe !== "jp"),
    [sorted],
  )

  const handleSlotClick = (jpNumber: number) => {
    if (occupiedMap.has(jpNumber)) return
    if (selectedJpMulai === jpNumber) {
      onSelect(null)
    } else {
      onSelect(jpNumber)
    }
  }

  return (
    <div className="space-y-1">
      {jpSlots.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2 text-center">
          Tidak ada slot JP untuk hari ini
        </p>
      )}

      {jpSlots.map((slot, idx) => {
        const nextNonJp = nonJpItems.find(
          (n) =>
            n.jamMulai >= slot.jamSelesai &&
            (idx + 1 >= jpSlots.length || n.jamSelesai <= jpSlots[idx + 1]?.jamMulai),
        )
        const showNonJpAfter = nextNonJp && nextNonJp.jamMulai === slot.jamSelesai

        return (
          <div key={slot.jpNumber}>
            <div
              onClick={() => handleSlotClick(slot.jpNumber)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                slot.occupied
                  ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400 cursor-not-allowed"
                  : slot.selected
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300 cursor-pointer"
                    : "bg-card border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer",
              )}
            >
              <span className="font-medium text-xs min-w-[3ch]">
                JP {slot.jpNumber}
              </span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {slot.jamMulai}–{slot.jamSelesai}
              </span>
              <span className="text-xs ml-auto">
                {slot.occupied
                  ? "Terisi"
                  : slot.selected
                    ? "Dipilih"
                    : "Kosong"}
              </span>
            </div>

            {showNonJpAfter && nextNonJp && (
              <div className="flex items-center gap-2 px-3 py-1.5 ml-4 my-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800 dark:text-amber-400">
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {nextNonJp.tipe}
                </span>
                <span className="text-[11px]">
                  {nextNonJp.jamMulai}–{nextNonJp.jamSelesai}
                </span>
                {nextNonJp.label && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-300">
                    · {nextNonJp.label}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex items-center gap-3 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
          <span className="text-[10px] text-muted-foreground">Terisi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-50 border border-blue-300" />
          <span className="text-[10px] text-muted-foreground">Dipilih</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-card border border-border" />
          <span className="text-[10px] text-muted-foreground">Kosong</span>
        </div>
      </div>
    </div>
  )
}
