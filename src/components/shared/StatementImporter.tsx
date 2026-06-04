"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

type Account = {
  id: string
  name: string
  currency?: string
}

type Props = {
  accounts: Account[]
  onSuccess: () => void
  onClose: () => void
}

type ParsedRow = {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
}

export function StatementImporter({ accounts, onSuccess, onClose }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  
  // Column Mapping
  const [headers, setHeaders] = useState<string[]>([])
  const [dateCol, setDateCol] = useState("")
  const [descCol, setDescCol] = useState("")
  const [amountCol, setAmountCol] = useState("")
  const [typeCol, setTypeCol] = useState("") // Optional, if amount isn't signed
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError("")
      // Read headers immediately
      Papa.parse(selectedFile, {
        header: true,
        preview: 1,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields)
            
            // Auto-guess columns
            const f = results.meta.fields.map(f => f.toLowerCase())
            setDateCol(results.meta.fields[f.findIndex(x => x.includes('date') || x.includes('time'))] || "")
            setDescCol(results.meta.fields[f.findIndex(x => x.includes('desc') || x.includes('narration') || x.includes('particular'))] || "")
            setAmountCol(results.meta.fields[f.findIndex(x => x.includes('amount') || x.includes('value'))] || "")
          }
        }
      })
    }
  }

  const handleParse = () => {
    if (!file || !dateCol || !descCol || !amountCol) {
      setError("Please select a file and map all required columns.")
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedRow[] = []
        for (const row of results.data as any[]) {
          const rawDate = row[dateCol]
          const rawDesc = row[descCol]
          let rawAmount = row[amountCol]
          let rawType = typeCol ? row[typeCol] : ""

          if (!rawDate || !rawAmount) continue

          // Clean amount (remove commas, currency symbols)
          rawAmount = String(rawAmount).replace(/[^0-9.-]+/g, "")
          let amount = parseFloat(rawAmount)
          if (isNaN(amount)) continue

          // Determine Type
          let type: "INCOME" | "EXPENSE" = amount >= 0 ? "INCOME" : "EXPENSE"
          
          if (typeCol && rawType) {
             const t = String(rawType).toLowerCase()
             if (t.includes("cr") || t.includes("deposit") || t.includes("credit")) {
                 type = "INCOME"
                 amount = Math.abs(amount)
             } else if (t.includes("dr") || t.includes("withdrawal") || t.includes("debit")) {
                 type = "EXPENSE"
                 amount = Math.abs(amount)
             }
          } else {
             // If no type column, rely on sign of amount
             amount = Math.abs(amount)
          }

          // Format Date (Assume DD/MM/YYYY or YYYY-MM-DD)
          // Simple standardizer:
          let dateStr = new Date().toISOString()
          try {
             // Try to parse DD/MM/YYYY or DD-MM-YYYY
             if (/^\d{2}[/-]\d{2}[/-]\d{4}/.test(rawDate)) {
                 const [d, m, y] = rawDate.split(/[/-]/)
                 dateStr = new Date(`${y}-${m}-${d}`).toISOString()
             } else {
                 dateStr = new Date(rawDate).toISOString()
             }
          } catch(e) {}

          rows.push({
            date: dateStr,
            description: String(rawDesc || "Imported Transaction"),
            amount,
            type
          })
        }
        setParsedData(rows)
      }
    })
  }

  const handleImport = async () => {
    if (!selectedAccountId) {
      setError("Please select an account to import to.")
      return
    }

    setLoading(true)
    setError("")
    setProgress({ current: 0, total: parsedData.length })

    let successCount = 0

    // Import sequentially to avoid rate limits/db locks
    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i]
      try {
        await fetch("/api/v1/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            type: row.type,
            amount: row.amount,
            date: row.date.split("T")[0],
            description: row.description,
            // categoryId is null, our Smart Categorizer will handle it!
          }),
        })
        successCount++
      } catch (e) {
        console.error("Failed to import row:", row, e)
      }
      setProgress({ current: i + 1, total: parsedData.length })
    }

    setLoading(false)
    if (successCount > 0) {
      onSuccess()
    } else {
      setError("Failed to import transactions.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Import Bank Statement</h2>
            <p className="text-sm text-muted-foreground mt-1">Upload a CSV file from your bank.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          {parsedData.length === 0 ? (
            <>
              {/* Step 1: File & Account */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Select Target Account</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input/60 bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="">-- Choose Account --</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">Upload CSV Statement</label>
                  <div 
                    className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center hover:bg-primary/5 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect}
                    />
                    <img src="https://img.icons8.com/ios/50/upload--v1.png" alt="Upload" className="w-10 h-10 mx-auto dark:invert opacity-60 mb-3" />
                    <p className="font-semibold">{file ? file.name : "Click to select CSV file"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Make sure it has header columns.</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Mapping (Only visible if headers are loaded) */}
              {headers.length > 0 && (
                <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-4 animate-in slide-in-from-bottom-4">
                  <h3 className="font-bold text-sm">Map Columns</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Date Column *</label>
                      <select value={dateCol} onChange={e => setDateCol(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs">
                        <option value="">Select...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Description Column *</label>
                      <select value={descCol} onChange={e => setDescCol(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs">
                        <option value="">Select...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Amount Column *</label>
                      <select value={amountCol} onChange={e => setAmountCol(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs">
                        <option value="">Select...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Type (Dr/Cr) Column (Optional)</label>
                      <select value={typeCol} onChange={e => setTypeCol(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs">
                        <option value="">(None - use amount sign)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <Button onClick={handleParse} className="w-full">Preview Transactions</Button>
                </div>
              )}
            </>
          ) : (
            /* Step 3: Preview & Confirm */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Preview ({parsedData.length} Transactions)</h3>
                <Button variant="ghost" size="sm" onClick={() => setParsedData([])}>Back</Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                {parsedData.slice(0, 10).map((row, i) => (
                  <div key={i} className="p-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold">{row.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(row.date).toLocaleDateString()}</p>
                    </div>
                    <p className={`font-bold ${row.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}>
                      {row.type === 'INCOME' ? '+' : '-'}{formatCurrency(row.amount)}
                    </p>
                  </div>
                ))}
                {parsedData.length > 10 && (
                  <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20">
                    + {parsedData.length - 10} more transactions...
                  </div>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Importing...</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(progress.current/progress.total)*100}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center animate-pulse">Smart Categorizer is analyzing transactions...</p>
                </div>
              ) : (
                <Button onClick={handleImport} className="w-full h-12 text-lg font-bold shadow-lg">
                  Confirm & Import All
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
