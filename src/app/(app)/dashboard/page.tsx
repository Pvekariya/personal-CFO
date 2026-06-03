import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopHeader } from "@/components/shared/TopHeader"
import { Badge } from "@/components/ui/badge"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your personal CFO dashboard, track net worth, and review recent cash flows.",
}

export default async function DashboardPage() {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return <div>Workspace not found. Please log in again.</div>
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
  const currency = workspace?.currency || "INR"

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [accounts, recentTransactions, monthTransactions, assets, goals, liabilities] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { balance: "desc" },
    }),
    prisma.transaction.findMany({
      where: { workspaceId },
      include: { category: true, account: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: {
        workspaceId,
        date: { gte: startOfMonth },
      },
    }),
    prisma.asset.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { currentValue: "desc" },
      take: 3,
    }),
    prisma.goal.findMany({
      where: { workspaceId },
      orderBy: { targetDate: "asc" },
      take: 3,
    }),
    prisma.liability.findMany({
      where: { workspaceId, isActive: true },
    })
  ])

  // Calculate Net Worth
  const liquidNetWorth = accounts.reduce((acc, account) => acc + Number(account.balance), 0)
  const investedNetWorth = assets.reduce((acc, asset) => acc + Number(asset.currentValue), 0)
  const totalLiabilities = liabilities.reduce((acc, liability) => acc + Number(liability.outstandingBalance), 0)
  const totalNetWorth = liquidNetWorth + investedNetWorth - totalLiabilities
  const totalAssets = liquidNetWorth + investedNetWorth

  // Calculate Cash Flow
  let income = 0
  let expense = 0
  for (const t of monthTransactions) {
    if (t.type === "INCOME") income += Number(t.amount)
    if (t.type === "EXPENSE") expense += Number(t.amount)
  }
  const cashFlow = income - expense

  // Calculate Financial Health Score (0-100)
  let liquidityScore = 0
  let debtScore = 0
  let savingsScore = 0
  let investmentScore = 0

  const monthlyExpense = expense > 0 ? expense : 1000 // avoid div 0
  const monthsOfBuffer = liquidNetWorth / monthlyExpense
  liquidityScore = Math.min(20, (monthsOfBuffer / 6) * 20)

  if (totalAssets > 0) {
    const debtRatio = totalLiabilities / totalAssets
    if (debtRatio === 0) debtScore = 20
    else if (debtRatio < 0.3) debtScore = 15
    else if (debtRatio < 0.5) debtScore = 10
    else debtScore = 5
  } else {
    debtScore = totalLiabilities > 0 ? 0 : 20
  }

  if (income > 0) {
    const savingsRate = (income - expense) / income
    if (savingsRate > 0.3) savingsScore = 30
    else if (savingsRate > 0.2) savingsScore = 20
    else if (savingsRate > 0.1) savingsScore = 10
    else savingsScore = 5
  } else {
    savingsScore = 10
  }

  if (totalAssets > 0) {
    const investRatio = investedNetWorth / totalAssets
    if (investRatio > 0.5) investmentScore = 30
    else if (investRatio > 0.3) investmentScore = 20
    else if (investRatio > 0.1) investmentScore = 10
    else investmentScore = 5
  } else {
    investmentScore = 5
  }

  const healthScore = Math.max(0, Math.min(100, Math.round(liquidityScore + debtScore + savingsScore + investmentScore)))

  let healthColor = "text-rose-500"
  if (healthScore >= 80) healthColor = "text-emerald-500"
  else if (healthScore >= 50) healthColor = "text-orange-500"

  return (
    <div className="space-y-6">
      <TopHeader 
        title="Dashboard" 
        subtitle={`Welcome back, ${session?.user?.name?.split(" ")[0] || "there"} 👋`} 
        user={session.user} 
      />

      {/* Main KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-[0_8px_30px_rgba(0,122,255,0.12)] transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Worth</CardTitle>
            <img src="https://img.icons8.com/ios/50/diamond--v1.png" alt="Net Worth" className="w-5 h-5 dark:invert opacity-50" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-extrabold tracking-tight ${totalNetWorth >= 0 ? 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400' : 'text-rose-500'}`}>
              {totalNetWorth >= 0 ? '+' : ''}{formatCurrency(totalNetWorth, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              Assets: {formatCurrency(liquidNetWorth + investedNetWorth, currency)} • Debt: {formatCurrency(totalLiabilities, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cash Flow</CardTitle>
            <img src="https://img.icons8.com/ios/50/bank-cards.png" alt="Cash Flow" className="w-5 h-5 dark:invert opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(cashFlow, currency)}</div>
            <div className="flex gap-3 text-xs text-muted-foreground mt-2 font-medium">
              <span className="flex items-center text-emerald-500">
                <img src="https://img.icons8.com/ios/50/collapse-arrow--v1.png" className="w-3 h-3 mr-1" alt="In" />
                {formatCurrency(income, currency)}
              </span>
              <span className="flex items-center text-rose-500">
                <img src="https://img.icons8.com/ios/50/expand-arrow--v1.png" className="w-3 h-3 mr-1" alt="Out" />
                {formatCurrency(expense, currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Health</CardTitle>
            <img src="https://img.icons8.com/ios/50/heart-health.png" alt="Health" className="w-5 h-5 dark:invert opacity-50" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${healthColor}`}>
              {healthScore} <span className="text-sm text-muted-foreground font-medium">/ 100</span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-1000 ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Transactions Widget */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Link href="/transactions" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <CardDescription>Your latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No transactions yet. <Link href="/transactions" className="text-primary underline">Add one</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between group hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-secondary/50 text-xl shadow-sm border border-border/50">
                        {tx.category?.icon || (tx.type === "INCOME" ? "⬇️" : "⬆️")}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-none text-foreground/90">{tx.description || tx.category?.name || "Transaction"}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {tx.account.name} • {formatDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <div className={`font-bold tracking-tight ${tx.type === "INCOME" ? "text-emerald-500" : "text-foreground/90"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(Number(tx.amount), currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounts Overview Widget */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Accounts</CardTitle>
              <Link href="/accounts" className="text-sm text-primary hover:underline">
                Manage
              </Link>
            </div>
            <CardDescription>Balances across your accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No accounts yet. <Link href="/accounts" className="text-primary underline">Add one</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between group hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <img src="https://img.icons8.com/ios/50/museum.png" alt="Bank" className="w-5 h-5 dark:invert" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-none flex items-center gap-2 text-foreground/90">
                          {acc.name}
                          {acc.isDefault && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">Default</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          {acc.type.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold tracking-tight text-foreground/90">
                      {formatCurrency(Number(acc.balance), currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Investments Widget */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Investments</CardTitle>
              <Link href="/investments" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <CardDescription>Your largest asset holdings</CardDescription>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No assets yet. <Link href="/investments" className="text-primary underline">Add one</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {assets.map((asset) => {
                  const invested = Number(asset.investedAmount)
                  const current = Number(asset.currentValue)
                  const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0
                  return (
                    <div key={asset.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium leading-none flex items-center gap-2">
                          {asset.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {asset.type.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(current, currency)}
                        </div>
                        <div className={`text-xs ${returnPct >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Summary Widget */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Goals</CardTitle>
              <Link href="/goals" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <CardDescription>Your nearest financial targets</CardDescription>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No goals yet. <Link href="/goals" className="text-primary underline">Add one</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const target = Number(goal.targetAmount)
                  const current = Number(goal.currentAmount)
                  const progress = Math.min(100, Math.round((current / target) * 100))
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-muted-foreground">{formatDate(goal.targetDate)}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(current, currency)}</span>
                        <span>{formatCurrency(target, currency)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
