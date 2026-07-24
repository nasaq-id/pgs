"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500/15 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-teal-600 data-[state=checked]:bg-teal-600 data-[checked]:border-teal-600 data-[state=checked]:border-teal-600 data-[checked]:text-white data-[state=checked]:text-white data-[checked]:shadow-none data-[state=checked]:shadow-none transition-all duration-200 cursor-pointer flex items-center justify-center",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <CheckIcon className="h-3 w-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
