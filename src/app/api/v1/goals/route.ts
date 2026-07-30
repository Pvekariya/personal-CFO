import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { calculateInflationAdjustedTarget, calculateRequiredSIP } from "@/lib/calculators"
import { convertCurrency } from "@/lib/currency"

export async function GET(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [goals, workspace] = await Promise.all([
      prisma.goal.findMany({
        where: { workspaceId },
        orderBy: { targetDate: "asc" },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { currency: true },
      })
    ])

    const baseCurrency = workspace?.currency || "INR"

    const goalsWithConversion = await Promise.all(
      goals.map(async (goal) => {
        const convertedTargetAmount = await convertCurrency(
          Number(goal.targetAmount),
          goal.currency,
          baseCurrency
        )
        const convertedCurrentAmount = await convertCurrency(
          Number(goal.currentAmount),
          goal.currency,
          baseCurrency
        )
        return {
          ...goal,
          convertedTargetAmount: convertedTargetAmount.toString(),
          convertedCurrentAmount: convertedCurrentAmount.toString(),
        }
      })
    )

    return NextResponse.json({ data: goalsWithConversion })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 })
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
    const { name, type, targetAmount, currentAmount = 0, targetDate, inflationRate = 7, expectedReturn = 12, notes, currency } = body

    const targetDateObj = new Date(targetDate)
    const years = (targetDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25)
    
    // Auto calculations
    const inflationAdjustedTarget = calculateInflationAdjustedTarget(Number(targetAmount), Number(inflationRate), Math.max(0, years))
    const requiredSIP = calculateRequiredSIP(inflationAdjustedTarget, Number(currentAmount), Number(expectedReturn), Math.max(0, years))

    const goal = await prisma.goal.create({
      data: {
        workspaceId,
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
        currency,
      },
    })

    return NextResponse.json({ data: goal })
  } catch (error: any) {
    console.error("Goal creation error:", error)
    return NextResponse.json({ error: error.message || "Failed to create goal" }, { status: 500 })
  }
}
