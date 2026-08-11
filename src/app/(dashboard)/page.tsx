import { QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { cookies } from "next/headers"
import DashboardShell, { type OverviewData } from "./dashboard-page"
import { DashboardStats, SiswaStats, DashboardStatsFallback } from "./dashboard-stats"
import DashboardStatsClient from "./dashboard-stats-client"

export const dynamic = "force-dynamic"

type ServerHelpers = Awaited<ReturnType<typeof makeHelpers>>

function makeHelpers(ctx: Awaited<ReturnType<typeof createTRPCContext>>) {
  return createServerSideHelpers({
    router: appRouter,
    ctx,
    queryClient: new QueryClient(),
  })
}

async function fetchOverview(helpers: ServerHelpers): Promise<OverviewData> {
  const now = new Date()
  return helpers.dashboard.getOverview.fetch({ tahun: now.getFullYear(), bulan: now.getMonth() + 1 })
}

export default async function DashboardServerPage() {
  const ctx = await createTRPCContext()
  const session = ctx.session
  const role = session?.user?.role as string | undefined

  let impersonating = false
  try {
    impersonating = !!(await cookies()).get("impersonated_sekolah_id")?.value
  } catch {
    // non-request context
  }

  const canView = session?.user && !(role === "super_admin" && !impersonating)

  // Data di-fetch server dan dirender sebagai Server Component — tidak
  // di-hydrate ke client. Kalender (interaktif) menerima data via props
  // sebagai initialData agar tidak ada request duplikat.
  let overview: OverviewData | null = null
  let serverFetchFailed = false
  if (canView) {
    const helpers = await makeHelpers(ctx)
    try {
      overview = await fetchOverview(helpers)
    } catch {
      serverFetchFailed = true
    }
  }

  return (
    <DashboardShell initialOverview={overview} role={role}>
      {canView && overview ? (
        role === "siswa" ? (
          <SiswaStats data={overview} />
        ) : (
          <DashboardStats data={overview} />
        )
      ) : canView && serverFetchFailed ? (
        // Fetch server gagal — fallback client dengan retry + error UI
        <DashboardStatsClient role={role} />
      ) : (
        <DashboardStatsFallback />
      )}
    </DashboardShell>
  )
}
