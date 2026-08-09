import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { auth } from "@/auth"
import AbsensiPage from "./absensi-page"

export const dynamic = "force-dynamic"

export default async function AbsensiServerPage() {
  const queryClient = new QueryClient()
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext(),
    queryClient,
  })

  const session = await auth()
  const role = session?.user?.role as string | undefined

  if (session?.user) {
    const jobs = [
      helpers.kelas.getAll.prefetch({}),
      helpers.siswa.getAll.prefetch({ limit: 10000 }),
    ]
    if (role === "guru") {
      jobs.push(helpers.lms.getCurrentGuru.prefetch())
    }
    if (role === "super_admin" || role === "admin_sekolah" || role === "tu") {
      jobs.push(
        helpers.guru.getAll.prefetch({}),
        helpers.lembaga.getSekolah.prefetch(),
        helpers.absensi.getPengaturan.prefetch(),
      )
    }

    // Konkurensi dibatasi (3) — jaga pooler
    for (let i = 0; i < jobs.length; i += 3) {
      await Promise.all(jobs.slice(i, i + 3).map((p) => p.catch(() => {})))
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AbsensiPage />
    </HydrationBoundary>
  )
}
