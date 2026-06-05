import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { RecommendationCategory, RecommendationPriority } from "@/generated/prisma/client"

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  const workspaceId = session?.user?.workspaceId

  if (!userId || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Clear old unread/undismissed recommendations (optional, or just delete all and regenerate for MVP)
    await prisma.recommendation.deleteMany({
      where: { userId, isDismissed: false, isActedOn: false }
    })

    const newRecommendations = []

    // Rule 1: Emergency Fund Check
    const accounts = await prisma.account.findMany({ where: { workspaceId } })
    const totalLiquid = accounts.reduce((acc, a) => acc + Number(a.balance), 0)

    // Calculate avg monthly expense
    const pastExpenses = await prisma.transaction.aggregate({
      where: {
        workspaceId,
        type: "EXPENSE",
        deletedAt: null,
        date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // last 90 days
      },
      _sum: { amount: true }
    })
    const avgMonthlyExpense = (Number(pastExpenses._sum.amount) || 0) / 3

    if (avgMonthlyExpense > 0 && totalLiquid < avgMonthlyExpense * 6) {
      newRecommendations.push({
        userId,
        category: RecommendationCategory.EMERGENCY_FUND,
        priority: RecommendationPriority.HIGH,
        title: "Build Your Emergency Fund",
        body: `Your liquid cash is below 6 months of expenses. You need approx ₹${(avgMonthlyExpense * 6).toFixed(0)} to be perfectly secure.`,
        impact: "High Security",
        action: "Transfer to Savings",
      })
    }

    // Rule 2: High Interest Debt Check
    const liabilities = await prisma.liability.findMany({ where: { workspaceId } })
    const highInterestDebt = liabilities.filter(l => Number(l.interestRate) > 12 && Number(l.outstandingBalance) > 0)
    
    if (highInterestDebt.length > 0) {
      const debtValue = highInterestDebt.reduce((acc, l) => acc + Number(l.outstandingBalance), 0)
      newRecommendations.push({
        userId,
        category: RecommendationCategory.DEBT,
        priority: RecommendationPriority.CRITICAL,
        title: "Pay Down High-Interest Debt",
        body: `You have ₹${debtValue.toFixed(0)} in high-interest debt (e.g., Credit Cards, Personal Loans). This is draining your wealth fast.`,
        impact: `Save ₹${(debtValue * 0.15).toFixed(0)}/yr in interest`,
        action: "View Liabilities",
      })
    }

    // Rule 3: 80C Tax Savings
    const fyStart = new Date(new Date().getFullYear(), 3, 1) // April 1st of current year (rough)
    const investmentsThisYear = await prisma.transaction.aggregate({
      where: { workspaceId, type: "INVESTMENT", date: { gte: fyStart } },
      _sum: { amount: true }
    })
    const invested = Number(investmentsThisYear._sum.amount) || 0
    if (invested < 150000) {
      newRecommendations.push({
        userId,
        category: RecommendationCategory.TAX,
        priority: RecommendationPriority.MEDIUM,
        title: "Maximize 80C Deductions",
        body: `You have only invested ₹${invested.toFixed(0)} under Section 80C. Invest ₹${(150000 - invested).toFixed(0)} more to max out your tax savings.`,
        impact: `Save up to ₹${((150000 - invested) * 0.3).toFixed(0)} in taxes`,
        action: "Plan Investment",
      })
    }

    // If perfectly healthy and no triggers, add a generic one
    if (newRecommendations.length === 0) {
      newRecommendations.push({
        userId,
        category: RecommendationCategory.PORTFOLIO,
        priority: RecommendationPriority.LOW,
        title: "Review Portfolio Allocation",
        body: "Your financial health looks solid. Ensure your portfolio allocation matches your risk appetite for the year.",
        impact: "Optimized Growth",
        action: "View Analytics",
      })
    }

    // Insert into DB
    const created = await prisma.recommendation.createMany({
      data: newRecommendations,
    })

    return NextResponse.json({ success: true, count: created.count })
  } catch (error) {
    console.error("Generate recommendations error:", error)
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
