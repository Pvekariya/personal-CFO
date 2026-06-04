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
  const [isPdf, setIsPdf] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [aiParsing, setAiParsing] = useState(false)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  
  // Column Mapping (CSV Only)
  const [headers, setHeaders] = useState<string[]>([])
  const [dateCol, setDateCol] = useState("")
  const [descCol, setDescCol] = useState("")
  const [amountCol, setAmountCol] = useState("")
  const [typeCol, setTypeCol] = useState("") 
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError("")
      setParsedData([])
      setHeaders([])

      const isPdfFile = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")
      setIsPdf(isPdfFile)

      if (!isPdfFile) {
        // Read headers for CSV immediately
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
  }

  const handleParse = async () => {
    if (!file) {
      setError("Please select a file.")
      return
    }

    if (isPdf) {
      setAiParsing(true)
      setError("")
      try {
        const formData = new FormData()
        formData.append("file", file)
        
        const res = await fetch("/api/v1/transactions/parse-pdf", {
          method: "POST",
          body: formData
        })
        const json = await res.json()
        
        if (!res.ok) {
          throw new Error(json.error || "Failed to parse PDF")
        }
        
        setParsedData(json.data)
      } catch (err: any) {
        setError(err.message || "An error occurred parsing the PDF.")
      } finally {
        setAiParsing(false)
      }
      return
    }

    // CSV Parse
    if (!dateCol || !descCol || !amountCol) {
      setError("Please map all required columns.")
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

          rawAmount = String(rawAmount).replace(/[^0-9.-]+/g, "")
          let amount = parseFloat(rawAmount)
          if (isNaN(amount)) continue

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
             amount = Math.abs(amount)
          }

          rows.push({
            date: new Date(rawDate).toISOString(), // ensure standard format
            description: rawDesc,
            amount,
            type
          })
        }
        setParsedData(rows)
      },
      error: (e) => {
        setError(e.message)
      }
    })
  }

  const handleImport = async () => {
    if (!selectedAccountId) {
      setError("Please select a target account.")
      return
    }

    setLoading(true)
    setError("")
    let successCount = 0

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
            <p className="text-sm text-muted-foreground mt-1">Upload a CSV or PDF file from your bank.</p>
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
                  <label className="text-sm font-bold">Upload CSV or PDF Statement</label>
                  <div 
                    className={`border-2 border-dashed ${isPdf ? 'border-purple-500/50 bg-purple-500/5' : 'border-primary/30 hover:bg-primary/5'} rounded-2xl p-8 text-center transition-colors cursor-pointer`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      accept=".csv,.pdf" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect}
                    />
                    <img src="https://img.icons8.com/ios/50/upload--v1.png" alt="Upload" className="w-10 h-10 mx-auto dark:invert opacity-60 mb-3" />
                    <p className="font-semibold">{file ? file.name : "Click to select CSV or PDF file"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Make sure it has table data.</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Mapping (CSV Only) */}
              {headers.length > 0 && !isPdf && (
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
                      <label className="text-xs font-semibold text-muted-foreground">Type/CR-DR Column (Optional)</label>
                      <select value={typeCol} onChange={e => setTypeCol(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs">
                        <option value="">None (Use Signed Amount)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
             <div className="space-y-4 animate-in fade-in">
               <div className="flex items-center justify-between">
                 <h3 className="font-bold">Preview Transactions ({parsedData.length})</h3>
                 <Button variant="ghost" size="sm" onClick={() => setParsedData([])}>Reset</Button>
               </div>
               <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                     <tr>
                       <th className="px-4 py-3">Date</th>
                       <th className="px-4 py-3">Description</th>
                       <th className="px-4 py-3 text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody>
                     {parsedData.slice(0, 50).map((row, i) => (
                       <tr key={i} className="border-b border-border/50 hover:bg-secondary/20">
                         <td className="px-4 py-3 whitespace-nowrap">{row.date.split("T")[0]}</td>
                         <td className="px-4 py-3 truncate max-w-[200px]">{row.description}</td>
                         <td className={`px-4 py-3 text-right font-medium ${row.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}>
                           {row.type === 'INCOME' ? '+' : '-'}{formatCurrency(row.amount)}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {parsedData.length > 50 && (
                 <p className="text-xs text-muted-foreground text-center">Showing first 50 rows.</p>
               )}
             </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex items-center justify-end gap-3 bg-secondary/10 rounded-b-3xl">
          <Button variant="ghost" onClick={onClose} disabled={loading || aiParsing}>Cancel</Button>
          
          {parsedData.length === 0 ? (
            <Button 
              onClick={handleParse} 
              disabled={!file || (!isPdf && (!dateCol || !descCol || !amountCol)) || aiParsing}
              className={isPdf ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
            >
              {aiParsing ? "AI Parsing..." : isPdf ? "✨ Parse with AI" : "Review Data"}
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={loading || !selectedAccountId}>
              {loading ? `Importing (${progress.current}/${progress.total})...` : "Import Transactions"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
