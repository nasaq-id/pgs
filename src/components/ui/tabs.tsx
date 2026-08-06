"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] p-1.5 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, children, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "group relative inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer text-muted-foreground hover:text-foreground data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-xl neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] opacity-0 transition-opacity duration-200 group-data-[state=active]:opacity-100"
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">{children}</span>
    </TabsPrimitive.Tab>
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
