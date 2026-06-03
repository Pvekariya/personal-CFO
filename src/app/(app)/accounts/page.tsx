"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

type Account = {
  id: string
  name: string
  type: string
  bankName: string | null
  balance: string // Decimal comes as string
  currency: string
  isDefault: boolean
  isActive: boolean
  color: string | null
  icon: string | null
  notes: string | null
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  SAVINGS: "Savings",
  CURRENT: "Current",
  SALARY: "Salary",
  FIXED_DEPOSIT: "Fixed Deposit",
  PPF: "PPF",
  EPF: "EPF",
  NPS: "NPS",
  WALLET: "Wallet",
  CRYPTO_WALLET: "Crypto Wallet",
  BUSINESS_CURRENT: "Business Current",
  BUSINESS_SAVINGS: "Business Savings",
  BUSINESS_OD: "Business OD",
}

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS)



export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "SAVINGS",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    balance: "",
    isDefault: false,
    notes: "",
  })
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/accounts")
      const json = await res.json()
      if (json.data) setAccounts(json.data)
    } catch (e) {
      console.error("Failed to fetch accounts:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  function resetForm() {
    setFormData({
      name: "",
      type: "SAVINGS",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      balance: "",
      isDefault: false,
      notes: "",
    })
    setEditingId(null)
    setFormError("")
  }

  function startEdit(account: Account) {
    setFormData({
      name: account.name,
      type: account.type,
      bankName: account.bankName || "",
      accountNumber: "",
      ifscCode: "",
      balance: account.balance,
      isDefault: account.isDefault,
      notes: account.notes || "",
    })
    setEditingId(account.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setSaving(true)

    const url = editingId
      ? `/api/v1/accounts/${editingId}`
      : "/api/v1/accounts"
    const method = editingId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          balance: parseFloat(formData.balance) || 0,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setFormError(json.error || "Failed to save account")
        setSaving(false)
        return
      }

      resetForm()
      setShowForm(false)
      fetchAccounts()
    } catch {
      setFormError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this account?")) return

    try {
      await fetch(`/api/v1/accounts/${id}`, { method: "DELETE" })
      fetchAccounts()
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  const totalBalance = accounts.reduce(
    (sum, a) => sum + parseFloat(a.balance),
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your bank accounts, wallets, and investments
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? "Cancel" : "+ Add Account"}
        </Button>
      </div>

      {/* Total Balance Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">
          Total Balance
        </p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <h3 className="font-semibold">
            {editingId ? "Edit Account" : "New Account"}
          </h3>

          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. HDFC Savings"
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type *</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ACCOUNT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) =>
                  setFormData({ ...formData, bankName: e.target.value })
                }
                placeholder="e.g. HDFC Bank"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Current Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: e.target.value })
                }
                placeholder="e.g. 10000"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any notes about this account..."
              rows={2}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isDefault" className="text-sm">
              Set as default account
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Create Account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Account List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No accounts yet</p>
          <p className="text-sm mt-1">
            Add your first bank account to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/5 p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,122,255,0.08)] transition-all duration-300 group"
            >
              <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                      <img src="https://img.icons8.com/ios/50/museum.png" alt="Bank" className="w-5 h-5 dark:invert opacity-80" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base tracking-tight">{account.name}</h3>
                        {account.isDefault && (
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                      {account.bankName ? ` · ${account.bankName}` : ""}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                  {formatCurrency(account.balance)}
                </p>
              </div>

              {account.notes && (
                <p className="text-xs text-muted-foreground">{account.notes}</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-border/40">
                <button
                  onClick={() => startEdit(account)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
                >
                  Edit Account
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
