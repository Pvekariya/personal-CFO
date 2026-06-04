import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess, apiError } from "@/lib/api/response"

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { workspaceId } = authResult

  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Calculate days elapsed in month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = now.getDate()
    const monthElapsedPercent = (currentDay / daysInMonth) * 100

    // 1. Fetch Budgets & Pacing
    const budgets = await prisma.budget.findMany({
      where: { workspaceId, isActive: true },
      include: { category: true }
    })

    const budgetPacing = await Promise.all(
      budgets.map(async (budget) => {
        const spentObj = await prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            workspaceId,
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: { gte: firstDayOfMonth }
          }
        })
        
        const spent = Number(spentObj._sum.amount || 0)
        const budgetAmount = Number(budget.amount)
        const spentPercent = (spent / budgetAmount) * 100
        
        // If you spent 50% of budget by 5th day (16% of month), you are pacing poorly.
        const pacingDelta = spentPercent - monthElapsedPercent
        let status = "ON_TRACK"
        if (spentPercent >= 100) status = "EXCEEDED"
        else if (pacingDelta > 20) status = "DANGER" // Spending way faster than time elapsed
        else if (pacingDelta > 5) status = "WARNING"

        return {
          id: budget.id,
          categoryName: budget.category.name,
          categoryIcon: budget.category.icon,
          budgetAmount,
          spent,
          spentPercent,
          status
        }
      })
    )

    // 2. Fetch Subscriptions / Recurring Transactions
    // Look at past 45 days for transactions marked isRecurring
    const fortyFiveDaysAgo = new Date(now)
    fortyFiveDaysAgo.setDate(now.getDate() - 45)

    const recurringTxns = await prisma.transaction.findMany({
      where: {
        workspaceId,
        isRecurring: true,
        date: { gte: fortyFiveDaysAgo }
      },
      orderBy: { date: "desc" },
      distinct: ['merchant', 'description'] // Avoid showing same subscription multiple times
    })

    const subscriptions = recurringTxns.map(t => {
      // Estimate next date (assume monthly for simplicity)
      const lastDate = new Date(t.date)
      const nextDate = new Date(lastDate)
      nextDate.setMonth(lastDate.getMonth() + 1)
      
      // If nextDate is already passed, maybe they haven't logged it yet.
      // If it's coming up in next 7 days, flag it.
      const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24))

      return {
        id: t.id,
        name: t.merchant || t.description || "Subscription",
        amount: Number(t.amount),
        type: t.type,
        lastDate: lastDate.toISOString(),
        nextDate: nextDate.toISOString(),
        daysUntil
      }
    })

    return apiSuccess({
      monthElapsedPercent,
      budgets: budgetPacing,
      subscriptions: subscriptions.sort((a, b) => a.daysUntil - b.daysUntil)
    })

  } catch (error) {
    console.error("Insights error:", error)
    return apiError("Failed to fetch insights", 500)
  }
}
