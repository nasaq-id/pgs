"use client"

import { useState, useRef, useCallback } from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: Option[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  contentClassName?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Pilih...",
  disabled = false,
  loading = false,
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ditemukan",
  className,
  contentClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setSearch("")
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [])

  const handleValueChange = useCallback(
    (newValue: string | null) => {
      if (newValue !== null) {
        onValueChange(newValue)
      }
    },
    [onValueChange]
  )

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
  }, [])

  const selectedLabel = options.find((o) => o.value === value)?.label

  return (
    <Select open={open} onOpenChange={handleOpenChange} value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>{selectedLabel || placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent className={cn("p-0", contentClassName)}>
        <div
          className="p-2 pb-1 sticky top-0 z-10 bg-background/80 backdrop-blur-md"
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
          onClick={stopPropagation}
        >
          <Input
            ref={searchRef}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={stopPropagation}
            onKeyUp={stopPropagation}
          />
        </div>
        <div className="max-h-60 overflow-y-auto px-1 pb-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            filtered.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  )
}
