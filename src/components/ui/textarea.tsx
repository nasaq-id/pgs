import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[60px] w-full min-w-0 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 px-3 py-2 text-base transition-all outline-none placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-teal-500/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
