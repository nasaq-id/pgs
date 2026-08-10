import { test, expect } from "../fixtures/auth"

test.describe("Authentication", () => {
  test("session tersimpan dan dashboard dapat diakses", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL((url) => url.pathname === "/")
    await expect(page.locator("body")).toBeVisible()
  })

  test("login gagal dengan kredensial salah", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/username/i).fill("wrong@example.com")
    await page.getByLabel(/kata sandi/i).fill("wrongpassword")
    await page.getByRole("button", { name: /masuk/i }).click()

    await expect(
      page.getByText(/username.*password salah/i)
    ).toBeVisible({ timeout: 5000 })
  })
})
