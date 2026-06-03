import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  const { id } = await params

  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.asset.delete({
      where: { id, workspaceId },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  const { id } = await params

  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { name, class: assetClass, type, investedAmount, currentValue, expectedReturn, platform, notes } = body

    const asset = await prisma.asset.update({
      where: { id, workspaceId },
      data: {
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 })
  }
}
