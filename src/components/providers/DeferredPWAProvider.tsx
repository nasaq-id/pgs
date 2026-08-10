"use client"

import { useEffect, useState } from "react"

export function DeferredPWAProvider() {
  const [Provider, setProvider] = useState<(() => React.ReactNode) | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker?.getRegistrations().then((registrations) => {
        return Promise.all(registrations.map((registration) => registration.unregister()))
      })
      if ("caches" in window) {
        void window.caches.keys().then((keys) => {
          return Promise.all(
            keys
              .filter((key) => key.startsWith("edumanage-"))
              .map((key) => window.caches.delete(key)),
          )
        })
      }
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void import("./PWAProvider").then(({ PWAProvider }) => {
        if (!cancelled) setProvider(() => PWAProvider)
      })
    }, 1500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return Provider ? <Provider /> : null
}
