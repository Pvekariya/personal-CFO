import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { calculateInflationAdjustedTarget, calculateRequiredSIP } from "@/lib/calculators"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  const { id } = await params

  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.goal.delete({
      where: { id, workspaceId },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 })
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
    const { name, type, targetAmount, currentAmount = 0, targetDate, inflationRate = 7, expectedReturn = 12, notes } = body

    const targetDateObj = new Date(targetDate)
    const years = (targetDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25)
    
    // Auto calculations
    const inflationAdjustedTarget = calculateInflationAdjustedTarget(Number(targetAmount), Number(inflationRate), Math.max(0, years))
    const requiredSIP = calculateRequiredSIP(inflationAdjustedTarget, Number(currentAmount), Number(expectedReturn), Math.max(0, years))

    const goal = await prisma.goal.update({
      where: { id, workspaceId },
      data: {
        name,
        type,
        targetAmount,
        currentAmount,
        targetDate: targetDateObj,
        inflationRate,
        expectedReturn,
        inflationAdjustedTarget,
        requiredSIP,
        notes,
      },
    })

    return NextResponse.json({ data: goal })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 })
  }
}
