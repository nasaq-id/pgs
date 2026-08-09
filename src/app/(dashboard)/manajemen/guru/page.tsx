import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { auth } from "@/auth"
import GuruPage from "./guru-page"

export const dynamic = "force-dynamic"

export default async function GuruServerPage() {
  const queryClient = new QueryClient()
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext(),
    queryClient,
  })

  const session = await auth()

  if (session?.user) {
    // Key harus match input awal client: { sortBy: "namaLengkap", sortOrder: "asc", limit: 25, offset: 0 }
    await Promise.all([
      helpers.guru.getAll.prefetch({ sortBy: "namaLengkap", sortOrder: "asc", limit: 25, offset: 0 }),
      helpers.guru.getStats.prefetch(),
    ].map((p) => p.catch(() => {})))
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GuruPage />
    </HydrationBoundary>
  )
}
