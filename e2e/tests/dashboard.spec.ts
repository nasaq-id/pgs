import { test, expect } from "../fixtures/auth"

test.describe("Dashboard Navigation", () => {
  const routes = [
    { path: "/", name: "Dashboard" },
    { path: "/absensi", name: "Absensi" },
    { path: "/siswa", name: "Siswa" },
  ]

  for (const { path, name } of routes) {
    test(`${name} dapat diakses`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState("networkidle")

      await expect(page).toHaveURL((url) => url.pathname === path)
      await expect(page.locator("body")).toBeVisible()
    })
  }
})
