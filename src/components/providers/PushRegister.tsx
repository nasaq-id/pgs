"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { Bell, X } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const binary = String.fromCharCode.apply(null, new Uint8Array(buffer) as any)
  return window.btoa(binary)
}

export function PushRegister() {
  const { data: session } = useSession()
  const [showPrompt, setShowPrompt] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

  const savePushMutation = api.notifikasi.savePushSubscription.useMutation()
  const savePushRef = useRef(savePushMutation)
  const syncedUserRef = useRef<string | null>(null)

  useEffect(() => {
    savePushRef.current = savePushMutation
  }, [savePushMutation])

  const subscribeUser = useCallback(async (reg: ServiceWorkerRegistration) => {
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.warn("VAPID Public Key not set in environment.")
        return
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

      // Cek subscription lama: browser menolak subscribe dengan application server key berbeda
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        const existingKey = existing.options?.applicationServerKey as ArrayBuffer | null | undefined
        const sameKey =
          !!existingKey &&
          existingKey.byteLength === applicationServerKey.byteLength &&
          new Uint8Array(existingKey).every((v, i) => v === applicationServerKey[i])

        if (!sameKey) {
          // VAPID key berubah — unsub dulu supaya bisa subscribe ulang
          await existing.unsubscribe()
        } else {
          // Key sama — cukup sinkron subscription ke server
          const p256dh = existing.getKey("p256dh")
          const auth = existing.getKey("auth")
          if (p256dh && auth) {
            await savePushRef.current.mutateAsync({
              endpoint: existing.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(p256dh),
                auth: arrayBufferToBase64(auth),
              },
            })
          }
          return
        }
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      const p256dh = subscription.getKey("p256dh")
      const auth = subscription.getKey("auth")

      if (p256dh && auth) {
        await savePushRef.current.mutateAsync({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dh),
            auth: arrayBufferToBase64(auth),
          },
        })
      }
    } catch (err) {
      console.error("Gagal mendaftarkan push notification:", err)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return
    }

    if (!session?.user?.id) return

    // Sinkronkan subscription hanya SEKALI per user session. Tanpa guard ini,
    // effect re-run tiap render (subscribeUser stabil tapi session objek baru)
    // dan membanjiri server dengan POST savePushSubscription berulang.
    if (syncedUserRef.current === session.user.id) return
    syncedUserRef.current = session.user.id

    // Register service worker and check permission
    navigator.serviceWorker.ready.then((reg) => {
      setSwRegistration(reg)

      // If notification permission is default, show custom neomorphic prompt after 3 seconds
      if (Notification.permission === "default") {
        const timer = setTimeout(() => {
          setShowPrompt(true)
        }, 3000)
        return () => clearTimeout(timer)
      } else if (Notification.permission === "granted") {
        // Automatically sync/refresh subscription to server
        subscribeUser(reg)
      }
    })
  }, [session?.user?.id, subscribeUser])

  const handleRequestPermission = async () => {
    setShowPrompt(false)
    if (!swRegistration) return

    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        await subscribeUser(swRegistration)
      }
    } catch (err) {
      console.error("Gagal meminta izin notifikasi:", err)
    }
  }

  return (
    <>
      {showPrompt && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full p-5 rounded-2xl bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] neumo-card-clean border border-teal-500/10 text-left shadow-2xl animate-fade-in">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                  Aktifkan Notifikasi
                </h4>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => setShowPrompt(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        aria-label="Tutup"
                      />
                    }
                  >
                    <X className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipPositioner side="bottom">
                      <TooltipPopup>Tutup</TooltipPopup>
                    </TooltipPositioner>
                  </TooltipPortal>
                </Tooltip>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                Dapatkan pemberitahuan langsung di status bar HP Anda saat ada pengumuman baru dari sekolah.
              </p>
              
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setShowPrompt(false)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-250 cursor-pointer rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleRequestPermission}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border-0 rounded-lg hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
                >
                  Aktifkan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
