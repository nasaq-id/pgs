"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

interface SelectContextType {
  options?: { value: string; label: string }[]
  registerItem?: (value: string, label: string) => void
  itemLabelsMap?: Map<string, string>
}

const SelectContext = React.createContext<SelectContextType>({})

function Select<Value extends string = string>({
  options,
  children,
  onValueChange,
  ...props
}: Omit<SelectPrimitive.Root.Props<Value, false>, "onValueChange"> & {
  options?: { value: Value; label: string }[]
  onValueChange?: (value: Value | null) => void
}) {
  const [itemLabelsMap, setItemLabelsMap] = React.useState(() => new Map<string, string>())

  const registerItem = React.useCallback((val: string, label: string) => {
    if (!val || !label) return
    setItemLabelsMap((prev) => {
      if (prev.get(val) === label) return prev
      const next = new Map(prev)
      next.set(val, label)
      return next
    })
  }, [])

  return (
    <SelectContext.Provider value={{ options: options as any, registerItem, itemLabelsMap }}>
      <SelectPrimitive.Root<Value, false>
        {...props}
        onValueChange={onValueChange}
        items={options}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  className,
  placeholder,
  children,
  ...props
}: SelectPrimitive.Value.Props & { placeholder?: string }) {
  const { options, itemLabelsMap } = React.useContext(SelectContext)

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    >
      {(value: any) => {
        if (children && typeof children === "function") {
          return (children as any)(value)
        }
        if (value === null || value === undefined || value === "") {
          return placeholder || ""
        }
        if (typeof value === "object" && value !== null) {
          if ("label" in value) return (value as any).label
        }
        const valStr = String(value)
        if (options) {
          const matched = options.find((o) => o.value === valStr)
          if (matched) return matched.label
        }
        if (itemLabelsMap && itemLabelsMap.has(valStr)) {
          return itemLabelsMap.get(valStr)
        }
        return valStr
      }}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-1.5 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] border-0 py-2 pr-2 pl-3 text-sm whitespace-nowrap transition-all outline-none select-none cursor-pointer focus-visible:ring-3 focus-visible:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 data-[size=sm]:rounded-[var(--radius-md)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[open]:ring-3 data-[open]:ring-teal-500/10 data-[state=open]:ring-3 data-[state=open]:ring-teal-500/10 [&_svg]:data-[open]:rotate-180 [&_svg]:data-[open]:text-teal-500 [&_svg]:data-[state=open]:rotate-180 [&_svg]:data-[state=open]:text-teal-500 [&_svg]:transition-transform [&_svg]:duration-200",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  /*
   * Popup selalu ter-mount (hidden saat tertutup) — setara forceMount base-ui.
   * Dengan ini seluruh SelectItem mendaftarkan label-nya sejak render awal,
   * sehingga SelectValue langsung menampilkan label (bukan value mentah
   * seperti "all" / UUID) tanpa menunggu dropdown dibuka dulu.
   */
  const [mounted, setMounted] = React.useState(false)
  React.useLayoutEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <SelectPrimitive.Positioner
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      alignItemWithTrigger={alignItemWithTrigger}
      className="isolate z-[10000]"
    >
      <SelectPrimitive.Popup
        data-slot="select-content"
        data-align-trigger={alignItemWithTrigger}
        className={cn("relative isolate z-[10000] max-h-(--available-height) min-w-(--anchor-width) w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-2xl glass text-popover-foreground duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.List>{children}</SelectPrimitive.List>
        <SelectScrollDownButton />
      </SelectPrimitive.Popup>
    </SelectPrimitive.Positioner>,
    document.body
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  value,
  label,
  ...props
}: SelectPrimitive.Item.Props & { label?: string }) {
  const { registerItem } = React.useContext(SelectContext)

  React.useLayoutEffect(() => {
    if (value) {
      const labelText = label || (typeof children === "string" ? children : undefined)
      if (labelText) {
        registerItem?.(String(value), labelText)
      }
    }
  }, [value, label, children, registerItem])

  return (
    <SelectPrimitive.Item
      value={value}
      label={label}
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-1.5 rounded-lg py-2.5 pr-8 pl-4 text-xs sm:text-[13px] outline-hidden select-none transition-colors duration-150 text-slate-700 dark:text-slate-350 focus:bg-slate-50 dark:focus:bg-slate-900/60 focus:text-slate-900 dark:focus:text-slate-100 data-[highlighted]:bg-slate-50 dark:data-[highlighted]:bg-slate-900/60 data-[selected]:bg-teal-50/50 dark:data-[selected]:bg-teal-950/20 data-[selected]:text-teal-600 dark:data-[selected]:text-teal-400 data-[selected]:font-bold data-[state=checked]:bg-teal-50/50 dark:data-[state=checked]:bg-teal-950/20 data-[state=checked]:text-teal-600 dark:data-[state=checked]:text-teal-400 data-[state=checked]:font-bold data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-teal-600 dark:text-teal-450" />
        }
      >
        <CheckIcon className="pointer-events-none size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
