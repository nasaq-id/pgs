import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { cookies } from "next/headers"
import DashboardPage from "./dashboard-page"

export const dynamic = "force-dynamic"

export default async function DashboardServerPage() {
  const queryClient = new QueryClient()
  const ctx = await createTRPCContext()
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx,
    queryClient,
  })

  const session = ctx.session
  const role = session?.user?.role as string | undefined

  let impersonating = false
  try {
    impersonating = !!(await cookies()).get("impersonated_sekolah_id")?.value
  } catch {
    // non-request context
  }

  if (session?.user && !(role === "super_admin" && !impersonating)) {
    const now = new Date()
    await helpers.dashboard.getOverview
      .prefetch({ tahun: now.getFullYear(), bulan: now.getMonth() + 1 })
      .catch(() => {})
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardPage />
    </HydrationBoundary>
  )
}
