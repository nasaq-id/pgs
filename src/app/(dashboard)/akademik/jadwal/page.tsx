import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { auth } from "@/auth"
import JadwalPage from "./jadwal-page"

export const dynamic = "force-dynamic"

export default async function JadwalServerPage() {
  const queryClient = new QueryClient()
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext(),
    queryClient,
  })

  const session = await auth()
  const role = session?.user?.role as string | undefined

  const [kelasList, profile] = await Promise.all([
    helpers.kelas.getAll.fetch({ limit: 500 }).catch(() => []),
    helpers.profil.getProfile.fetch().catch(() => null),
  ])
  const kelasRecords = (kelasList ?? []) as { id: string }[]
  const defaultKelasId = kelasRecords[0]?.id
  const profileKelasId = (profile as { kelasId?: string | null } | null)?.kelasId

  await Promise.all(
    [
      helpers.mapel.getAll.prefetch({ limit: 500 }),
      helpers.guru.getAll.prefetch({ limit: 500 }),
      helpers.pengaturanJadwal.get.prefetch({}),
      helpers.pengaturanJadwal.getTimeline.prefetch({}),
    ].map((p) => p.catch(() => {}))
  )

  if (session?.user) {
    if (role === "guru") {
      await helpers.jadwal.getAll
        .prefetch({ guruId: (profile?.id || "none") as string })
        .catch(() => {})
    } else if (role === "siswa") {
      await helpers.jadwal.getAll
        .prefetch({ kelasId: profileKelasId || undefined })
        .catch(() => {})
    } else {
      await helpers.jadwal.getAll.prefetch({ kelasId: defaultKelasId }).catch(() => {})
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JadwalPage />
    </HydrationBoundary>
  )
}
