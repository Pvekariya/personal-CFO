"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import type { QuickCaptureDraft } from "@/lib/quick-capture"

type Account = {
  id: string
  name: string
  type: string
}

type QuickCaptureResponse = {
  data?: {
    transaction: {
      id: string
      amount: string
      type: string
      description: string | null
      date: string
      account?: { name: string }
    }
    draft: QuickCaptureDraft
    confidence: number
    needsReview: boolean
  }
  error?: string
  details?: {
    draft?: QuickCaptureDraft
  }
}

const SUGGESTIONS = [
  { text: "Paid ₹450 for Uber from HDFC yesterday", label: "Uber ride" },
  { text: "Received ₹1.2L Salary in HDFC", label: "Salary credit" },
  { text: "Split ₹1800 for Dinner with Raj and Pooja", label: "Split Dinner" },
  { text: "Paid ₹2000 for Electricity bill", label: "Utility bill" },
  { text: "Paid ₹120 cash for auto ride", label: "Cash auto" },
]

export function QuickCapture() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "CASH">("ONLINE")
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [preview, setPreview] = useState<QuickCaptureDraft | null>(null)
  
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const loadedRef = useRef(false)
  const isDragActive = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Floating button draggable position
  const [position, setPosition] = useState({ x: 24, y: 500 })
  const [isDragging, setIsDragging] = useState(false)

  // Position initialized to bottom-left of screen dynamically
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({ x: 24, y: window.innerHeight - 96 })
    }
  }, [])

  const defaultAccountId = useMemo(() => {
    if (paymentMode === "CASH") {
      // Find a cash/wallet account
      const cashAcc = accounts.find(
        (a) => a.type === "WALLET" || a.name.toLowerCase().includes("cash")
      )
      if (cashAcc) return cashAcc.id
    }
    return accountId || accounts[0]?.id || ""
  }, [accountId, accounts, paymentMode])

  // Keyboard shortcut listeners (both Cmd+Shift+A and standard Escape)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "a"
      if (isShortcut) {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === "Escape") {
        closeCapture()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-load accounts
  useEffect(() => {
    if (!open || loadedRef.current) return

    let cancelled = false
    setLoadingAccounts(true)
    fetch("/api/v1/accounts?limit=100")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.data) {
          setAccounts(json.data)
          const firstAccountId = json.data[0]?.id || ""
          setAccountId((current) => current || firstAccountId)
        }
      })
      .catch((fetchError) => console.error("Failed to load accounts", fetchError))
      .finally(() => {
        if (!cancelled) {
          setLoadingAccounts(false)
          loadedRef.current = true
        }
      })

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Auto-detect cash vs online when user types
  useEffect(() => {
    const lower = text.toLowerCase()
    if (lower.includes("cash") || lower.includes("hand-to-hand") || lower.includes("in hand")) {
      setPaymentMode("CASH")
    } else if (lower.includes("hdfc") || lower.includes("sbi") || lower.includes("icici") || lower.includes("online") || lower.includes("card")) {
      setPaymentMode("ONLINE")
    }
  }, [text])

  // Drag handlers for the floating button
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    isDragActive.current = false
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      let newX = e.clientX - dragStart.current.x
      let newY = e.clientY - dragStart.current.y
      
      // Screen boundary check
      const padding = 16
      const winWidth = window.innerWidth
      const winHeight = window.innerHeight
      const btnWidth = buttonRef.current?.offsetWidth || 130
      const btnHeight = buttonRef.current?.offsetHeight || 48
      
      newX = Math.max(padding, Math.min(winWidth - btnWidth - padding, newX))
      newY = Math.max(padding, Math.min(winHeight - btnHeight - padding, newY))
      
      const dist = Math.sqrt(
        Math.pow(e.clientX - (dragStart.current.x + position.x), 2) +
        Math.pow(e.clientY - (dragStart.current.y + position.y), 2)
      )
      if (dist > 6) {
        isDragActive.current = true
      }
      
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, position])

  function closeCapture() {
    setOpen(false)
    setError("")
    setSuccess("")
    setPreview(null)
    setSubmitting(false)
  }

  // Live client-side preview parsing
  const liveParsed = useMemo(() => {
    if (!text.trim()) return null
    
    const amountMatch = text.match(/(?:₹|Rs\.?|INR)\s*(\d+(?:\.\d+)?)(?:\s*(?:k|L|Lakh))?/i)
    let parsedAmount = 0
    if (amountMatch) {
      let base = parseFloat(amountMatch[1])
      if (text.toLowerCase().includes("k") && text.indexOf(amountMatch[1]) < text.toLowerCase().indexOf("k") + 3) {
        base *= 1000
      } else if (text.toLowerCase().includes("l") && text.indexOf(amountMatch[1]) < text.toLowerCase().indexOf("l") + 3) {
        base *= 100000
      }
      parsedAmount = base
    }

    const isIncome = /received|salary|refund|earned|credit/i.test(text)
    const isTransfer = /transfer|move|sent to self/i.test(text)
    const isExpense = !isIncome && !isTransfer

    const isSplit = /split/i.test(text)
    const withMatch = text.match(/with\s+([A-Za-z\s,]+)(?:and|yesterday|today|on|$)/i)
    let people: string[] = []
    if (withMatch) {
      people = withMatch[1]
        .split(/(?:,|\band\b)/)
        .map(p => p.trim())
        .filter(p => p.length > 0 && !/yesterday|today/i.test(p))
    }

    return {
      amount: parsedAmount,
      type: isTransfer ? "TRANSFER" : isIncome ? "INCOME" : "EXPENSE",
      isSplit,
      people,
      perPerson: isSplit && parsedAmount > 0 ? Math.round(parsedAmount / (people.length + 1)) : 0
    }
  }, [text])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim() || submitting) return

    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      let targetAccountId = defaultAccountId

      // If user selected cash but no cash account exists, auto-create one
      if (paymentMode === "CASH" && !targetAccountId) {
        const createRes = await fetch("/api/v1/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Cash Wallet",
            type: "WALLET",
            balance: 0,
            currency: "INR"
          })
        })
        const createJson = await createRes.json()
        if (createJson.data?.id) {
          targetAccountId = createJson.data.id
          // Append to local accounts
          setAccounts(prev => [...prev, createJson.data])
        }
      }

      const response = await fetch("/api/v1/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          accountId: targetAccountId || undefined,
          source: "shortcut",
        }),
      })

      const json = (await response.json()) as QuickCaptureResponse

      if (!response.ok) {
        const draft = json.details?.draft
        setPreview(draft ?? null)
        setError(json.error || "Quick capture failed.")
        return
      }

      if (json.data?.draft) {
        setPreview(json.data.draft)
      }
      setSuccess(
        `Saved ${json.data?.transaction.description || "transaction"}${json.data?.transaction.account?.name ? ` to ${json.data.transaction.account.name}` : ""}.`
      )
      setText("")
      window.dispatchEvent(new Event("finance-data-updated"))
      setTimeout(() => {
        setOpen(false)
      }, 1200)
    } catch (submitError) {
      console.error("Quick capture submission failed", submitError)
      setError("Could not save this entry.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!isDragActive.current) {
            setOpen(true)
          }
        }}
        style={
          typeof window !== "undefined" && window.innerWidth < 768
            ? { position: "fixed", bottom: "76px", left: "16px" }
            : {
                position: "fixed",
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? "grabbing" : "grab",
              }
        }
        className={cn(
          "z-40 inline-flex items-center justify-center rounded-full border border-border/80 bg-background/90 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl active:scale-95 select-none",
          "w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-3 gap-2",
          isDragging && "scale-105 border-primary/50 shadow-primary/10"
        )}
        aria-label="Open quick capture"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-base pointer-events-none">+</span>
        <span className="hidden md:inline pointer-events-none">Quick Add</span>
        <span className="hidden md:inline text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono pointer-events-none">⌘⇧A</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in" onClick={closeCapture} role="dialog" aria-modal="true" aria-labelledby="quick-capture-title">
          <Card className="w-full max-w-xl shadow-2xl border-border/80 bg-card/95 backdrop-blur-xl rounded-3xl overflow-hidden transform scale-100 transition-all duration-300" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle id="quick-capture-title" className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                    Smart Quick Add
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/80">
                    Type naturally or click a suggestion below. We'll handle categorization, cash vs online checks & splits instantly.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={closeCapture}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground text-lg transition-colors w-7 h-7 flex items-center justify-center"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder='Type anything... "Paid ₹120 cash for auto" or "Split ₹1500 dinner with Raj"'
                    rows={3}
                    className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none hover:bg-background/80"
                  />
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setText(s.text)
                        inputRef.current?.focus()
                      }}
                      className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all border border-border/40"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Seamless Payment Mode Selector */}
                <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/50">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("ONLINE")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                      paymentMode === "ONLINE" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Bank / UPI / Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("CASH")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                      paymentMode === "CASH" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Cash Wallet
                  </button>
                </div>

                {/* Live Client-Side Parsing Indicator */}
                {liveParsed && liveParsed.amount > 0 && (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-xs">
                          Detected {liveParsed.type.toLowerCase()}
                        </p>
                        {liveParsed.isSplit && (
                          <p className="text-[10px] text-muted-foreground">
                            Splitting with {liveParsed.people.length > 0 ? liveParsed.people.join(", ") : "friends"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm font-mono">
                        {formatCurrency(liveParsed.amount, "INR")}
                      </p>
                      {liveParsed.isSplit && liveParsed.perPerson > 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatCurrency(liveParsed.perPerson, "INR")} / person
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground pl-1">Payment Method / Account</span>
                    <select
                      value={accountId || defaultAccountId}
                      onChange={(event) => setAccountId(event.target.value)}
                      className="h-10 w-full rounded-xl border border-border/80 bg-background/50 px-3 text-xs shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:bg-background/80 cursor-pointer"
                    >
                      {loadingAccounts ? (
                        <option>Loading methods...</option>
                      ) : (
                        <>
                          <option value="">Auto-Detect Account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>

                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">Keyboard Shortcut</p>
                      <p className="text-[10px] text-muted-foreground">Press Shift + ⌘ + A from anywhere</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-background border border-border text-[9px] font-mono font-bold text-muted-foreground shadow-sm">⌘⇧A</span>
                  </div>
                </div>

                {error && <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">{error}</div>}
                {success && <div className="rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">{success}</div>}

                {preview && !success && (
                  <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-xs space-y-2 animate-in fade-in duration-300">
                    <p className="font-semibold text-foreground">Final Extracted Receipt</p>
                    <div className="grid gap-2 text-muted-foreground sm:grid-cols-2 text-[11px] font-mono">
                      <span>Type: {preview.type.replace(/_/g, " ")}</span>
                      <span>Amount: {formatCurrency(preview.amount, preview.currency)}</span>
                      <span>Date: {new Date(preview.date).toLocaleDateString()}</span>
                      <span>Confidence: {Math.round(preview.confidence * 100)}%</span>
                    </div>

                    {preview.splitInfo?.isSplit && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary space-y-1">
                        <div className="font-semibold flex items-center justify-between">
                          <span>Split Share ({preview.splitInfo.peopleCount} people)</span>
                          <span className="font-mono">₹{preview.splitInfo.perPersonShare} / person</span>
                        </div>
                        {preview.splitInfo.participants.length > 0 && (
                          <p className="text-[10px] opacity-90">
                            Split with: {preview.splitInfo.participants.join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-foreground text-[11px] font-medium pt-1 italic">"{preview.description}"</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between gap-3 bg-muted/20 border-t border-border/50 px-6 py-4">
                <p className="text-[10px] text-muted-foreground font-medium">
                  We categorize and match accounts on the fly
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={closeCapture} size="sm" className="rounded-lg">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !text.trim()} size="sm" className="rounded-lg px-5 shadow-lg shadow-primary/20">
                    {submitting ? "Saving..." : "Save Entry"}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
