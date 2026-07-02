import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { TRPCProvider } from "@/lib/trpc/provider"
import MainLayout from "@/components/layout/MainLayout"

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
      </TRPCProvider>
    </SessionProvider>
  )
}
