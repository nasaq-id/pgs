import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import MonitoringSpApresiasiPage from "./monitoring-sp-page"

export const dynamic = "force-dynamic"

export default async function MonitoringSpServerPage() {
  const queryClient = new QueryClient()
  const ctx = await createTRPCContext()
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx,
    queryClient,
  })

  const session = ctx.session

  if (session?.user) {
    const jobs = [
      helpers.poin.getMonitoring.prefetch({ limit: 100 }),
      helpers.poin.getMonitoringThreshold.prefetch(),
      helpers.poin.getDashboardGuruAdmin.prefetch(),
      helpers.poin.getAllAturan.prefetch(),
      helpers.siswa.getLookup.prefetch({ limit: 1000 }),
      helpers.poin.getAllSikap.prefetch({ limit: 500 }),
      helpers.kelas.getAll.prefetch({}),
    ]

    // Konkurensi dibatasi (3) — jaga pooler
    for (let i = 0; i < jobs.length; i += 3) {
      await Promise.all(jobs.slice(i, i + 3).map((p) => p.catch(() => {})))
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MonitoringSpApresiasiPage />
    </HydrationBoundary>
  )
}
