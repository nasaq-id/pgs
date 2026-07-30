import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date()
  const parts = dateStr.split("-")
  if (parts.length !== 3) return new Date()
  const [y, m, d] = parts.map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date()
  return new Date(y, m - 1, d)
}

export function parseLocalTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [h, min] = timeStr.split(":").map(Number)
  return new Date(y, m - 1, d, h, min, 0)
}
