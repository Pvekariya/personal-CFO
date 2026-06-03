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
    // Basic heuristics for financial health (0-100)
    // 1. Liquidity (20 points): Do they have 6 months expenses in liquid accounts?
    // 2. Debt (20 points): Is their debt-to-asset ratio < 30%?
    // 3. Investment (30 points): Are they investing regularly?
    // 4. Savings (30 points): Is income > expenses?

    const accounts = await prisma.account.findMany({ where: { workspaceId } })
    const liquidAssets = accounts.reduce((acc, a) => acc + Number(a.balance), 0)

    const liabilities = await prisma.liability.findMany({ where: { workspaceId } })
    const totalDebt = liabilities.reduce((acc, l) => acc + Number(l.outstandingBalance), 0)

    const assets = await prisma.asset.findMany({ where: { workspaceId } })
    const investedAssets = assets.reduce((acc, a) => acc + Number(a.currentValue), 0)
    const totalAssets = liquidAssets + investedAssets

    // Past 90 days expenses & income
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const recentTransactions = await prisma.transaction.findMany({
      where: { workspaceId, date: { gte: ninetyDaysAgo } }
    })

    const recentIncome = recentTransactions.filter(t => t.type === "INCOME").reduce((acc, t) => acc + Number(t.amount), 0)
    const recentExpense = recentTransactions.filter(t => t.type === "EXPENSE").reduce((acc, t) => acc + Number(t.amount), 0)
    
    // Default Scores
    let liquidityScore = 0
    let debtScore = 0
    let savingsScore = 0
    let investmentScore = 0

    // 1. Liquidity (Max 20)
    const monthlyExpense = recentExpense / 3
    if (monthlyExpense > 0) {
      const monthsOfBuffer = liquidAssets / monthlyExpense
      liquidityScore = Math.min(20, (monthsOfBuffer / 6) * 20)
    } else {
      liquidityScore = liquidAssets > 0 ? 20 : 10
    }

    // 2. Debt (Max 20)
    if (totalAssets > 0) {
      const debtRatio = totalDebt / totalAssets
      if (debtRatio === 0) debtScore = 20
      else if (debtRatio < 0.3) debtScore = 15
      else if (debtRatio < 0.5) debtScore = 10
      else debtScore = 5
    } else {
      debtScore = totalDebt > 0 ? 0 : 20
    }

    // 3. Savings Rate (Max 30)
    if (recentIncome > 0) {
      const savingsRate = (recentIncome - recentExpense) / recentIncome
      if (savingsRate > 0.3) savingsScore = 30
      else if (savingsRate > 0.2) savingsScore = 20
      else if (savingsRate > 0.1) savingsScore = 10
      else savingsScore = 5
    } else {
      savingsScore = 10
    }

    // 4. Investment (Max 30)
    // Proxy: Ratio of Invested Assets to Total Assets
    if (totalAssets > 0) {
      const investRatio = investedAssets / totalAssets
      if (investRatio > 0.5) investmentScore = 30
      else if (investRatio > 0.3) investmentScore = 20
      else if (investRatio > 0.1) investmentScore = 10
      else investmentScore = 5
    } else {
      investmentScore = 5
    }

    const totalScore = Math.round(liquidityScore + debtScore + savingsScore + investmentScore)

    // Ensure it's between 0 and 100
    const finalScore = Math.max(0, Math.min(100, totalScore))

    return NextResponse.json({
      data: {
        score: finalScore,
        breakdown: {
          liquidity: Math.round(liquidityScore),
          debt: Math.round(debtScore),
          savings: Math.round(savingsScore),
          investment: Math.round(investmentScore)
        }
      }
    })
  } catch (error) {
    console.error("Health Score API error:", error)
    return NextResponse.json({ error: "Failed to calculate health score" }, { status: 500 })
  }
}
