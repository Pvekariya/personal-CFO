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
    const assets = await prisma.asset.findMany({
      where: { workspaceId },
      orderBy: { currentValue: "desc" },
    })
    return NextResponse.json({ data: assets })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, class: assetClass, type, investedAmount, currentValue, expectedReturn, platform, notes } = body

    const asset = await prisma.asset.create({
      data: {
        workspaceId,
        name,
        class: assetClass,
        type,
        investedAmount: Number(investedAmount),
        currentValue: Number(currentValue),
        expectedReturn: expectedReturn ? Number(expectedReturn) : null,
        platform,
        notes,
      },
    })

    return NextResponse.json({ data: asset })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create investment" }, { status: 500 })
  }
}
