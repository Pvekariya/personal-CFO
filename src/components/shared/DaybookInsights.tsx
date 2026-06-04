"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/utils"

type BudgetInsight = {
  id: string
  categoryName: string
  categoryIcon: string
  budgetAmount: number
  spent: number
  spentPercent: number
  status: "ON_TRACK" | "WARNING" | "DANGER" | "EXCEEDED"
}

type SubscriptionInsight = {
  id: string
  name: string
  amount: number
  type: string
  lastDate: string
  nextDate: string
  daysUntil: number
}

type InsightsData = {
  monthElapsedPercent: number
  budgets: BudgetInsight[]
  subscriptions: SubscriptionInsight[]
}

export function DaybookInsights() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/transactions/insights")
      .then(res => res.json())
      .then(json => {
        if (json.data) setData(json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="h-40 animate-pulse bg-card/40 rounded-3xl border border-border/50"></div>
  }

  if (!data) return null

  // We only show if there's actual data to show (at least 1 budget or subscription)
  if (data.budgets.length === 0 && data.subscriptions.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
      {/* BUDGET PACING */}
      {data.budgets.length > 0 && (
        <div className="bg-card/40 backdrop-blur-md rounded-3xl p-6 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg tracking-tight">Budget vs Actuals</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-secondary rounded-full">
              Month is {Math.round(data.monthElapsedPercent)}% complete
            </span>
          </div>

          <div className="space-y-5">
            {data.budgets.map(budget => (
              <div key={budget.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{budget.categoryIcon || "🏷️"}</span>
                    <span className="font-semibold text-sm">{budget.categoryName}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm tracking-tight">{formatCurrency(budget.spent)}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      of {formatCurrency(budget.budgetAmount)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden relative">
                  {/* The elapsed line marker */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10" 
                    style={{ left: `${data.monthElapsedPercent}%` }}
                    title="Current date"
                  />
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      budget.status === 'EXCEEDED' ? 'bg-destructive' :
                      budget.status === 'DANGER' ? 'bg-orange-500' :
                      budget.status === 'WARNING' ? 'bg-yellow-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(budget.spentPercent, 100)}%` }}
                  />
                </div>
                
                {/* Status Warning */}
                {budget.status !== 'ON_TRACK' && (
                  <p className={`text-xs font-semibold ${budget.status === 'EXCEEDED' ? 'text-destructive' : budget.status === 'DANGER' ? 'text-orange-500' : 'text-yellow-500'}`}>
                    {budget.status === 'EXCEEDED' ? "Budget exceeded!" :
                     budget.status === 'DANGER' ? "Pacing too fast! Slow down spending." :
                     "Warning: Slightly over-pacing this budget."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECURRING / SUBSCRIPTIONS */}
      {data.subscriptions.length > 0 && (
        <div className="bg-card/40 backdrop-blur-md rounded-3xl p-6 border border-border/50 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg tracking-tight">Recurring Engine</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
              Cashflow Forecast
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {data.subscriptions.slice(0, 5).map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border/50">
                    <img src="https://img.icons8.com/ios/50/recurring-appointment.png" className="w-5 h-5 dark:invert opacity-70" alt="recurring" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm truncate max-w-[150px]">{sub.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      {sub.daysUntil < 0 ? "Overdue" : sub.daysUntil === 0 ? "Due Today" : `Due in ${sub.daysUntil} days`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm tracking-tight ${sub.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {sub.type === 'INCOME' ? '+' : '-'}{formatCurrency(sub.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
