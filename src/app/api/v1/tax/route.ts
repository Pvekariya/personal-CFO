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
    const url = new URL(request.url)
    const yearParam = url.searchParams.get("fy") // e.g. "2023" for FY 2023-24
    
    // Determine current FY if not provided
    const now = new Date()
    const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const targetYear = yearParam ? parseInt(yearParam) : currentYear

    const startDate = new Date(`${targetYear}-04-01T00:00:00.000Z`)
    const endDate = new Date(`${targetYear + 1}-03-31T23:59:59.999Z`)

    // Fetch Income
    const incomes = await prisma.transaction.findMany({
      where: {
        workspaceId,
        type: "INCOME",
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: { amount: true }
    })

    // Fetch Investments (proxy for 80C, though not all investments are 80C)
    const investments = await prisma.transaction.findMany({
      where: {
        workspaceId,
        type: "INVESTMENT",
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: { amount: true }
    })

    const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalInvestments = investments.reduce((sum, t) => sum + Number(t.amount), 0)

    // Standard deduction in India for salaried
    const standardDeduction = 50000
    
    // 80C max deduction
    const deduction80C = Math.min(totalInvestments, 150000)

    return NextResponse.json({
      data: {
        fy: `${targetYear}-${targetYear + 1}`,
        totalIncome,
        totalInvestments,
        standardDeduction,
        deduction80C,
      }
    })
  } catch (error) {
    console.error("Tax API error:", error)
    return NextResponse.json({ error: "Failed to load tax data" }, { status: 500 })
  }
}
