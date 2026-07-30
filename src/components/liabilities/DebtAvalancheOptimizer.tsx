"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"

type LiabilityItem = {
  id: string
  name: string
  type: string
  outstandingBalance: string
  interestRate: string | null
  emiAmount: string | null
}

interface DebtAvalancheOptimizerProps {
  liabilities: LiabilityItem[]
  currency?: string
}

export function DebtAvalancheOptimizer({ liabilities, currency = "INR" }: DebtAvalancheOptimizerProps) {
  const [extraPrepayment, setExtraPrepayment] = useState(5000)

  const avalancheData = useMemo(() => {
    // Sort liabilities by interest rate descending
    const sorted = [...liabilities].sort((a, b) => {
      const rA = parseFloat(a.interestRate || "0")
      const rB = parseFloat(b.interestRate || "0")
      return rB - rA
    })

    let totalDebt = 0
    let totalMonthlyEmi = 0
    let weightedRateSum = 0

    sorted.forEach((l) => {
      const bal = parseFloat(l.outstandingBalance || "0")
      const emi = parseFloat(l.emiAmount || "0")
      const rate = parseFloat(l.interestRate || "10")

      totalDebt += bal
      totalMonthlyEmi += emi
      weightedRateSum += bal * rate
    })

    const avgRate = totalDebt > 0 ? weightedRateSum / totalDebt : 0

    // Calculate baseline payoff timeline in months
    const monthlyRate = avgRate / 100 / 12
    const baselineMonthly = Math.max(1000, totalMonthlyEmi)

    // Rough amortization approximation
    const baselineMonths = monthlyRate > 0 && baselineMonthly > totalDebt * monthlyRate
      ? Math.round(-Math.log(1 - (totalDebt * monthlyRate) / baselineMonthly) / Math.log(1 + monthlyRate))
      : 36

    // Prepayment payoff timeline
    const acceleratedMonthly = baselineMonthly + extraPrepayment
    const acceleratedMonths = monthlyRate > 0 && acceleratedMonthly > totalDebt * monthlyRate
      ? Math.round(-Math.log(1 - (totalDebt * monthlyRate) / acceleratedMonthly) / Math.log(1 + monthlyRate))
      : 24

    const monthsSaved = Math.max(0, baselineMonths - acceleratedMonths)
    const baselineTotalPaid = baselineMonthly * baselineMonths
    const acceleratedTotalPaid = acceleratedMonthly * acceleratedMonths
    const interestSaved = Math.max(0, Math.round(baselineTotalPaid - acceleratedTotalPaid))

    return {
      sorted,
      totalDebt: Math.round(totalDebt),
      totalMonthlyEmi: Math.round(totalMonthlyEmi),
      avgRate: avgRate.toFixed(1),
      baselineMonths,
      acceleratedMonths,
      monthsSaved,
      interestSaved,
    }
  }, [liabilities, extraPrepayment])

  if (liabilities.length === 0) return null

  const topTarget = avalancheData.sorted[0]

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            Loan Repayment & Interest Saver
          </h2>
          <p className="text-xs text-muted-foreground/80 font-normal mt-1">
            Pay off highest-interest loans first to save thousands in bank interest and become debt-free faster
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-rose-500/5 border border-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-semibold font-mono">
          Highest Rate: {topTarget ? `${topTarget.interestRate || '12'}% yearly` : 'N/A'}
        </div>
      </div>

      {/* Prepayment Input Slider */}
      <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border/40">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span>Extra Monthly Loan Prepayment</span>
          <span className="text-primary font-semibold font-mono">{formatCurrency(extraPrepayment, currency)} / month</span>
        </div>
        <input
          type="range"
          min="1000"
          max="50000"
          step="1000"
          value={extraPrepayment}
          onChange={(e) => setExtraPrepayment(Number(e.target.value))}
          className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
        />
        <p className="text-[11px] text-muted-foreground/80">
          Paying {formatCurrency(extraPrepayment, currency)} extra towards your {topTarget?.name || 'highest rate loan'} each month reduces your loan duration significantly!
        </p>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Interest Saved</p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(avalancheData.interestSaved, currency)}
          </p>
          <p className="text-[11px] text-muted-foreground/80">Extra money saved in your pocket</p>
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Become Debt-Free</p>
          <p className="text-lg font-bold text-foreground">
            {avalancheData.monthsSaved} Months Sooner
          </p>
          <p className="text-[11px] text-muted-foreground/80">Duration reduced from {avalancheData.baselineMonths} to {avalancheData.acceleratedMonths} months</p>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pay Off First</p>
          <p className="text-lg font-bold text-foreground truncate">
            {topTarget?.name || 'High Interest Loan'}
          </p>
          <p className="text-[11px] text-muted-foreground/80">Highest interest loan @ {topTarget?.interestRate || '12'}%</p>
        </div>
      </div>
    </div>
  )
}
