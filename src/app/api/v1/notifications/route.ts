import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { apiError, apiSuccess } from "@/lib/api/response"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const userId = session.user.id

    // Fetch notifications
    let notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // Auto-create a welcome notification if none exist
    if (notifications.length === 0) {
      const welcome = await prisma.notification.create({
        data: {
          userId,
          type: "AI_INSIGHT",
          title: "Welcome to Personal CFO OS",
          body: "Your premium financial command center is ready. Set up your first account to get started.",
          channel: "IN_APP",
        }
      })
      notifications = [welcome]
    }

    return apiSuccess(notifications)
  } catch (error) {
    console.error("Notifications GET error:", error)
    return apiError("Internal server error")
  }
}
