"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type ParsedEntry = {
  date: string
  description: string
  amount: number
  type: "EXPENSE" | "INCOME"
  categoryName: string
}

interface StatementIngestionModalProps {
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  onComplete?: () => void
}

export function StatementIngestionModal({
  accounts,
  categories,
  onComplete,
}: StatementIngestionModalProps) {
  const [open, setOpen] = useState(false)
  const [rawText, setRawText] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "")
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([])
  const [importing, setImporting] = useState(false)

  function inferCategory(desc: string): string {
    const lower = desc.toLowerCase()
    if (lower.includes("swiggy") || lower.includes("zomato") || lower.includes("restaurant") || lower.includes("cafe") || lower.includes("food")) return "Dining"
    if (lower.includes("uber") || lower.includes("ola") || lower.includes("fuel") || lower.includes("petrol") || lower.includes("cab")) return "Transportation"
    if (lower.includes("amazon") || lower.includes("flipkart") || lower.includes("myntra") || lower.includes("store")) return "Shopping"
    if (lower.includes("salary") || lower.includes("credit") || lower.includes("payout") || lower.includes("payroll")) return "Salary"
    if (lower.includes("bescom") || lower.includes("airtel") || lower.includes("jio") || lower.includes("electricity") || lower.includes("wifi")) return "Utilities"
    if (lower.includes("zerodha") || lower.includes("groww") || lower.includes("sip") || lower.includes("mutual fund") || lower.includes("elss")) return "Investments"
    return "General"
  }

  function handleParse() {
    if (!rawText.trim()) return

    const lines = rawText.split("\n").filter((l) => l.trim().length > 0)
    const entries: ParsedEntry[] = []

    for (const line of lines) {
      // Look for currency amounts (e.g. Rs 1,200 or ₹450 or 1500.00)
      const amountMatch = line.match(/(?:rs\.?|₹|\$)?\s*([\d,]+(?:\.\d{2})?)/i)
      if (!amountMatch) continue

      const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ""))
      if (isNaN(rawAmount) || rawAmount <= 0) continue

      const isIncome = /credit|credited|salary|refund|received|inward/i.test(line)
      const dateMatch = line.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/)
      const dateStr = dateMatch ? dateMatch[0] : new Date().toISOString().split("T")[0]

      // Clean description
      const desc = line.replace(/(?:rs\.?|₹|\$)?\s*[\d,]+(?:\.\d{2})?/gi, "").trim().slice(0, 60) || "Bank Statement Entry"

      entries.push({
        date: dateStr,
        description: desc,
        amount: rawAmount,
        type: isIncome ? "INCOME" : "EXPENSE",
        categoryName: inferCategory(desc),
      })
    }

    setParsedEntries(entries)
  }

  async function handleBatchImport() {
    if (parsedEntries.length === 0 || !selectedAccountId) return

    setImporting(true)
    try {
      for (const entry of parsedEntries) {
        // Find matching category ID or fallback to first
        const categoryObj = categories.find(
          (c) => c.name.toLowerCase() === entry.categoryName.toLowerCase()
        )
        const categoryId = categoryObj?.id || categories[0]?.id

        await fetch("/api/v1/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            categoryId,
            amount: entry.amount,
            type: entry.type,
            description: entry.description,
            date: entry.date,
          }),
        })
      }

      setOpen(false)
      setRawText("")
      setParsedEntries([])
      if (onComplete) onComplete()
    } catch (err) {
      console.error("Failed batch import:", err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <span>📄 Auto-Import Statement</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="statement-modal-title"
        >
          <div
            className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h2 id="statement-modal-title" className="text-xl font-bold tracking-tight text-foreground">
                  Automated Bank Statement Ingestion
                </h2>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Paste bank SMS alerts or statement lines to auto-parse & classify transactions
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Account Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Destination Bank Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Paste Bank Statement Text or SMS Alerts
              </label>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Example:\n2026-07-20 Paid ₹1,200 at Swiggy via HDFC Debit\n2026-07-19 Credited ₹85,000 Salary from Infosys\n2026-07-18 Spent ₹450 on Uber ride`}
                className="w-full p-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none"
              />
              <Button onClick={handleParse} variant="secondary" className="w-full mt-2" disabled={!rawText.trim()}>
                Auto-Parse & Categorize Entries
              </Button>
            </div>

            {/* Parsed Preview Table */}
            {parsedEntries.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Parsed Transactions ({parsedEntries.length})</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Ready for Batch Import
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto border border-border/60 rounded-2xl p-2 bg-muted/20 text-xs">
                  {parsedEntries.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/40">
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">{item.description}</p>
                        <p className="text-[10px] text-muted-foreground">{item.date} • {item.categoryName}</p>
                      </div>
                      <span className={`font-mono font-bold ${item.type === "INCOME" ? "text-emerald-600" : "text-rose-500"}`}>
                        {item.type === "INCOME" ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>

                <Button onClick={handleBatchImport} disabled={importing} className="w-full">
                  {importing ? "Importing Transactions..." : `Confirm & Save ${parsedEntries.length} Transactions`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
