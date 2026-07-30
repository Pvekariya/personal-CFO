"use client"

import { useMemo } from "react"
import { formatCurrency } from "@/lib/utils"

type AccountItem = {
  id: string
  name: string
  type: string
  balance: string
}

interface CashDragAnalyzerProps {
  accounts: AccountItem[]
  currency?: string
}

export function CashDragAnalyzer({ accounts, currency = "INR" }: CashDragAnalyzerProps) {
  const analysis = useMemo(() => {
    let totalSavingsBalance = 0
    let idleCash = 0

    const threshold = 100000 // ₹1L emergency operational threshold

    accounts.forEach((acc) => {
      const bal = parseFloat(acc.balance || "0")
      if (acc.type === "SAVINGS" || acc.type === "CHECKING" || acc.type === "CURRENT") {
        totalSavingsBalance += bal
        if (bal > threshold) {
          idleCash += bal - threshold
        }
      }
    })

    const savingsRate = 0.0275 // 2.75% avg bank savings rate
    const liquidRate = 0.071 // 7.10% liquid/arbitrage fund rate

    const currentInterest = idleCash * savingsRate
    const optimizedInterest = idleCash * liquidRate
    const lostInterestAnnual = Math.round(optimizedInterest - currentInterest)

    return {
      totalSavingsBalance: Math.round(totalSavingsBalance),
      idleCash: Math.round(idleCash),
      lostInterestAnnual,
      savingsRatePct: (savingsRate * 100).toFixed(2),
      liquidRatePct: (liquidRate * 100).toFixed(2),
    }
  }, [accounts])

  if (analysis.idleCash <= 0) return null

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            Idle Cash Interest Maximizer
          </h2>
          <p className="text-xs text-muted-foreground/80 font-normal mt-0.5">
            Earn extra interest on extra cash sitting idle in your savings account
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold font-mono">
          Idle Cash: {formatCurrency(analysis.idleCash, currency)}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-foreground">Smart Tip: </span>
          <span className="text-muted-foreground/90">
            You have {formatCurrency(analysis.idleCash, currency)} sitting in bank savings earning only {analysis.savingsRatePct}% yearly interest.
          </span>
        </div>
        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
          + {formatCurrency(analysis.lostInterestAnnual, currency)} / yr extra return
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
          <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Current Bank Savings (2.75%)</span>
          <p className="text-lg font-bold text-foreground mt-1">
            {formatCurrency(Math.round(analysis.idleCash * 0.0275), currency)} <span className="text-xs font-normal text-muted-foreground">per year</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider">High-Yield Liquid Funds / Auto Sweep (7.10%)</span>
          <p className="text-lg font-bold text-foreground mt-1">
            {formatCurrency(Math.round(analysis.idleCash * 0.071), currency)} <span className="text-xs font-normal text-muted-foreground">per year</span>
          </p>
        </div>
      </div>
    </div>
  )
}
