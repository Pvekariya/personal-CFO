import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"

export async function GET(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: { workspaceId },
      orderBy: { snapshotDate: "asc" },
    })

    return NextResponse.json({ data: snapshots })
  } catch (error) {
    console.error("Fetch net worth error:", error)
    return NextResponse.json({ error: "Failed to fetch net worth history" }, { status: 500 })
  }
}
