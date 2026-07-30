import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { apiError, apiSuccess } from "@/lib/api/response"
import { scanAndGenerateAlerts } from "@/lib/notifications/scan-alerts"

export async function POST() {
  const session = await auth()
  const userId = session?.user?.id
  let workspaceId = session?.user?.workspaceId

  if (userId && !workspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId, isActive: true },
      select: { workspaceId: true },
    })
    if (member) {
      workspaceId = member.workspaceId
    }
  }

  if (!workspaceId) {
    return apiError("Unauthorized", 401)
  }

  try {
    const alerts = await scanAndGenerateAlerts(workspaceId, userId)
    return apiSuccess({
      scanned: true,
      newAlertsCount: alerts.length,
      alerts,
    })
  } catch (error) {
    console.error("Failed to run alert scan:", error)
    return NextResponse.json({ error: "Alert scan failed" }, { status: 500 })
  }
}
