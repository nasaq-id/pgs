import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { auth } from "@/auth"
import KelasPage from "./kelas-page"

export const dynamic = "force-dynamic"

export default async function KelasServerPage() {
  const queryClient = new QueryClient()
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext(),
    queryClient,
  })

  const session = await auth()

  if (session?.user) {
    const jobs = [
      helpers.kelas.getAll.prefetch({ search: "" }),
      helpers.guru.getAll.prefetch({}),
      helpers.lembaga.getSekolah.prefetch(),
      helpers.lembaga.getActiveTahunAjaran.prefetch(),
    ]

    // Konkurensi dibatasi (3) — jaga pooler
    for (let i = 0; i < jobs.length; i += 3) {
      await Promise.all(jobs.slice(i, i + 3).map((p) => p.catch(() => {})))
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KelasPage />
    </HydrationBoundary>
  )
}
