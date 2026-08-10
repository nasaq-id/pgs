import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
}

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export function Pagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null
  const endItem = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null

  return (
    <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        {totalItems != null && pageSize != null
          ? `Menampilkan ${startItem}-${endItem} dari ${totalItems} data`
          : `Halaman ${currentPage} dari ${totalPages}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getPaginationPages(currentPage, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
          ) : (
            <Button
              key={p}
              variant={currentPage === p ? "default" : "outline"}
              size="icon"
              className={`h-8 w-8 text-xs font-bold rounded-xl transition-all ${
                currentPage === p
                  ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm scale-105"
                  : "border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
