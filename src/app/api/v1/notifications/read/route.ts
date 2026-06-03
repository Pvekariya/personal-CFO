import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { apiError, apiSuccess } from "@/lib/api/response"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError("Missing notification IDs", 400)
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error("Notifications read error:", error)
    return apiError("Internal server error")
  }
}
