import { test as base, expect } from "@playwright/test"

// Production build test: service worker aktif, /api/* tidak boleh masuk Cache Storage.
// Test ini tidak boleh auto-unregister SW (beda dengan fixtures/auth).
const test = base

test("API responses tidak masuk service worker cache", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  expect(email, "E2E_TEST_EMAIL harus diisi").toBeTruthy()
  expect(password, "E2E_TEST_PASSWORD harus diisi").toBeTruthy()

  await page.goto("/login")
  await page.getByLabel(/username/i).fill(email!)
  await page.getByLabel(/kata sandi/i).fill(password!)
  await page.getByRole("button", { name: /masuk/i }).click()
  await page.waitForURL("/", { timeout: 20000 })

  // Tunggu service worker terdaftar dan aktif (PWAProvider daftarkan di production)
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller || "serviceWorker" in navigator,
    undefined,
    { timeout: 15000 }
  )
  await page.waitForTimeout(4000)

  const result = await page.evaluate(async () => {
    const keys = await caches.keys()
    const cachedUrls: string[] = []
    for (const key of keys) {
      const cache = await caches.open(key)
      const requests = await cache.keys()
      for (const req of requests) {
        cachedUrls.push(req.url)
      }
    }
    return { keys, cachedUrls }
  })

  const apiCached = result.cachedUrls.filter((u) => u.includes("/api/"))
  expect(apiCached, `API tidak boleh ter-cache. Cache: ${result.keys.join(", ")}`).toEqual([])
})
