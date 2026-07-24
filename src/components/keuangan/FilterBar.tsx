"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface Props {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (v: string) => void
  filters?: {
    key: string
    label: string
    options: { value: string; label: string }[]
    value: string
    onChange: (v: string) => void
  }[]
}

export default function FilterBar({ searchPlaceholder = "Cari...", searchValue, onSearchChange, filters }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
      {filters?.map((f) => (
        <Select key={f.key} value={f.value} onValueChange={(v) => f.onChange(v ?? "")} options={f.options}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      <div className="flex items-center gap-2 sm:ml-auto">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 h-10 w-[200px]"
          />
        </div>
        <Button type="button" variant="secondary" className="h-10 px-4">
          Cari
        </Button>
      </div>
    </div>
  )
}
