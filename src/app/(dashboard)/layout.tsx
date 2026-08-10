import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { TRPCProvider } from "@/lib/trpc/provider"
import MainLayout from "@/components/layout/MainLayout"
import { DeferredPushRegister } from "@/components/providers/DeferredPushRegister"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <SessionProvider session={session}>
      <TRPCProvider>
        <MainLayout>{children}</MainLayout>
        <DeferredPushRegister />
      </TRPCProvider>
    </SessionProvider>
  )
}
