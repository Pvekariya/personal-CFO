import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { MobileTabBar } from "@/components/shared/MobileTabBar"
import { ClientOverlays } from "@/components/shared/ClientOverlays"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Dashboard | Personal CFO OS",
    template: "%s | Personal CFO OS",
  },
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans relative">
      {/* Ambient lighting removed to fix text washout issue */}

      <AppSidebar 
        userName={session.user.name} 
        userEmail={session.user.email} 
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 z-10 relative pb-20 md:pb-0">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <MobileTabBar />

      {/* Client-only heavy interactive overlays (dynamically imported with ssr: false) */}
      <ClientOverlays />
    </div>
  )
}
