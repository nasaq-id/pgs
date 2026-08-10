const CACHE = "edumanage-v5"

const STATIC_ASSETS = [
  "/icon-192.svg",
  "/icon-512.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never let the service worker cache Next.js chunks or RSC payloads. These
  // responses are deployment-specific and mixing versions breaks module
  // factories during development and after a deployment.
  const isNextInternalRequest =
    url.origin !== self.location.origin ||
    request.method !== "GET" ||
    url.pathname.startsWith("/_next/") ||
    url.searchParams.has("_rsc") ||
    request.headers.has("RSC") ||
    request.headers.has("Next-Router-State-Tree")
  if (isNextInternalRequest) return

  // API calls - network only, never cache. All API responses are
  // authenticated (tRPC, auth session, CSRF). Caching them would leak
  // user data across sessions on a shared browser and serve stale
  // session/data while offline.
  if (url.pathname.startsWith("/api/")) {
    return
  }

  // Navigasi halaman - network first (user selalu dapat versi terbaru),
  // cache hanya fallback saat offline
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request))
    return
  }

  // Static assets - cache first
  event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response("Offline", { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || "EduManage", {
      body: data.body || "",
      icon: data.icon || "/icon-192.svg",
      badge: "/icon-192.svg",
      vibrate: [100, 50, 100],
      data: data.data || {},
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      const client = windowClients.find((c) => c.url === url && "focus" in c)
      if (client) return client.focus()
      return clients.openWindow(url)
    }),
  )
})
