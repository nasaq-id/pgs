"use client"

import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface Column<T> {
  header: string
  accessor: (item: T) => React.ReactNode
  hideOnMobile?: boolean
  className?: string
  headerClassName?: string
  mobileLabel?: string
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string | number
  onRowClick?: (item: T) => void
  emptyMessage?: string
  isLoading?: boolean
  loadingCount?: number
  mobileCardTitle?: (item: T) => React.ReactNode
  containerClass?: string
  tableClass?: string
  mobileCardActions?: (item: T) => React.ReactNode
}

export default function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "Tidak ada data",
  isLoading = false,
  loadingCount = 5,
  mobileCardTitle,
  containerClass,
  tableClass,
  mobileCardActions,
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col, i) => (
                  <TableHead key={i} className={cn("text-[10px] font-black uppercase tracking-wider", col.headerClassName)}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingCount }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full rounded-lg" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: loadingCount }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 space-y-2">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
            </div>
          ))}
        </div>
      </>
    )
  }

  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground font-semibold text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[22px]">
        {emptyMessage}
      </div>
    )
  }

  const visibleColumns = columns.filter((c) => !c.hideOnMobile)

  return (
    <>
      {/* Desktop table */}
      <div className={cn("hidden md:block", containerClass)}>
        <Table className={tableClass}>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead
                  key={i}
                  className={cn(
                    "text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={keyExtractor(item)}
                className={cn(
                  "hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col, i) => (
                  <TableCell key={i} className={cn("text-xs", col.className)}>
                    {col.accessor(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {data.map((item) => {
          const k = keyExtractor(item)
          return (
            <div
              key={k}
              className={cn(
                "glass-card rounded-2xl p-4 space-y-2.5",
                onRowClick && "cursor-pointer active:scale-[0.99] transition-transform",
              )}
              onClick={() => onRowClick?.(item)}
            >
              {mobileCardTitle && (
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-1">
                  {mobileCardTitle(item)}
                </div>
              )}
              {visibleColumns.map((col, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  {col.mobileLabel && (
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 min-w-[80px]">
                      {col.mobileLabel}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-right flex-1">
                    {col.accessor(item)}
                  </span>
                </div>
              ))}
              {mobileCardActions && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-1 flex justify-end gap-2">
                  {mobileCardActions(item)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
