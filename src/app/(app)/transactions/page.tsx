"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { createTransactionSchema } from "@/lib/validations/transactions"

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
  INCOME: "text-green-600",
  EXPENSE: "text-red-600",
  TRANSFER: "text-blue-600",
  INVESTMENT: "text-purple-600",
  LOAN_REPAYMENT: "text-orange-600",
  LOAN_DISBURSEMENT: "text-cyan-600",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your income, expenses, and transfers
          </p>
        </div>
        <Button
          onClick={() => {
            if (!showForm) resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? "Cancel" : "+ Add Transaction"}
        </Button>
      </div>

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

      {/* Add Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500"
        >
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">Record Transaction</h3>

          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              You need to{" "}
              <a href="/accounts" className="underline font-medium">
                add an account
              </a>{" "}
              before recording transactions.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value, categoryId: "" })
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/90 pl-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="e.g. 500"
                    required
                    className={`flex h-12 w-full rounded-2xl border ${fieldErrors.amount ? 'border-destructive' : 'border-input/60'} bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
                  />
                  {fieldErrors.amount && <p className="text-xs text-destructive pl-1">{fieldErrors.amount}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/90 pl-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                    className={`flex h-12 w-full rounded-2xl border ${fieldErrors.date ? 'border-destructive' : 'border-input/60'} bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
                  />
                  {fieldErrors.date && <p className="text-xs text-destructive pl-1">{fieldErrors.date}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground/90 pl-1">Account *</label>
                  <select
                    value={formData.accountId}
                    onChange={(e) =>
                      setFormData({ ...formData, accountId: e.target.value })
                    }
                    required
                    className={`flex h-12 w-full rounded-2xl border ${fieldErrors.accountId ? 'border-destructive' : 'border-input/60'} bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.accountId && <p className="text-xs text-destructive pl-1">{fieldErrors.accountId}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Uncategorized</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Merchant</label>
                  <input
                    type="text"
                    value={formData.merchant}
                    onChange={(e) =>
                      setFormData({ ...formData, merchant: e.target.value })
                    }
                    placeholder="e.g. Amazon, Swiggy"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {(formData.type === "INVESTMENT" || formData.type === "LOAN_REPAYMENT") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.type === "INVESTMENT" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-600">Link to Investment Asset (Optional)</label>
                      <select
                        value={formData.linkedAssetId}
                        onChange={(e) =>
                          setFormData({ ...formData, linkedAssetId: e.target.value })
                        }
                        className="flex h-9 w-full rounded-lg border border-purple-200 bg-purple-50/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                      >
                        <option value="">Do not link</option>
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.type.replace(/_/g, " ")})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">This will automatically increase your asset's invested amount.</p>
                    </div>
                  )}

                  {formData.type === "LOAN_REPAYMENT" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-orange-600">Link to Liability (Optional)</label>
                      <select
                        value={formData.linkedLiabilityId}
                        onChange={(e) =>
                          setFormData({ ...formData, linkedLiabilityId: e.target.value })
                        }
                        className="flex h-9 w-full rounded-lg border border-orange-200 bg-orange-50/30 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                      >
                        <option value="">Do not link</option>
                        {liabilities.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">This will automatically reduce the outstanding balance of the loan.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/90 pl-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What was this for?"
                  className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:bg-background/80"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="h-12 px-8 rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition-all">
                  {saving ? "Saving..." : "Add Transaction"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-8 rounded-2xl font-bold transition-all"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Transaction List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No transactions yet</p>
          <p className="text-sm mt-1">
            Record your first transaction to start tracking
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Category icon */}
                <span className="text-xl flex-shrink-0">
                  {txn.category?.icon || "📝"}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {txn.description || txn.merchant || txn.category?.name || "Untitled"}
                    </p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[txn.type] || ""} bg-muted`}
                    >
                      {txn.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(txn.date)} · {txn.account.name}
                    {txn.category ? ` · ${txn.category.name}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <p
                  className={`font-semibold text-sm ${
                    txn.type === "INCOME" || txn.type === "LOAN_DISBURSEMENT"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {txn.type === "INCOME" || txn.type === "LOAN_DISBURSEMENT"
                    ? "+"
                    : "−"}
                  {formatCurrency(txn.amount)}
                </p>
                <button
                  onClick={() => handleDelete(txn.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() =>
                  setFilters({ ...filters, page: filters.page - 1 })
                }
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasMore}
                onClick={() =>
                  setFilters({ ...filters, page: filters.page + 1 })
                }
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
