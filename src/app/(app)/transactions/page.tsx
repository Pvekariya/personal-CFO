"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { createTransactionSchema } from "@/lib/validations/transactions"
import { StatementImporter } from "@/components/shared/StatementImporter"
import { DaybookInsights } from "@/components/shared/DaybookInsights"
import { TopHeader } from "@/components/shared/TopHeader"

type Category = {
  id: string
  name: string
  group: string
  color: string | null
  icon: string | null
}

type Account = {
  id: string
  name: string
  type: string
}

type Asset = {
  id: string
  name: string
  type: string
}

type Liability = {
  id: string
  name: string
  type: string
}

type Transaction = {
  id: string
  type: string
  status: string
  amount: string
  currency: string
  description: string | null
  merchant: string | null
  date: string
  tags: string[]
  account: Account
  category: Category | null
}

type Meta = {
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "INVESTMENT",
  "LOAN_REPAYMENT",
  "LOAN_DISBURSEMENT",
]

const TYPE_COLORS: Record<string, string> = {
  INCOME: "text-emerald-500",
  EXPENSE: "text-foreground",
  TRANSFER: "text-blue-500",
  INVESTMENT: "text-purple-500",
  LOAN_REPAYMENT: "text-orange-500",
  LOAN_DISBURSEMENT: "text-cyan-500",
}



export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showImporter, setShowImporter] = useState(false)
  const [formError, setFormError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Filters
  const [filters, setFilters] = useState({
    type: "",
    accountId: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    search: "",
    page: 1,
  })
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 400)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Form
  const [formData, setFormData] = useState({
    accountId: "",
    categoryId: "",
    type: "EXPENSE",
    amount: "",
    description: "",
    merchant: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    tags: "",
    linkedAssetId: "",
    linkedLiabilityId: "",
    isRecurring: false,
  })

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type) params.set("type", filters.type)
      if (filters.accountId) params.set("accountId", filters.accountId)
      if (filters.categoryId) params.set("categoryId", filters.categoryId)
      if (filters.startDate) params.set("startDate", filters.startDate)
      if (filters.endDate) params.set("endDate", filters.endDate)
      if (debouncedSearch) params.set("search", debouncedSearch)
      params.set("page", filters.page.toString())
      params.set("limit", "20")

      const res = await fetch(`/api/v1/transactions?${params}`)
      const json = await res.json()
      if (json.data) {
        setTransactions(json.data)
        setMeta(json.meta)
      }
    } catch (e) {
      console.error("Failed to fetch transactions:", e)
    } finally {
      setLoading(false)
    }
  }, [
    filters.type, 
    filters.accountId, 
    filters.categoryId, 
    filters.startDate, 
    filters.endDate, 
    filters.page, 
    debouncedSearch
  ])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/accounts")
      const json = await res.json()
      if (json.data) setAccounts(json.data)
    } catch (e) {
      console.error("Failed to fetch accounts:", e)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/categories")
      const json = await res.json()
      if (json.data?.categories) setCategories(json.data.categories)
    } catch (e) {
      console.error("Failed to fetch categories:", e)
    }
  }, [])

  const fetchAssetsAndLiabilities = useCallback(async () => {
    try {
      const [assRes, liabRes] = await Promise.all([
        fetch("/api/v1/investments"),
        fetch("/api/v1/liabilities"),
      ])
      const assJson = await assRes.json()
      const liabJson = await liabRes.json()
      if (assJson.data) setAssets(assJson.data)
      if (liabJson.data) setLiabilities(liabJson.data)
    } catch (e) {
      console.error("Failed to fetch assets/liabilities:", e)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
    fetchCategories()
    fetchAssetsAndLiabilities()
  }, [fetchAccounts, fetchCategories, fetchAssetsAndLiabilities])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  function resetForm() {
    setFormData({
      accountId: accounts[0]?.id || "",
      categoryId: "",
      type: "EXPENSE",
      amount: "",
      description: "",
      merchant: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      tags: "",
      linkedAssetId: "",
      linkedLiabilityId: "",
      isRecurring: false,
    })
    setFormError("")
    setFieldErrors({})
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFieldErrors({})
    setSaving(true)

    try {
      const parsedAmount = parseFloat(formData.amount)
      
      const rawData = {
        accountId: formData.accountId,
        categoryId: formData.categoryId || undefined,
        type: formData.type,
        amount: isNaN(parsedAmount) ? -1 : parsedAmount,
        date: formData.date,
        description: formData.description || undefined,
        merchant: formData.merchant || undefined,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        isRecurring: formData.isRecurring,
      }

      // Run robust Zod validation
      const validation = createTransactionSchema.safeParse(rawData)
      if (!validation.success) {
        const errors: Record<string, string> = {}
        validation.error.issues.forEach(err => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message
        })
        setFieldErrors(errors)
        setFormError("Please fix the validation errors below.")
        setSaving(false)
        return
      }

      const reqBody: any = {
        ...validation.data,
        metadata: {},
      }
      
      if (formData.type === "INVESTMENT" && formData.linkedAssetId) {
        reqBody.metadata.linkedAssetId = formData.linkedAssetId
      }
      if (formData.type === "LOAN_REPAYMENT" && formData.linkedLiabilityId) {
        reqBody.metadata.linkedLiabilityId = formData.linkedLiabilityId
      }

      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      })

      const json = await res.json()

      if (!res.ok) {
        setFormError(json.error || "Failed to create transaction")
        setSaving(false)
        return
      }

      resetForm()
      setShowForm(false)
      fetchTransactions()
    } catch {
      setFormError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction? This will reverse the balance change."))
      return

    try {
      await fetch(`/api/v1/transactions/${id}`, { method: "DELETE" })
      fetchTransactions()
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  // Filter categories based on transaction type
  const filteredCategories = categories.filter((c) => {
    if (formData.type === "INCOME") return c.group === "INCOME"
    if (formData.type === "INVESTMENT") return c.group === "INVESTMENT"
    return c.group !== "INCOME"
  })

  return (
    <div className="space-y-6">
      <TopHeader 
        title="Transactions" 
        subtitle="Track your income, expenses, and transfers"
        icon="https://img.icons8.com/ios/50/activity-history.png"
      >
        <Button
          variant="outline"
          className="flex gap-2"
          onClick={() => setShowImporter(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          Upload Statement
        </Button>
        <Button
          onClick={() => {
            if (!showForm) resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? "Cancel" : "+ Add Transaction"}
        </Button>
      </TopHeader>

      {/* Daybook Insights Panel (Budgets & Recurring Engine) */}
      {!showForm && <DaybookInsights />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search transactions..."
          value={filters.search}
          onChange={(e) =>
            setFilters({ ...filters, search: e.target.value, page: 1 })
          }
          className="flex h-9 w-64 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <select
          value={filters.type}
          onChange={(e) =>
            setFilters({ ...filters, type: e.target.value, page: 1 })
          }
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Types</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={filters.accountId}
          onChange={(e) =>
            setFilters({ ...filters, accountId: e.target.value, page: 1 })
          }
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={filters.categoryId}
          onChange={(e) =>
            setFilters({ ...filters, categoryId: e.target.value, page: 1 })
          }
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
          />
        </div>
      </div>

      {/* Zero-Friction Entry Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="premium-card p-6 space-y-4 animate-in slide-in-from-top-4 duration-300"
        >
          {formError && (
            <div className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive mb-3">
              {formError}
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              You need to <a href="/accounts" className="underline font-medium text-primary">add an account</a> before recording transactions.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3 items-end">
                {/* AMOUNT & TYPE */}
                <div className="flex bg-background rounded-xl border border-input/60 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all w-full md:w-1/4 h-12">
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, categoryId: "" })}
                    className="h-full bg-transparent border-r border-border pl-3 pr-8 text-sm font-bold text-muted-foreground outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <option value="EXPENSE">EXP</option>
                    <option value="INCOME">INC</option>
                    <option value="TRANSFER">TRF</option>
                    <option value="INVESTMENT">INV</option>
                    <option value="LOAN_REPAYMENT">REP</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    className={`h-full w-full bg-transparent px-3 text-lg font-extrabold outline-none ${formData.type === 'INCOME' ? 'text-emerald-500' : 'text-foreground'}`}
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="w-full md:w-2/5">
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What was this for? (e.g. Swiggy lunch)"
                    className="flex h-12 w-full rounded-xl border border-input/60 bg-background px-4 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:bg-background/80"
                  />
                </div>

                {/* ACCOUNT */}
                <div className="w-full md:w-1/5">
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    required
                    className="flex h-12 w-full rounded-xl border border-input/60 bg-background px-3 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                  >
                    <option value="">Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* SUBMIT */}
                <div className="w-full md:w-auto flex gap-2">
                  <Button type="submit" disabled={saving} className="h-12 px-6 rounded-xl font-bold shadow-md hover:-translate-y-0.5 transition-all w-full md:w-auto">
                    {saving ? "..." : "Save"}
                  </Button>
                </div>
              </div>

              {/* SECONDARY ROW (Category, Merchant, Linkages) */}
              <div className="flex flex-col md:flex-row gap-3">
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="flex h-9 w-full md:w-48 rounded-lg border border-input/40 bg-background/50 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                >
                  <option value="">Uncategorized</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="flex h-9 w-full md:w-40 rounded-lg border border-input/40 bg-background/50 px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                />

                {(formData.type === "INVESTMENT" || formData.type === "LOAN_REPAYMENT") && (
                  <select
                    value={formData.type === "INVESTMENT" ? formData.linkedAssetId : formData.linkedLiabilityId}
                    onChange={(e) => {
                      if (formData.type === "INVESTMENT") setFormData({ ...formData, linkedAssetId: e.target.value })
                      else setFormData({ ...formData, linkedLiabilityId: e.target.value })
                    }}
                    className={`flex h-9 w-full md:w-64 rounded-lg border px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 ${formData.type === 'INVESTMENT' ? 'border-purple-200 bg-purple-50/10 focus-visible:ring-purple-500' : 'border-orange-200 bg-orange-50/10 focus-visible:ring-orange-500'}`}
                  >
                    <option value="">Do not link</option>
                    {formData.type === "INVESTMENT" 
                      ? assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)
                      : liabilities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)
                    }
                  </select>
                )}
              </div>

              {/* IS RECURRING TOGGLE */}
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 rounded border-input/60 accent-primary"
                />
                <label htmlFor="isRecurring" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                  Mark as recurring (subscription/bill/SIP)
                </label>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Transaction List (Daybook Format) */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 bg-card/30 rounded-3xl border border-border/50 border-dashed backdrop-blur-sm">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src="https://img.icons8.com/ios/50/receipt.png" alt="No transactions" className="w-8 h-8 dark:invert opacity-70" />
          </div>
          <p className="text-xl font-semibold">No transactions found</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Your daybook is empty for this period. Record a transaction to start tracking your cash flow.
          </p>
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {Object.entries(
            transactions.reduce((acc, txn) => {
              const dateStr = new Date(txn.date).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              if (!acc[dateStr]) acc[dateStr] = []
              acc[dateStr].push(txn)
              return acc
            }, {} as Record<string, Transaction[]>)
          ).map(([dateStr, dailyTxns]) => {
            const dailyTotal = dailyTxns.reduce((sum, t) => {
              const amt = Number(t.amount)
              return t.type === "INCOME" || t.type === "LOAN_DISBURSEMENT" ? sum + amt : sum - amt
            }, 0)

            return (
              <div key={dateStr} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-3 pl-2">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{dateStr}</h3>
                  <span className={`text-sm font-bold ${dailyTotal >= 0 ? "text-emerald-500" : "text-foreground"}`}>
                    {dailyTotal > 0 ? "+" : ""}{formatCurrency(dailyTotal)}
                  </span>
                </div>
                
                <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm overflow-hidden divide-y divide-border/30">
                  {dailyTxns.map((txn) => (
                    <div
                      key={txn.id}
                      className="group flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner border border-border/40">
                          {txn.category?.icon || "💸"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-base text-foreground/90 truncate">
                              {txn.description || txn.merchant || txn.category?.name || "Untitled"}
                            </p>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${TYPE_COLORS[txn.type] || ""} bg-background border border-border/50`}
                            >
                              {txn.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <span>{txn.account.name}</span>
                            {txn.category && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{txn.category.name}</span>
                              </>
                            )}
                            {txn.merchant && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{txn.merchant}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <p
                          className={`font-extrabold text-lg tracking-tight ${
                            txn.type === "INCOME" || txn.type === "LOAN_DISBURSEMENT"
                              ? "text-emerald-500"
                              : "text-foreground/90"
                          }`}
                        >
                          {txn.type === "INCOME" || txn.type === "LOAN_DISBURSEMENT"
                            ? "+"
                            : "−"}
                          {formatCurrency(txn.amount)}
                        </p>
                        <button
                          onClick={() => handleDelete(txn.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete Transaction"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}


          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={filters.page === meta.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {showImporter && (
        <StatementImporter
          accounts={accounts}
          onClose={() => setShowImporter(false)}
          onSuccess={() => {
            setShowImporter(false)
            fetchTransactions()
          }}
        />
      )}
    </div>
  )
}
