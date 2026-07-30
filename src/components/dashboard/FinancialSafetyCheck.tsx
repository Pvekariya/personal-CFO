"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"

interface FinancialSafetyCheckProps {
  liquidNetWorth: number
  monthlyExpense: number
  currency: string
  income: number
  expense: number
  fallbackIncome: number
  dtiRatio: number
  runwayMonths: number
}

export function FinancialSafetyCheck({
  liquidNetWorth,
  monthlyExpense,
  currency,
  income,
  expense,
  fallbackIncome,
  dtiRatio,
  runwayMonths: initialRunwayMonths,
}: FinancialSafetyCheckProps) {
  const [showSettings, setShowSettings] = useState(false)

  const [targetMonths, setTargetMonths] = useState(6)
  const [isCustomAmount, setIsCustomAmount] = useState(false)
  const [customAmount, setCustomAmount] = useState(0)
  const [customMonthlyExpense, setCustomMonthlyExpense] = useState(0)

  // Load target configuration from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedMonths = localStorage.getItem("cfo_safety_target_months")
      const storedCustom = localStorage.getItem("cfo_safety_is_custom")
      const storedAmt = localStorage.getItem("cfo_safety_custom_amount")
      const storedCustomMonthly = localStorage.getItem("cfo_safety_custom_monthly_expense")

      if (storedMonths) setTargetMonths(Number(storedMonths))
      if (storedCustom) setIsCustomAmount(storedCustom === "true")
      
      if (storedAmt) {
        setCustomAmount(Number(storedAmt))
      } else {
        setCustomAmount(6 * monthlyExpense)
      }
      
      if (storedCustomMonthly) setCustomMonthlyExpense(Number(storedCustomMonthly))
    }
  }, [monthlyExpense])

  const saveSettings = (months: number, custom: boolean, amount: number, customMonthly: number) => {
    localStorage.setItem("cfo_safety_target_months", months.toString())
    localStorage.setItem("cfo_safety_is_custom", custom.toString())
    localStorage.setItem("cfo_safety_custom_amount", amount.toString())
    localStorage.setItem("cfo_safety_custom_monthly_expense", customMonthly.toString())
  }

  const handleMonthsChange = (months: number) => {
    setTargetMonths(months)
    saveSettings(months, isCustomAmount, customAmount, customMonthlyExpense)
  }

  const handleCustomToggle = (custom: boolean) => {
    setIsCustomAmount(custom)
    saveSettings(targetMonths, custom, customAmount, customMonthlyExpense)
  }

  const handleCustomAmountChange = (amount: number) => {
    setCustomAmount(amount)
    saveSettings(targetMonths, isCustomAmount, amount, customMonthlyExpense)
  }

  const handleCustomMonthlyExpenseChange = (value: number) => {
    setCustomMonthlyExpense(value)
    saveSettings(targetMonths, isCustomAmount, customAmount, value)
  }

  // Calculate target numbers using either user-defined monthly expense or dynamic database monthly expense
  const effectiveMonthlyExpense = customMonthlyExpense > 0 ? customMonthlyExpense : monthlyExpense
  const targetAmount = isCustomAmount ? customAmount : (targetMonths * effectiveMonthlyExpense)
  const calculatedRunwayMonths = (liquidNetWorth / Math.max(1000, effectiveMonthlyExpense)).toFixed(1)
  
  const deficit = Math.max(0, targetAmount - liquidNetWorth)
  const surplus = Math.max(0, liquidNetWorth - targetAmount)
  const targetMet = liquidNetWorth >= targetAmount

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Emergency Fund & Financial Safety Check
              </h2>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-muted-foreground/80 hover:text-foreground p-1 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors"
                title="Adjust safety thresholds"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={showSettings ? "rotate-45 transition-transform" : "transition-transform"}
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-muted-foreground/80 font-normal mt-0.5">
              Instant summary of your savings buffer, loan burden, and monthly recommendations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
            Emergency Buffer: {calculatedRunwayMonths} Months
          </span>
          <span className={`px-3 py-1 rounded-full border font-semibold ${dtiRatio > 40 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
            EMI Load: {dtiRatio}% of Income
          </span>
        </div>
      </div>

      {/* Threshold and Config Settings Panel */}
      {showSettings && (
        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Col: Setup monthly expense */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Emergency Monthly Expense (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={customMonthlyExpense || ""}
                  placeholder={`Dynamic: ₹${monthlyExpense.toLocaleString("en-IN")}/mo`}
                  onChange={(e) => handleCustomMonthlyExpenseChange(Number(e.target.value))}
                  className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/80">Override the monthly cost used to calculate runway (leave blank to auto-calculate).</p>
            </div>

            {/* Right Col: Goal Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Emergency Goal Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCustomToggle(false)}
                  className={`flex-1 py-2 rounded-md text-[10px] font-semibold transition-all border ${!isCustomAmount ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/70 border-transparent'}`}
                >
                  Month-based
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomToggle(true)}
                  className={`flex-1 py-2 rounded-md text-[10px] font-semibold transition-all border ${isCustomAmount ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/70 border-transparent'}`}
                >
                  Custom Amount
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-3">
            {!isCustomAmount ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Target Runway:</span>
                  <span className="text-foreground">{targetMonths} Months (≈ {formatCurrency(targetMonths * effectiveMonthlyExpense, currency)})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={targetMonths}
                  onChange={(e) => handleMonthsChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-[10px] text-muted-foreground/80">Standard financial advice recommends keeping 3 to 12 months of expenses handy.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Custom Target Amount:</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={customAmount || ""}
                    placeholder="e.g. 200000"
                    onChange={(e) => handleCustomAmountChange(Number(e.target.value))}
                    className="flex h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/80">Enter the fixed target cash amount you want to save for emergencies.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="font-semibold text-foreground">1. Emergency Cash Safety</span>
          <p className="text-muted-foreground/90">
            {targetMet
              ? `Great job! You have ${formatCurrency(liquidNetWorth, currency)} saved (Target: ${formatCurrency(targetAmount, currency)}). You're safe with a surplus of ${formatCurrency(surplus, currency)}!`
              : `You need ${formatCurrency(deficit, currency)} more to reach your target of ${formatCurrency(targetAmount, currency)} (current cash: ${formatCurrency(liquidNetWorth, currency)}).`}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="font-semibold text-foreground">2. Loan & EMI Health</span>
          <p className="text-muted-foreground/90">
            {dtiRatio === 0
              ? "No loan EMIs. You have total freedom over your income!"
              : dtiRatio <= 35
              ? `Safe EMI load at ${dtiRatio}%. Try to keep total EMIs under 40% of your income.`
              : `Warning: ${dtiRatio}% of your income goes to EMIs. Consider paying off high-interest loans early.`}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-1">
          <span className="font-semibold text-foreground">3. Monthly Savings Rate</span>
          <p className="text-muted-foreground/90">
            {income > 0 && (income - expense) / income >= 0.3
              ? `Great job! You are saving ${Math.round(((income - expense) / income) * 100)}% of your income. Put this surplus into investments.`
              : "Aim to save at least 30% of your income by cutting down unnecessary subscriptions."}
          </p>
        </div>
      </div>
    </div>
  )
}
