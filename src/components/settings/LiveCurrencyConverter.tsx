"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/utils"

const currencies = [
  { code: "INR", label: "INR (₹)", symbol: "₹" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "AED", label: "AED (د.إ)", symbol: "د.إ" },
  { code: "SGD", label: "SGD (S$)", symbol: "S$" },
  { code: "CHF", label: "CHF (Fr.)", symbol: "Fr." },
]

export function LiveCurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("INR")
  const [amount, setAmount] = useState<number>(100)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/currency/rates?base=${fromCurrency}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.rates) {
          setRates(data.rates)
          setError("")
        } else {
          setError("Failed to load exchange rates")
        }
      })
      .catch(() => setError("Error loading exchange rates"))
      .finally(() => setLoading(false))
  }, [fromCurrency])

  const conversionRate = rates[toCurrency]
  const convertedAmount = conversionRate !== undefined ? amount * conversionRate : 0

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Live Currency Converter</h2>
          <p className="text-xs text-muted-foreground mt-1">Check real-time conversion rates and calculate exchanges.</p>
        </div>
        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full select-none font-semibold">
          Live Rates
        </span>
      </div>
      <div className="p-6 space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 text-rose-500 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">From Currency</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Enter amount"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">To Currency</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-muted/20 border p-4 flex flex-col justify-center items-center text-center mt-2">
          {loading ? (
            <span className="text-sm text-muted-foreground animate-pulse">Fetching latest rates...</span>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(convertedAmount, toCurrency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                1 {fromCurrency} = {conversionRate?.toFixed(4)} {toCurrency}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
