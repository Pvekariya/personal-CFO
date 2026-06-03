"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function OnboardingCompletePage() {
  const router = useRouter()

  return (
    <div className="space-y-6 text-center">
      <div className="text-5xl">🎯</div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re all set!</h1>
        <p className="text-muted-foreground text-sm">
          Your Personal CFO is ready. Let&apos;s start tracking your finances.
        </p>
      </div>
      <Button onClick={() => router.push("/dashboard")} className="w-full">
        Go to Dashboard
      </Button>
    </div>
  )
}
