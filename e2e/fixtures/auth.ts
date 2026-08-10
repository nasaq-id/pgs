import { test as base, expect, type Page } from "@playwright/test"

export const test = base.extend<{ cleanPage: Page }>({
  cleanPage: [
    async ({ page, context }, next) => {
      await context.addInitScript(() => {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister()
            }
          })
        }
      })
      await next(page)
    },
    { auto: true },
  ],
})

export { expect }

export async function login(page: Page) {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in environment variables"
    )
  }

  await page.goto("/login")
  await page.getByLabel(/username/i).fill(email)
  await page.getByLabel(/kata sandi/i).fill(password)
  await page.getByRole("button", { name: /masuk/i }).click()

  await page.waitForURL("/", { timeout: 15000 })
  await page.waitForLoadState("networkidle")
}
