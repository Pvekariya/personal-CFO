import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess, apiError } from "@/lib/api/response"

// GET /api/v1/transactions/summary — Monthly income/expense summary
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { workspaceId } = authResult

  const searchParams = request.nextUrl.searchParams
  const monthParam = searchParams.get("month") // YYYY-MM format
  const yearParam = searchParams.get("year")

  let startDate: Date
  let endDate: Date

  if (monthParam) {
    // Specific month: YYYY-MM
    const [year, month] = monthParam.split("-").map(Number)
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0, 23, 59, 59, 999)
  } else if (yearParam) {
    // Full year
    const year = parseInt(yearParam)
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59, 999)
  } else {
    // Default: current month
    const now = new Date()
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  // Aggregate income and expenses
  const transactions = await prisma.transaction.findMany({
    where: {
      account: { workspaceId },
      deletedAt: null,
      status: "COMPLETED",
      date: { gte: startDate, lte: endDate },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    select: {
      type: true,
      amount: true,
      categoryId: true,
      category: {
        select: { name: true, group: true, color: true },
      },
    },
  })

  let totalIncome = 0
  let totalExpense = 0
  const categoryBreakdown: Record<
    string,
    { name: string; group: string; color: string | null; amount: number }
  > = {}

  for (const txn of transactions) {
    const amount = Number(txn.amount)
    if (txn.type === "INCOME") {
      totalIncome += amount
    } else {
      totalExpense += amount
    }

    if (txn.category && txn.categoryId) {
      if (!categoryBreakdown[txn.categoryId]) {
        categoryBreakdown[txn.categoryId] = {
          name: txn.category.name,
          group: txn.category.group,
          color: txn.category.color,
          amount: 0,
        }
      }
      categoryBreakdown[txn.categoryId].amount += amount
    }
  }

  return apiSuccess({
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    savingsRate:
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
        : 0,
    categoryBreakdown: Object.values(categoryBreakdown).sort(
      (a, b) => b.amount - a.amount
    ),
  })
}
