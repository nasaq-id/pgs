"use client"

import { useEffect, useState } from "react"

export function DeferredPushRegister() {
  const [Provider, setProvider] = useState<(() => React.ReactNode) | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    let cancelled = false
    const timer = window.setTimeout(() => {
      void import("./PushRegister").then(({ PushRegister }) => {
        if (!cancelled) setProvider(() => PushRegister)
      })
    }, 1500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return Provider ? <Provider /> : null
}
