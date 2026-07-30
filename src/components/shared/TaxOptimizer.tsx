"use client"

import { useMemo } from "react"
import { formatCurrency } from "@/lib/utils"

interface TaxOptimizerProps {
  grossIncome: number
  deduction80C: number
  otherDeductions: number
  oldTax: number
  newTax: number
  currency?: string
}

export function TaxOptimizer({
  grossIncome,
  deduction80C,
  otherDeductions,
  oldTax,
  newTax,
  currency = "INR",
}: TaxOptimizerProps) {
  const cap80C = 150000
  const remaining80C = Math.max(0, cap80C - deduction80C)
  const cap80D = 25000
  const capNPS = 50000

  const recommendation = useMemo(() => {
    const diff = Math.abs(oldTax - newTax)
    if (oldTax < newTax) {
      return {
        regime: "Old Tax Regime",
        savings: diff,
        tip: `You save ${formatCurrency(diff, currency)} in the Old Regime due to your deductions.`,
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      }
    } else if (newTax < oldTax) {
      return {
        regime: "New Tax Regime",
        savings: diff,
        tip: `You save ${formatCurrency(diff, currency)} in the New Regime without needing extra investments.`,
        badgeColor: "bg-primary/10 text-primary border-primary/20",
      }
    } else {
      return {
        regime: "Either Regime",
        savings: 0,
        tip: "Both regimes yield equal tax liability for your current income.",
        badgeColor: "bg-muted text-muted-foreground border-border",
      }
    }
  }, [oldTax, newTax, currency])

  return (
    <div className="bg-card rounded-3xl border border-border/70 p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            💡 Tax Saving Optimizer & Deduction Maximizer
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Maximize Section 80C, 80D, and NPS deductions to minimize total tax outgo
          </p>
        </div>
        <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold ${recommendation.badgeColor}`}>
          Optimal: {recommendation.regime}
        </div>
      </div>

      {/* Recommendation Banner */}
      <div className="p-4 rounded-2xl bg-secondary/40 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-foreground">AI CFO Tax Insight: </span>
          <span className="text-muted-foreground">{recommendation.tip}</span>
        </div>
        {recommendation.savings > 0 && (
          <span className="font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-sm">
            Save {formatCurrency(recommendation.savings, currency)}
          </span>
        )}
      </div>

      {/* Section 80 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Section 80C */}
        <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-foreground">Section 80C</span>
            <span className="text-[10px] text-muted-foreground">Cap: ₹1.5L</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground font-mono">
              <span>Invested: {formatCurrency(deduction80C, currency)}</span>
              <span>Gap: {formatCurrency(remaining80C, currency)}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((deduction80C / cap80C) * 100))}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ELSS Mutual Funds, PPF, EPF, NPS, Tax-Saver FDs
          </p>
        </div>

        {/* Section 80D */}
        <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-foreground">Section 80D</span>
            <span className="text-[10px] text-muted-foreground">Cap: ₹25k - ₹75k</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground font-mono">
              <span>Health Insurance</span>
              <span>Up to ₹75,000</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full w-2/3" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Medical insurance premiums for self, family & senior parents
          </p>
        </div>

        {/* Section 80CCD(1B) NPS */}
        <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-foreground">Section 80CCD(1B)</span>
            <span className="text-[10px] text-muted-foreground">Cap: ₹50k</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground font-mono">
              <span>NPS Tier 1</span>
              <span>Extra ₹50,000</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full w-1/2" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Additional ₹50,000 tax deduction over and above Section 80C
          </p>
        </div>
      </div>
    </div>
  )
}
