import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopHeader } from "@/components/shared/TopHeader"
import { Badge } from "@/components/ui/badge"
import { Metadata } from "next"
import { FinancialSafetyCheck } from "@/components/dashboard/FinancialSafetyCheck"
import { convertCurrency } from "@/lib/currency"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your personal CFO dashboard, track net worth, and review recent cash flows.",
}

export default async function DashboardPage() {
  const session = await auth()
  let workspaceId = session?.user?.workspaceId

  if (!workspaceId && session?.user?.id) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, isActive: true },
      select: { workspaceId: true },
    })
    if (member) {
      workspaceId = member.workspaceId
    } else {
      const fallbackWs = await prisma.workspace.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      })
      if (fallbackWs) workspaceId = fallbackWs.id
    }
  }

  if (!workspaceId) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Setting up your workspace...</h2>
        <p className="text-sm text-muted-foreground">Please refresh or sign in to continue.</p>
        <Link href="/login" className="text-primary underline text-sm font-semibold">
          Return to Sign In
        </Link>
      </div>
    )
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
  const currency = workspace?.currency || "INR"

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [accounts, recentTransactions, monthTransactions, assets, goals, liabilities, profile] = await Promise.all([
    prisma.account.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { balance: "desc" },
    }),
    prisma.transaction.findMany({
      where: { workspaceId, deletedAt: null },
      include: { category: true, account: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        date: { gte: startOfMonth },
      },
    }),
    prisma.asset.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { currentValue: "desc" },
      take: 10,
    }),
    prisma.goal.findMany({
      where: { workspaceId },
      orderBy: { targetDate: "asc" },
      take: 10,
    }),
    prisma.liability.findMany({
      where: { workspaceId, isActive: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId: session?.user?.id || "" }
    })
  ])

  // Calculate Net Worth with currency conversion
  const [liquidNetWorth, investedNetWorth, totalLiabilities] = await Promise.all([
    Promise.all(accounts.map(a => convertCurrency(Number(a.balance), a.currency, currency)))
      .then(vals => vals.reduce((acc, v) => acc + v, 0)),
    Promise.all(assets.map(a => convertCurrency(Number(a.currentValue), a.currency, currency)))
      .then(vals => vals.reduce((acc, v) => acc + v, 0)),
    Promise.all(liabilities.map(l => convertCurrency(Number(l.outstandingBalance), l.currency, currency)))
      .then(vals => vals.reduce((acc, v) => acc + v, 0)),
  ])

  const totalNetWorth = liquidNetWorth + investedNetWorth - totalLiabilities
  const totalAssets = liquidNetWorth + investedNetWorth

  // Calculate Cash Flow with currency conversion
  let income = 0
  let expense = 0
  for (const t of monthTransactions) {
    const convertedAmount = await convertCurrency(Number(t.amount), t.currency, currency)
    if (t.type === "INCOME") income += convertedAmount
    if (t.type === "EXPENSE") expense += convertedAmount
  }
  const cashFlow = income - expense

  // Calculate Financial Health Score (0-100)
  let liquidityScore = 0
  let debtScore = 0
  let savingsScore = 0
  let investmentScore = 0

  const fallbackIncome = profile?.monthlyIncome ? Number(profile.monthlyIncome) : 75000
  const fallbackExpense = fallbackIncome * 0.70
  const monthlyExpense = expense > 0 ? expense : fallbackExpense
  const monthsOfBuffer = liquidNetWorth / Math.max(1000, monthlyExpense)
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

  const totalMonthlyEmi = liabilities.reduce((acc, l) => acc + Number(l.emiAmount || 0), 0)
  const realIncome = income > 0 ? income : fallbackIncome
  const dtiRatio = realIncome > 0 ? Math.round((totalMonthlyEmi / realIncome) * 100) : 0
  const runwayMonths = (liquidNetWorth / Math.max(1000, monthlyExpense)).toFixed(1)

  return (
    <div className="space-y-6">
      <TopHeader 
        title="Dashboard" 
        subtitle={`Welcome back, ${session?.user?.name?.split(" ")[0] || "there"}`} 
        user={session?.user} 
      />

      {/* Financial Safety & Smart Advice Banner */}
      <FinancialSafetyCheck
        liquidNetWorth={liquidNetWorth}
        monthlyExpense={monthlyExpense}
        currency={currency}
        income={income}
        expense={expense}
        fallbackIncome={fallbackIncome}
        dtiRatio={dtiRatio}
        runwayMonths={Number(runwayMonths)}
      />

      {/* Main KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="premium-card premium-card-hover relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Total Net Worth</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
              <img src="https://img.icons8.com/ios/50/diamond--v1.png" alt="Net Worth" className="w-4 h-4 dark:invert opacity-70" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl font-bold tracking-tight font-mono ${totalNetWorth >= 0 ? 'bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-300 dark:to-teal-500' : 'text-rose-500'}`}>
              {totalNetWorth >= 0 ? '+' : ''}{formatCurrency(totalNetWorth, currency)}
            </div>
            <div className="premium-card flex items-center mt-3 p-2 bg-secondary/50 rounded-lg border border-border/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground font-medium flex justify-between w-full">
                <span>Assets <span className="text-foreground ml-1">{formatCurrency(liquidNetWorth + investedNetWorth, currency)}</span></span>
                <span className="opacity-50">•</span>
                <span>Debt <span className="text-foreground ml-1">{formatCurrency(totalLiabilities, currency)}</span></span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card premium-card-hover relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Monthly Cash Flow</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
              <img src="https://img.icons8.com/ios/50/bank-cards.png" alt="Cash Flow" className="w-4 h-4 dark:invert opacity-70" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold tracking-tight font-mono bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
              {formatCurrency(cashFlow, currency)}
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 flex items-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mr-2">
                  <img src="https://img.icons8.com/ios/50/collapse-arrow--v1.png" className="w-3 h-3 animate-pulse" alt="In" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(income, currency)}</span>
              </div>
              <div className="flex-1 flex items-center p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center mr-2">
                  <img src="https://img.icons8.com/ios/50/expand-arrow--v1.png" className="w-3 h-3 animate-pulse" alt="Out" />
                </div>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(expense, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card premium-card-hover relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">Financial Health</CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-full group-hover:scale-110 transition-transform duration-300">
              <img src="https://img.icons8.com/ios/50/heart-health.png" alt="Health" className="w-4 h-4 dark:invert opacity-70" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className={`text-3xl font-bold tracking-tight font-mono ${healthColor} flex items-baseline gap-1`}>
              {healthScore} <span className="text-sm text-muted-foreground font-semibold">/ 100</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-4 overflow-hidden shadow-inner ring-1 ring-border/50">
              <div
                className={`h-full transition-all duration-1000 relative overflow-hidden ${healthScore >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : healthScore >= 50 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
                style={{ width: `${healthScore}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripe_1s_linear_infinite]" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium text-center">
              {healthScore >= 80 ? "Excellent standing" : healthScore >= 50 ? "Needs some attention" : "Critical improvements needed"}
            </p>
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
              <div className="space-y-4 max-h-[210px] overflow-y-auto pr-1">
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
              <div className="space-y-3 max-h-[195px] overflow-y-auto pr-1">
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
              <div className="space-y-4 max-h-[195px] overflow-y-auto pr-1">
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
              <div className="space-y-4 max-h-[210px] overflow-y-auto pr-1">
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
