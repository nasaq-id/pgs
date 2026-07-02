"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

function RadioGroup({
  className,
  value,
  onValueChange,
  ...props
}: React.ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <RadioGroupContext.Provider value={value !== undefined && onValueChange ? { value, onValueChange } : null}>
      <div
        data-slot="radio-group"
        className={cn("flex gap-4", className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  value,
  id,
  ...props
}: React.ComponentProps<"button"> & {
  value: string
}) {
  const ctx = React.useContext(RadioGroupContext)
  const selected = ctx?.value === value

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        data-slot="radio-group-item"
        id={id}
        onClick={() => ctx?.onValueChange(value)}
        className={cn(
          "h-4 w-4 rounded-full border border-primary shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          selected ? "bg-primary" : "bg-transparent",
          className
        )}
        {...props}
      >
        {selected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground mx-auto my-auto" />}
      </button>
    </div>
  )
}

export { RadioGroup, RadioGroupItem }
