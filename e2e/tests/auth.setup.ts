import { test as setup } from "@playwright/test"
import { login } from "../fixtures/auth"

const authFile = "e2e/.auth/user.json"

setup("authenticate", async ({ page }) => {
  await login(page)
  await page.context().storageState({ path: authFile })
})
