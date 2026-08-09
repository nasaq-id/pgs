import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query"
import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"
import { auth } from "@/auth"
import { cookies } from "next/headers"
import DashboardPage from "./dashboard-page"

export const dynamic = "force-dynamic"

export default async function DashboardServerPage() {
  const queryClient = new QueryClient()
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: await createTRPCContext(),
    queryClient,
  })

  const session = await auth()
  const role = session?.user?.role as string | undefined

  let impersonating = false
  try {
    impersonating = !!(await cookies()).get("impersonated_sekolah_id")?.value
  } catch {
    // non-request context
  }

  if (session?.user && !(role === "super_admin" && !impersonating)) {
    const now = new Date()
    const jobs = [
      helpers.dashboard.getStudentSummary.prefetch(undefined),
      helpers.dashboard.getStaffSummary.prefetch(undefined),
      helpers.dashboard.getClassSummary.prefetch(undefined),
      helpers.dashboard.getPendingPaymentCount.prefetch(undefined),
      helpers.dashboard.getTodayAttendanceRate.prefetch(undefined),
      helpers.dashboard.getOutstandingReceivables.prefetch(undefined),
      helpers.dashboard.getRuangKelasCount.prefetch(undefined),
      helpers.dashboard.getTopStudentPoints.prefetch(undefined),
      helpers.pengumuman.getPublished.prefetch({ limit: 5 }),
    ]

    if (role === "siswa") {
      jobs.push(helpers.poin.getDashboardSiswa.prefetch(undefined))
    } else if (role && ["guru", "admin_sekolah", "super_admin"].includes(role)) {
      jobs.push(helpers.poin.getDashboardGuruAdmin.prefetch(undefined))
    }

    if (role !== "siswa") {
      jobs.push(
        helpers.kalender.getAll.prefetch({
          tahun: now.getFullYear(),
          bulan: now.getMonth() + 1,
          limit: 200,
        })
      )
    }

    // Konkurensi dibatasi (3) — pooler Supabase hanya ~15 session, hindari saturasi
    for (let i = 0; i < jobs.length; i += 3) {
      await Promise.all(jobs.slice(i, i + 3).map((p) => p.catch(() => {})))
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardPage />
    </HydrationBoundary>
  )
}
