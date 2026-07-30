"use client"

import { useMemo } from "react"
import { formatCurrency } from "@/lib/utils"

interface CFOHealthAuditProps {
  assets: { currentValue: string; class: string; type: string; name: string }[]
  accounts: { balance: string; type: string; name: string }[]
  liabilities: { outstandingBalance: string; emiAmount: string | null }[]
  transactions: { amount: string; type: string }[]
  profile?: { monthlyIncome?: string } | null
  currency?: string
}

type AuditItem = {
  title: string
  score: number
  maxScore: number
  status: "OPTIMAL" | "GOOD" | "ATTENTION"
  insight: string
}

export function CFOHealthAudit({
  assets,
  accounts,
  liabilities,
  transactions,
  profile,
  currency = "INR",
}: CFOHealthAuditProps) {
  const audit = useMemo(() => {
    // 1. Calculate base parameters
    const totalLiquid = accounts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0)
    const totalPortfolio = assets.reduce((sum, a) => sum + parseFloat(a.currentValue || "0"), 0)
    const totalDebt = liabilities.reduce((sum, l) => sum + parseFloat(l.outstandingBalance || "0"), 0)
    const netWorth = totalLiquid + totalPortfolio - totalDebt

    const income = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)
    const expense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)

    const fallbackIncome = profile?.monthlyIncome ? parseFloat(profile.monthlyIncome) : 75000
    const fallbackExpense = fallbackIncome * 0.70
    
    const monthlyIncome = income > 0 ? income : fallbackIncome
    const monthlyExpense = expense > 0 ? expense : fallbackExpense

    // 2. Item 1: Emergency Cash Safety Buffer (Max 20 pts)
    const runwayMonths = totalLiquid / Math.max(1000, monthlyExpense)
    let bufferScore = 10
    let bufferStatus: AuditItem["status"] = "ATTENTION"
    let bufferInsight = `Your savings cover ${runwayMonths.toFixed(1)} months of expenses. Aim for 6 months.`

    if (runwayMonths >= 6) {
      bufferScore = 20
      bufferStatus = "OPTIMAL"
      bufferInsight = `Excellent savings buffer covering ${runwayMonths.toFixed(1)} months of expenses.`
    } else if (runwayMonths >= 3) {
      bufferScore = 15
      bufferStatus = "GOOD"
      bufferInsight = `Moderate savings buffer covering ${runwayMonths.toFixed(1)} months of expenses.`
    }

    // 3. Item 2: Monthly Savings Rate (Max 20 pts)
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : 0
    let savingsRateScore = 5
    let savingsRateStatus: AuditItem["status"] = "ATTENTION"
    let savingsRateInsight = `Savings rate is ${(savingsRate * 100).toFixed(0)}%. Aim for 30% of income.`

    if (savingsRate >= 0.30) {
      savingsRateScore = 20
      savingsRateStatus = "OPTIMAL"
      savingsRateInsight = `Saving a strong ${(savingsRate * 100).toFixed(0)}% of your monthly income.`
    } else if (savingsRate >= 0.15) {
      savingsRateScore = 15
      savingsRateStatus = "GOOD"
      savingsRateInsight = `Healthy savings rate of ${(savingsRate * 100).toFixed(0)}% of monthly income.`
    }

    // 4. Item 3: Loan EMI Load (Max 15 pts)
    const totalEMI = liabilities.reduce((sum, l) => sum + parseFloat(l.emiAmount || "0"), 0)
    const emiLoadRatio = monthlyIncome > 0 ? totalEMI / monthlyIncome : 0
    let emiScore = 5
    let emiStatus: AuditItem["status"] = "ATTENTION"
    let emiInsight = `EMIs take up ${(emiLoadRatio * 100).toFixed(0)}% of income. Keep total EMIs below 40%.`

    if (totalEMI === 0) {
      emiScore = 15
      emiStatus = "OPTIMAL"
      emiInsight = "No active monthly EMI payments. Excellent leverage safety."
    } else if (emiLoadRatio <= 0.30) {
      emiScore = 15
      emiStatus = "OPTIMAL"
      emiInsight = `Safe EMI load at ${(emiLoadRatio * 100).toFixed(0)}% of monthly income.`
    } else if (emiLoadRatio <= 0.45) {
      emiScore = 10
      emiStatus = "GOOD"
      emiInsight = `Moderate EMI burden at ${(emiLoadRatio * 100).toFixed(0)}% of monthly income.`
    }

    // 5. Item 4: Investment Mix (Max 15 pts)
    const equityValue = assets
      .filter((a) => ["EQUITY", "MUTUAL_FUND", "STOCKS"].includes(a.class.toUpperCase()))
      .reduce((sum, a) => sum + parseFloat(a.currentValue || "0"), 0)
    const equityRatio = totalPortfolio > 0 ? equityValue / totalPortfolio : 0
    let mixScore = 8
    let mixStatus: AuditItem["status"] = "ATTENTION"
    let mixInsight = "No investments found. Grow your money by investing in equity/mutual funds."

    if (totalPortfolio > 0) {
      if (equityRatio >= 0.40) {
        mixScore = 15
        mixStatus = "OPTIMAL"
        mixInsight = `Good asset distribution with ${(equityRatio * 100).toFixed(0)}% allocated in growth assets.`
      } else {
        mixScore = 11
        mixStatus = "GOOD"
        mixInsight = `Conservative mix with ${(equityRatio * 100).toFixed(0)}% in equities. Allocate more to mutual funds.`
      }
    }

    // 6. Item 5: Early Retirement Progress (Max 15 pts)
    const annualExpense = monthlyExpense * 12
    const targetFIRECorpus = annualExpense * 25 // 25x Rule
    const fireRatio = targetFIRECorpus > 0 ? netWorth / targetFIRECorpus : 0
    let fireScore = 8
    let fireStatus: AuditItem["status"] = "ATTENTION"
    let fireInsight = `Net worth covers ${(fireRatio * 25).toFixed(1)} years of expenses. Aim for 25x annual expenses.`

    if (fireRatio >= 0.5) {
      fireScore = 15
      fireStatus = "OPTIMAL"
      fireInsight = `Solid runway! Saved ${Math.round(fireRatio * 100)}% of early retirement goal.`
    } else if (fireRatio >= 0.2) {
      fireScore = 12
      fireStatus = "GOOD"
      fireInsight = `Making progress. Saved ${Math.round(fireRatio * 100)}% of early retirement goal.`
    }

    // 7. Item 6: Tax Savings Optimization (Max 15 pts)
    // Deduct tax optimization if any assets/accounts match PPF, EPF, NPS or ELSS
    const hasTaxSavers =
      assets.some((a) => ["PPF", "EPF", "NPS", "ELSS"].includes(a.type.toUpperCase()) || a.name.toUpperCase().includes("TAX")) ||
      accounts.some((a) => ["PPF", "EPF", "NPS"].includes(a.type.toUpperCase()))
    const taxScore = hasTaxSavers ? 15 : 10
    const taxStatus: AuditItem["status"] = hasTaxSavers ? "OPTIMAL" : "ATTENTION"
    const taxInsight = hasTaxSavers
      ? "Good utilisation of Section 80C & 80D tax deductions."
      : "Start investing in PPF, NPS or ELSS funds to optimize tax liabilities."

    const items: AuditItem[] = [
      { title: "Emergency Cash Safety Buffer", score: bufferScore, maxScore: 20, status: bufferStatus, insight: bufferInsight },
      { title: "Monthly Savings Rate", score: savingsRateScore, maxScore: 20, status: savingsRateStatus, insight: savingsRateInsight },
      { title: "Loan EMI Load", score: emiScore, maxScore: 15, status: emiStatus, insight: emiInsight },
      { title: "Investment Mix", score: mixScore, maxScore: 15, status: mixStatus, insight: mixInsight },
      { title: "Early Retirement Progress", score: fireScore, maxScore: 15, status: fireStatus, insight: fireInsight },
      { title: "Tax Savings Optimization", score: taxScore, maxScore: 15, status: taxStatus, insight: taxInsight },
    ]

    const totalScore = items.reduce((acc, item) => acc + item.score, 0)
    let grade = "C (Needs Attention)"
    let gradeColor = "text-amber-500 border-amber-500/20 bg-amber-500/10"

    if (totalScore >= 85) {
      grade = "A+ (Excellent)"
      gradeColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
    } else if (totalScore >= 70) {
      grade = "B+ (Strong Financial Health)"
      gradeColor = "text-primary border-primary/20 bg-primary/10"
    }

    return {
      items,
      totalScore,
      grade,
      gradeColor,
    }
  }, [assets, accounts, liabilities, transactions, profile])

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            Financial Health Checkup (Out of 100)
          </h2>
          <p className="text-xs text-muted-foreground/80 font-normal mt-1">
            Comprehensive health score based on savings, debt safety, investment mix, and tax efficiency
          </p>
        </div>
        <div className={`px-3.5 py-1 rounded-full border text-xs font-semibold font-mono ${audit.gradeColor}`}>
          Score: {audit.totalScore}/100 • {audit.grade}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {audit.items.map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">{item.title}</span>
              <span className="font-mono font-semibold text-xs text-primary">
                {item.score}/{item.maxScore} pts
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((item.score / item.maxScore) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground/80">{item.insight}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
