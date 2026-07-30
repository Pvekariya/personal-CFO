"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"

interface FIREProjectionCalculatorProps {
  currentNetWorth?: number
  defaultMonthlySavings?: number
}

export function FIREProjectionCalculator({
  currentNetWorth = 500000,
  defaultMonthlySavings = 30000,
}: FIREProjectionCalculatorProps) {
  const [initialWealth, setInitialWealth] = useState(currentNetWorth || 500000)
  const [monthlySIP, setMonthlySIP] = useState(defaultMonthlySavings || 30000)
  const [years, setYears] = useState(15)
  const [returnRate, setReturnRate] = useState(12) // 12% CAGR
  const [inflation, setInflation] = useState(6) // 6% inflation

  const projection = useMemo(() => {
    const r = returnRate / 100 / 12
    const i = inflation / 100
    const n = years * 12

    // Future Value of Initial Wealth
    const fvInitial = initialWealth * Math.pow(1 + returnRate / 100, years)

    // Future Value of Monthly SIP
    const fvSIP = r > 0 ? monthlySIP * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : monthlySIP * n

    const totalNominal = fvInitial + fvSIP
    const totalReal = totalNominal / Math.pow(1 + i, years)

    // FIRE Target (25x annual expenses assuming current monthly SIP represents savings rate)
    const estimatedMonthlyExpenses = Math.max(20000, monthlySIP * 1.5)
    const fireTargetNominal = estimatedMonthlyExpenses * 12 * 25

    const progressPct = Math.min(100, Math.round((totalNominal / fireTargetNominal) * 100))

    return {
      totalNominal: Math.round(totalNominal),
      totalReal: Math.round(totalReal),
      fireTargetNominal: Math.round(fireTargetNominal),
      progressPct,
    }
  }, [initialWealth, monthlySIP, years, returnRate, inflation])

  return (
    <div className="bg-card rounded-3xl border border-border/70 p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🔥 Financial Freedom & FIRE Projection
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Simulate your wealth growth, inflation impact, and target retirement timeline
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
          {years} Year Horizon
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Current Net Worth */}
        <div className="space-y-1.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Current Net Worth</label>
          <div className="flex items-center gap-1 font-mono text-sm font-bold text-foreground">
            <span>₹</span>
            <input
              type="number"
              value={initialWealth}
              onChange={(e) => setInitialWealth(Number(e.target.value))}
              className="w-full bg-transparent outline-none border-b border-border focus:border-primary font-mono"
            />
          </div>
        </div>

        {/* Monthly Investment */}
        <div className="space-y-1.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Monthly Savings / SIP</label>
          <div className="flex items-center gap-1 font-mono text-sm font-bold text-foreground">
            <span>₹</span>
            <input
              type="number"
              value={monthlySIP}
              onChange={(e) => setMonthlySIP(Number(e.target.value))}
              className="w-full bg-transparent outline-none border-b border-border focus:border-primary font-mono"
            />
          </div>
        </div>

        {/* Expected CAGR */}
        <div className="space-y-1.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Expected CAGR (%)</label>
          <div className="flex items-center gap-1 font-mono text-sm font-bold text-foreground">
            <input
              type="number"
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
              className="w-full bg-transparent outline-none border-b border-border focus:border-primary font-mono"
            />
            <span>%</span>
          </div>
        </div>

        {/* Inflation */}
        <div className="space-y-1.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Inflation Rate (%)</label>
          <div className="flex items-center gap-1 font-mono text-sm font-bold text-foreground">
            <input
              type="number"
              value={inflation}
              onChange={(e) => setInflation(Number(e.target.value))}
              className="w-full bg-transparent outline-none border-b border-border focus:border-primary font-mono"
            />
            <span>%</span>
          </div>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="space-y-2 pt-2">
        <div className="flex justify-between text-xs font-bold">
          <span>Investment Timeline</span>
          <span className="text-primary">{years} Years ({new Date().getFullYear() + years})</span>
        </div>
        <input
          type="range"
          min="1"
          max="35"
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
          className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>1 Yr</span>
          <span>10 Yrs</span>
          <span>20 Yrs</span>
          <span>35 Yrs</span>
        </div>
      </div>

      {/* Output Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
          <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Projected Future Wealth</p>
          <p className="text-2xl font-extrabold text-foreground">
            ₹{projection.totalNominal.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground">In {years} years at {returnRate}% CAGR</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Inflation-Adjusted Value</p>
          <p className="text-2xl font-extrabold text-foreground">
            ₹{projection.totalReal.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground">Real purchasing power in today's money</p>
        </div>

        <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">FIRE Target Progress</p>
          <p className="text-2xl font-extrabold text-foreground">
            {projection.progressPct}%
          </p>
          <p className="text-xs text-muted-foreground">Of ₹{projection.fireTargetNominal.toLocaleString("en-IN")} FIRE goal</p>
        </div>
      </div>
    </div>
  )
}
