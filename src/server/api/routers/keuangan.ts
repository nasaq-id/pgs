

import { router } from "@/server/api/trpc"

import { billingRouter } from "./finance-billing"
import { paymentRouter } from "./finance-payment"
import { discountRouter } from "./finance-discount"
import { reportRouter } from "./finance-report"
import { settingsRouter } from "./finance-settings"

export const keuanganRouter = router({
  // ─── New bounded context sub-routers ─────────────────────
  billing: billingRouter,
  payment: paymentRouter,
  discount: discountRouter,
  report: reportRouter,
  settings: settingsRouter,
})
