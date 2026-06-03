import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"

export async function GET(request: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { userId, isDismissed: false },
      orderBy: [
        { priority: 'asc' }, // Will sort CRITICAL first if enum is correctly ordered (it might not be alphabetically ordered but prisma handles enums)
        { createdAt: 'desc' }
      ],
    })

    return NextResponse.json({ data: recommendations })
  } catch (error) {
    console.error("Fetch recommendations error:", error)
    return NextResponse.json({ error: "Failed to load recommendations" }, { status: 500 })
  }
}
