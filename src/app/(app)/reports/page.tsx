import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ReportPrintControls } from "./ReportPrintControls"

export const metadata = {
  title: "Financial Reports & Statement | Personal CFO",
  description: "Comprehensive print-ready monthly financial report and CSV export",
}

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    redirect("/login")
  }

  const resolvedParams = await searchParams
  const now = new Date()
  const targetYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear()
  const targetMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : now.getMonth() + 1 // 1-12

  const startDate = new Date(targetYear, targetMonth - 1, 1)
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59)

  // Month names
  const monthName = startDate.toLocaleString("en-US", { month: "long" })

  // Fetch transactions for target month
  const transactions = await prisma.transaction.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      category: { select: { name: true, color: true } },
      account: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })

  // Calculations
  let totalIncome = 0
  let totalExpense = 0
  const categoryTotals: Record<string, { name: string; amount: number; color: string }> = {}

  for (const tx of transactions) {
    const val = Number(tx.amount)
    if (tx.type === "INCOME") {
      totalIncome += val
    } else if (tx.type === "EXPENSE") {
      totalExpense += val
      const catName = tx.category?.name || "Uncategorized"
      const catColor = tx.category?.color || "#94a3b8"
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { name: catName, amount: 0, color: catColor }
      }
      categoryTotals[catName].amount += val
    }
  }

  const netSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0

  // Top accounts summary
  const accounts = await prisma.account.findMany({
    where: { workspaceId, isActive: true, deletedAt: null },
    select: { name: true, type: true, balance: true, currency: true },
  })
  const totalAccountBalance = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0)

  // Top expenses
  const topExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .slice(0, 8)

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto print:p-0 print:max-w-none print:bg-white print:text-black">
      {/* Print Controls Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Print-ready monthly statements & data export
          </p>
        </div>
        <ReportPrintControls currentMonth={targetMonth} currentYear={targetYear} />
      </div>

      {/* Printable Statement Container */}
      <div className="bg-card print:bg-white rounded-3xl border border-border print:border-none p-6 md:p-10 shadow-sm space-y-8">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-border pb-6 print:border-black">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground print:text-black">
              Personal Financial Statement
            </h2>
            <p className="text-sm text-muted-foreground print:text-gray-600 font-medium mt-0.5">
              Period: {monthName} {targetYear}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 bg-primary/10 text-primary print:bg-gray-200 print:text-black rounded-full">
              Official Report
            </span>
            <p className="text-xs text-muted-foreground print:text-gray-600 mt-2">
              Generated: {now.toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-muted/40 print:bg-gray-50 border border-border/50 print:border-gray-300">
            <p className="text-xs font-semibold text-muted-foreground print:text-gray-600 uppercase">Total Income</p>
            <p className="text-2xl font-extrabold text-emerald-600 print:text-emerald-700 mt-1">
              ₹{totalIncome.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/40 print:bg-gray-50 border border-border/50 print:border-gray-300">
            <p className="text-xs font-semibold text-muted-foreground print:text-gray-600 uppercase">Total Expenses</p>
            <p className="text-2xl font-extrabold text-rose-600 print:text-rose-700 mt-1">
              ₹{totalExpense.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/40 print:bg-gray-50 border border-border/50 print:border-gray-300">
            <p className="text-xs font-semibold text-muted-foreground print:text-gray-600 uppercase">Net Surplus</p>
            <p className={`text-2xl font-extrabold mt-1 ${netSavings >= 0 ? "text-primary print:text-black" : "text-rose-600"}`}>
              ₹{netSavings.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/40 print:bg-gray-50 border border-border/50 print:border-gray-300">
            <p className="text-xs font-semibold text-muted-foreground print:text-gray-600 uppercase">Savings Rate</p>
            <p className="text-2xl font-extrabold text-foreground print:text-black mt-1">
              {savingsRate}%
            </p>
          </div>
        </div>

        {/* Category Expenses Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground print:text-black">Expense Breakdown by Category</h3>
          {Object.keys(categoryTotals).length === 0 ? (
            <p className="text-sm text-muted-foreground print:text-gray-500 italic">No expenses recorded for this period.</p>
          ) : (
            <div className="space-y-3">
              {Object.values(categoryTotals)
                .sort((a, b) => b.amount - a.amount)
                .map((cat) => {
                  const percentage = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                        <span>₹{cat.amount.toLocaleString("en-IN")} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-muted print:bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Recent Significant Transactions */}
        <div className="space-y-4 pt-4 border-t border-border print:border-gray-300">
          <h3 className="text-lg font-bold text-foreground print:text-black">Significant Transactions ({monthName})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border print:border-gray-300 text-muted-foreground print:text-gray-600 uppercase text-[11px] font-bold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 print:divide-gray-200">
                {topExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground italic">
                      No transactions found for this period.
                    </td>
                  </tr>
                ) : (
                  topExpenses.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20 print:hover:bg-transparent">
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                        {new Date(tx.date).toISOString().split("T")[0]}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground print:text-black">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground print:text-gray-600">
                        {tx.category?.name || "Uncategorized"}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground print:text-gray-600">
                        {tx.account?.name || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 print:text-rose-700">
                        -₹{Number(tx.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Account Balances Summary */}
        <div className="space-y-4 pt-4 border-t border-border print:border-gray-300">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-foreground print:text-black">Active Accounts Snapshot</h3>
            <p className="text-sm font-bold text-primary print:text-black">
              Total Liquidity: ₹{totalAccountBalance.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <div key={acc.name} className="p-3 rounded-xl border border-border/60 print:border-gray-300 bg-muted/20 print:bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-foreground print:text-black">{acc.name}</p>
                  <p className="text-xs text-muted-foreground print:text-gray-500">{acc.type}</p>
                </div>
                <p className="font-mono font-bold text-sm text-foreground print:text-black">
                  ₹{Number(acc.balance).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Statement Footer */}
        <div className="pt-6 border-t border-border print:border-gray-300 text-center text-xs text-muted-foreground print:text-gray-500 space-y-1">
          <p>This report is generated by Personal CFO OS. Confidential & Private.</p>
          <p>For support or custom inquiries, export your full dataset via CSV.</p>
        </div>
      </div>
    </div>
  )
}
