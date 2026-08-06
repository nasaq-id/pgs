"use client"

export type StatusAbsensi = "hadir" | "terlambat" | "izin" | "sakit" | "alpha"

export const STATUS_ORDER: StatusAbsensi[] = ["hadir", "terlambat", "izin", "sakit", "alpha"]

export const STATUS_LABELS: Record<StatusAbsensi, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin: "Izin",
  sakit: "Sakit",
  alpha: "Alpha",
}

export const STATUS_ACTIVE_CLASS: Record<StatusAbsensi, string> = {
  hadir: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  terlambat: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  izin: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
  sakit: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400",
  alpha: "bg-destructive/15 text-destructive border-destructive/30",
}

export const STATUS_DOT_CLASS: Record<StatusAbsensi, string> = {
  hadir: "bg-emerald-500",
  terlambat: "bg-amber-500",
  izin: "bg-blue-500",
  sakit: "bg-purple-500",
  alpha: "bg-red-500",
}

/**
 * Segmented control compact satu baris untuk memilih status absensi.
 * Menggantikan 5 tombol terpisah yang wrap ke 2 baris.
 */
export function StatusSegmented({
  value,
  onChange,
}: {
  value: StatusAbsensi
  onChange: (status: StatusAbsensi) => void
}) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/40 w-full min-w-[240px]">
      {STATUS_ORDER.map((st) => (
        <button
          key={st}
          type="button"
          onClick={() => onChange(st)}
          className={`flex-1 px-1 py-1.5 rounded-[10px] text-[9.5px] font-black uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap ${
            value === st
              ? STATUS_ACTIVE_CLASS[st]
              : "bg-transparent text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          {STATUS_LABELS[st]}
        </button>
      ))}
    </div>
  )
}
