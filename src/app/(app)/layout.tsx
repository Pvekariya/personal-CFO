import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { AIChatbot } from "@/components/shared/AIChatbot"
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

  if (!session.user.onboardingComplete) {
    redirect("/onboarding/profile")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans relative">
      {/* Subtle ambient lighting for the main app */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      <AppSidebar 
        userName={session.user.name} 
        userEmail={session.user.email} 
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 z-10 relative">
        <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          {children}
        </div>
      </main>

      {/* Floating AI Chatbot */}
      <AIChatbot />
    </div>
  )
}
