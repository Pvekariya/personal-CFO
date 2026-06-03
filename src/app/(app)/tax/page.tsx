"use client"

import { useState, useEffect, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"

export default function TaxPage() {
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState("INR")

  // Income & Deductions State
  const [grossIncome, setGrossIncome] = useState(0)
  const [standardDeduction, setStandardDeduction] = useState(50000)
  const [deduction80C, setDeduction80C] = useState(0)
  const [otherDeductions, setOtherDeductions] = useState(0) // 80D, HRA, etc.

  // Results State
  const [oldTax, setOldTax] = useState(0)
  const [newTax, setNewTax] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [taxRes, profRes] = await Promise.all([
        fetch("/api/v1/tax"),
        fetch("/api/v1/profile"),
      ])
      const taxJson = await taxRes.json()
      const profJson = await profRes.json()

      if (taxJson.data) {
        setGrossIncome(taxJson.data.totalIncome)
        setDeduction80C(taxJson.data.deduction80C)
      }
      if (profJson.data?.currency) {
        setCurrency(profJson.data.currency)
      }
    } catch (error) {
      console.error("Failed to load tax data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Recalculate taxes whenever inputs change
  useEffect(() => {
    // OLD REGIME CALCULATION
    const oldTaxable = Math.max(0, grossIncome - standardDeduction - deduction80C - otherDeductions)
    let oldTaxAmount = 0
    if (oldTaxable > 500000) {
      if (oldTaxable > 1000000) {
        oldTaxAmount += (oldTaxable - 1000000) * 0.30
        oldTaxAmount += 100000 // 5L to 10L @ 20%
        oldTaxAmount += 12500  // 2.5L to 5L @ 5%
      } else if (oldTaxable > 500000) {
        oldTaxAmount += (oldTaxable - 500000) * 0.20
        oldTaxAmount += 12500
      }
    } else {
      // 87A Rebate makes it 0 if taxable <= 5L
      oldTaxAmount = 0
    }
    // Add 4% Cess
    oldTaxAmount = oldTaxAmount > 0 ? oldTaxAmount * 1.04 : 0
    setOldTax(oldTaxAmount)

    // NEW REGIME CALCULATION (Standard deduction allowed in new regime from FY24)
    const newTaxable = Math.max(0, grossIncome - standardDeduction)
    let newTaxAmount = 0
    if (newTaxable > 700000) { // 87A Rebate up to 7L
      let remaining = newTaxable
      
      if (remaining > 1500000) {
        newTaxAmount += (remaining - 1500000) * 0.30
        remaining = 1500000
      }
      if (remaining > 1200000) {
        newTaxAmount += (remaining - 1200000) * 0.20
        remaining = 1200000
      }
      if (remaining > 900000) {
        newTaxAmount += (remaining - 900000) * 0.15
        remaining = 900000
      }
      if (remaining > 600000) {
        newTaxAmount += (remaining - 600000) * 0.10
        remaining = 600000
      }
      if (remaining > 300000) {
        newTaxAmount += (remaining - 300000) * 0.05
      }
    } else {
      newTaxAmount = 0
    }
    // Add 4% Cess
    newTaxAmount = newTaxAmount > 0 ? newTaxAmount * 1.04 : 0
    setNewTax(newTaxAmount)

  }, [grossIncome, standardDeduction, deduction80C, otherDeductions])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading tax engine...</div>

  const isOldBetter = oldTax < newTax
  const savings = Math.abs(oldTax - newTax)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax Planning & Projection</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Estimate your tax liability based on recorded transactions.
        </p>
      </div>

      {savings > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-4">
          <div className="text-3xl">💡</div>
          <div>
            <h4 className="text-emerald-800 font-semibold text-lg">
              You should choose the {isOldBetter ? "Old Regime" : "New Regime"}!
            </h4>
            <p className="text-emerald-700 text-sm">
              It saves you <span className="font-bold">{formatCurrency(savings, currency)}</span> compared to the other regime.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Inputs */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <h3 className="font-semibold text-lg border-b pb-2">Income & Deductions</h3>
            <p className="text-xs text-muted-foreground">Values are auto-filled from your Transactions but can be manually overridden.</p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Gross Salary / Total Income</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={grossIncome}
                  onChange={(e) => setGrossIncome(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Standard Deduction</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={standardDeduction}
                  onChange={(e) => setStandardDeduction(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section 80C Investments</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={deduction80C}
                  onChange={(e) => setDeduction80C(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm shadow-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Max limit ₹1,50,000 (PF, ELSS, Life Insurance, etc.)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Other Deductions (80D, HRA, LTA)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Projections */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Old Regime Card */}
            <div className={`rounded-xl border p-6 flex flex-col items-center justify-center text-center space-y-2 transition-all ${isOldBetter && oldTax !== newTax ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card'}`}>
              <h4 className="font-semibold text-muted-foreground">Old Tax Regime</h4>
              <div className="text-3xl font-bold">
                {formatCurrency(oldTax, currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Taxable: {formatCurrency(Math.max(0, grossIncome - standardDeduction - deduction80C - otherDeductions), currency)}
              </p>
              {isOldBetter && oldTax !== newTax && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mt-2">
                  Recommended
                </span>
              )}
            </div>

            {/* New Regime Card */}
            <div className={`rounded-xl border p-6 flex flex-col items-center justify-center text-center space-y-2 transition-all ${!isOldBetter && oldTax !== newTax ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card'}`}>
              <h4 className="font-semibold text-muted-foreground">New Tax Regime</h4>
              <div className="text-3xl font-bold">
                {formatCurrency(newTax, currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Taxable: {formatCurrency(Math.max(0, grossIncome - standardDeduction), currency)}
              </p>
              {!isOldBetter && oldTax !== newTax && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mt-2">
                  Recommended
                </span>
              )}
            </div>

          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold border-b pb-2 mb-4">How is this calculated?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">Old Regime:</strong> Allows standard deduction + 80C + 80D + HRA. Rebate 87A applies if taxable income ≤ ₹5L.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">New Regime:</strong> Allows ONLY standard deduction (from FY24 onwards). Rebate 87A applies if taxable income ≤ ₹7L. Tax slabs are significantly wider.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">Cess:</strong> A 4% Health & Education Cess is automatically applied on the calculated tax amount.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
