import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SessionProvider } from "@/components/providers/SessionProvider"
import MainLayout from "@/components/layout/MainLayout"
import { PushRegister } from "@/components/providers/PushRegister"

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
      <MainLayout>{children}</MainLayout>
      <PushRegister />
    </SessionProvider>
  )
}
