"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"

type Asset = {
  id: string
  name: string
  class: string
  currentValue: string
  investedAmount: string
}

interface PortfolioRebalancerProps {
  assets: Asset[]
  currency?: string
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  EQUITY: "Equity / Stocks / Mutual Funds",
  DEBT: "Debt / Fixed Income / PPF / FDs",
  GOLD: "Gold (Physical/Digital/SGBs)",
  SILVER: "Silver",
  REAL_ESTATE: "Real Estate / REITs",
  CRYPTO: "Cryptocurrency / Web3",
  COMMODITY: "Commodities / Agriculture",
  CASH_EQUIVALENT: "Cash / Liquid Funds / Wallets",
  INTERNATIONAL: "International / US Stocks",
  ALTERNATIVE: "Alternatives / Startup Equity",
}

const COLOR_MAP: Record<string, string> = {
  EQUITY: "bg-emerald-500",
  DEBT: "bg-blue-500",
  GOLD: "bg-amber-500",
  SILVER: "bg-slate-400",
  REAL_ESTATE: "bg-orange-500",
  CRYPTO: "bg-purple-500",
  COMMODITY: "bg-yellow-600",
  CASH_EQUIVALENT: "bg-teal-500",
  INTERNATIONAL: "bg-indigo-500",
  ALTERNATIVE: "bg-pink-500",
}

export function PortfolioRebalancer({ assets, currency = "INR" }: PortfolioRebalancerProps) {
  // Target allocation weights (%) for all asset classes
  const [targets, setTargets] = useState<Record<string, number>>({
    EQUITY: 50,
    DEBT: 30,
    GOLD: 10,
    CASH_EQUIVALENT: 10,
    REAL_ESTATE: 0,
    CRYPTO: 0,
    SILVER: 0,
    COMMODITY: 0,
    INTERNATIONAL: 0,
    ALTERNATIVE: 0,
  })

  // Open asset lists for each class
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({})
  const [newCapital, setNewCapital] = useState<string>("")

  const toggleExpand = (cls: string) => {
    setExpandedClasses((prev) => ({ ...prev, [cls]: !prev[cls] }))
  }

  const handleTargetChange = (cls: string, val: number) => {
    const sanitizedVal = Math.max(0, Math.min(100, isNaN(val) ? 0 : val))
    setTargets((prev) => ({ ...prev, [cls]: sanitizedVal }))
  }

  const targetSum = Object.values(targets).reduce((sum, val) => sum + val, 0)
  const isTargetSumValid = targetSum === 100

  // Calculate actual allocations and details
  const rebalanceData = useMemo(() => {
    let totalPortfolio = 0
    const actualMap: Record<string, number> = {}
    const assetsByClass: Record<string, Asset[]> = {}

    // Initialize maps
    Object.keys(targets).forEach((cls) => {
      actualMap[cls] = 0
      assetsByClass[cls] = []
    })

    // Group assets
    assets.forEach((a) => {
      const val = parseFloat(a.currentValue || "0")
      totalPortfolio += val

      const rawClass = (a.class || "").toUpperCase()
      const cls = targets.hasOwnProperty(rawClass) ? rawClass : "ALTERNATIVE"

      actualMap[cls] += val
      assetsByClass[cls].push(a)
    })

    if (totalPortfolio <= 0) {
      return { totalPortfolio: 0, classes: [], smartAllocations: null }
    }

    const classesList = Object.entries(targets).map(([cls, targetPct]) => {
      const actualVal = actualMap[cls]
      const actualPct = Math.round((actualVal / totalPortfolio) * 100)
      const targetVal = totalPortfolio * (targetPct / 100)
      const diff = Math.round(targetVal - actualVal)

      let action = "Balanced"
      if (diff > 0) {
        action = `Buy ${formatCurrency(diff, currency)}`
      } else if (diff < 0) {
        action = `Trim ${formatCurrency(Math.abs(diff), currency)}`
      }

      return {
        key: cls,
        name: ASSET_CLASS_LABELS[cls] || cls,
        actualVal: Math.round(actualVal),
        actualPct,
        targetPct,
        diff,
        action,
        color: COLOR_MAP[cls] || "bg-slate-500",
        assets: assetsByClass[cls] || [],
      }
    })

    // Calculate smart allocations for new capital input
    let smartAllocations = null
    const capitalNum = parseFloat(newCapital)
    if (!isNaN(capitalNum) && capitalNum > 0) {
      let remainingCapital = capitalNum
      const allocMap: Record<string, number> = {}
      
      // Initialize
      Object.keys(targets).forEach((cls) => {
        allocMap[cls] = 0
      })

      // Deficits to reach target allocation
      const deficits = Object.entries(targets).map(([cls, targetPct]) => {
        const actualVal = actualMap[cls]
        const targetVal = totalPortfolio * (targetPct / 100)
        return {
          key: cls,
          deficit: Math.max(0, targetVal - actualVal),
        }
      })

      const totalDeficit = deficits.reduce((sum, d) => sum + d.deficit, 0)
      if (totalDeficit > 0 && remainingCapital > 0) {
        const capitalToCloseDeficits = Math.min(remainingCapital, totalDeficit)
        deficits.forEach((d) => {
          const share = (d.deficit / totalDeficit) * capitalToCloseDeficits
          allocMap[d.key] = Math.round(share)
        })
        remainingCapital -= capitalToCloseDeficits
      }

      // Proportional split for any remaining capital
      if (remainingCapital > 0 && targetSum > 0) {
        Object.entries(targets).forEach(([cls, targetPct]) => {
          allocMap[cls] += Math.round(remainingCapital * (targetPct / targetSum))
        })
      }

      smartAllocations = Object.entries(allocMap)
        .map(([cls, amount]) => ({
          name: ASSET_CLASS_LABELS[cls] || cls,
          amount,
        }))
        .filter((a) => a.amount > 0)
    }

    return {
      totalPortfolio: Math.round(totalPortfolio),
      classes: classesList,
      smartAllocations,
    }
  }, [assets, targets, newCapital, currency, targetSum])

  if (assets.length === 0) return null

  return (
    <div className="premium-card p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            Target Portfolio Asset Rebalancer
          </h2>
          <p className="text-xs text-muted-foreground/80 font-normal mt-0.5">
            Allocate target weights to each asset class and see live gaps, asset listings, and allocation splits.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold font-mono">
          Portfolio: {formatCurrency(rebalanceData.totalPortfolio, currency)}
        </div>
      </div>

      {/* Target Allocation Adjuster */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
          <span>1. ALLOCATE TARGET WEIGHTS (%)</span>
          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${isTargetSumValid ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
            Total Target Weight: {targetSum}% {isTargetSumValid ? "(Perfect)" : "(Must equal 100%)"}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {Object.entries(targets).map(([cls, val]) => (
            <div key={cls} className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1">
              <label className="font-semibold text-muted-foreground/80 uppercase tracking-wider text-[8px] block truncate" title={ASSET_CLASS_LABELS[cls]}>
                {cls.replace(/_/g, " ")}
              </label>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                <input
                  type="number"
                  inputMode="numeric"
                  value={val || 0}
                  min="0"
                  max="100"
                  onChange={(e) => handleTargetChange(cls, parseInt(e.target.value))}
                  className="w-full bg-transparent outline-none border-b border-border/40 focus:border-primary font-mono text-foreground font-semibold"
                />
                <span>%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capital Allocation Calculator Widget */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <span className="text-xs font-bold text-muted-foreground block uppercase">2. SMART CAPITAL ALLOCATION ENGINE</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-3">
            <label className="block text-xs font-semibold text-foreground">Allocate New Cash (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={newCapital}
                placeholder="e.g. 50000"
                onChange={(e) => setNewCapital(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
              Enter the amount of new money you want to invest. The engine automatically distributes the cash to fill gaps in under-allocated asset classes first.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col justify-center space-y-2.5">
            <span className="text-xs font-bold text-primary block">Suggested Cash Splits</span>
            {rebalanceData.smartAllocations ? (
              <div className="space-y-2 text-xs overflow-y-auto max-h-[120px] pr-1">
                {rebalanceData.smartAllocations.map((alloc, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-border/20 pb-1.5 last:border-0 last:pb-0">
                    <span className="font-medium text-foreground/80">{alloc.name}:</span>
                    <span className="font-semibold font-mono text-foreground">{formatCurrency(alloc.amount, currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/80 flex items-center justify-center h-full py-4 text-center">
                Enter a cash sum on the left to see recommended allocation splits.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rebalancing Breakdown Cards */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">3. Live Allocation & Gaps</h3>
        <div className="space-y-2">
          {rebalanceData.classes.map((cls, idx) => {
            const hasAssets = cls.assets.length > 0
            const isExpanded = !!expandedClasses[cls.key]
            
            return (
              <div key={idx} className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cls.color}`} />
                    <span className="font-bold text-foreground">{cls.name}</span>
                  </div>
                  <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                    Actual {cls.actualPct}% vs Target {cls.targetPct}%
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${cls.color} rounded-full transition-all`} style={{ width: `${Math.min(100, cls.actualPct)}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-border/20">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/90 font-mono">Holding: {formatCurrency(cls.actualVal, currency)}</span>
                    {hasAssets && (
                      <button
                        onClick={() => toggleExpand(cls.key)}
                        className="text-primary hover:underline font-semibold"
                      >
                        {isExpanded ? "Hide Assets" : `Show Assets (${cls.assets.length})`}
                      </button>
                    )}
                  </div>
                  <span className={`font-semibold font-mono ${cls.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : cls.diff < 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                    {cls.action}
                  </span>
                </div>

                {/* Collapsible list of assets in this class */}
                {isExpanded && hasAssets && (
                  <div className="mt-2 pt-2 border-t border-border/30 pl-4 space-y-1.5 text-[10px] animate-in slide-in-from-top-1 duration-200">
                    <p className="text-muted-foreground/80 font-bold uppercase tracking-wider text-[8px] mb-1">Allocated Assets:</p>
                    {cls.assets.map((asset) => (
                      <div key={asset.id} className="flex justify-between items-center text-muted-foreground">
                        <span>{asset.name}</span>
                        <span className="font-mono font-medium text-foreground/80">{formatCurrency(parseFloat(asset.currentValue), currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
