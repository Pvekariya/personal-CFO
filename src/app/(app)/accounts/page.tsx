"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { TopHeader } from "@/components/shared/TopHeader"
import dynamic from "next/dynamic"

const CashDragAnalyzer = dynamic(
  () => import("@/components/accounts/CashDragAnalyzer").then((m) => m.CashDragAnalyzer),
  { ssr: false }
)

type Account = {
  id: string
  name: string
  type: string
  bankName: string | null
  accountNumber: string | null
  ifscCode: string | null
  upiId: string | null
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
  WALLET: "Cash / Wallet",
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
    upiId: "",
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

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setFormData({
      name: "",
      type: "SAVINGS",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
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
      accountNumber: account.accountNumber || "",
      ifscCode: account.ifscCode || "",
      upiId: account.upiId || "",
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

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0)
  }, [accounts])

  return (
    <div className="space-y-6">
      <TopHeader 
        title="Accounts" 
        subtitle="Manage your bank accounts, wallets, and investments"
        icon="https://img.icons8.com/ios/50/museum.png"
      >
        <Button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? "Cancel" : "+ Add Account"}
        </Button>
      </TopHeader>

      {/* Total Balance Card */}
      <div className="premium-card p-6 bg-gradient-to-br from-primary/5 via-secondary/10 to-transparent border-primary/20 relative overflow-hidden group">
        <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">
              Total Consolidated Balance
            </p>
            <p className="text-4xl font-extrabold mt-1.5 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 font-mono">
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Aggregated across {accounts.length} active account{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shrink-0">
            <img src="https://img.icons8.com/ios/50/wallet.png" alt="Wallet" className="w-8 h-8 dark:invert opacity-90" />
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="premium-card p-6 space-y-4"
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
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g. HDFC Savings"
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type *</label>
              <select
                value={formData.type}
                onChange={(e) => handleFieldChange("type", e.target.value)}
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
                onChange={(e) => handleFieldChange("bankName", e.target.value)}
                placeholder="e.g. HDFC Bank"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => handleFieldChange("accountNumber", e.target.value)}
                placeholder="e.g. 50100XXXXXXX"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">IFSC Code</label>
              <input
                type="text"
                value={formData.ifscCode}
                onChange={(e) => handleFieldChange("ifscCode", e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">UPI ID</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={(e) => handleFieldChange("upiId", e.target.value)}
                placeholder="e.g. user@okhdfc"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Current Balance (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.balance}
                onChange={(e) => handleFieldChange("balance", e.target.value)}
                placeholder="e.g. 10000"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
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
              onChange={(e) => handleFieldChange("isDefault", e.target.checked)}
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
          {accounts.map((account) => {
            const maskedNumber = account.accountNumber 
              ? `•••• ${account.accountNumber.slice(-4)}`
              : ""

            const bankInitials = account.bankName 
              ? account.bankName.replace(/bank/i, "").trim().substring(0, 2).toUpperCase()
              : account.name.substring(0, 2).toUpperCase()

            return (
              <div
                key={account.id}
                className="premium-card premium-card-hover p-4.5 flex flex-col justify-between h-[130px] relative group"
              >
                {/* Top Row: Avatar, Names, and Actions */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs tracking-wider shrink-0 shadow-inner">
                      {bankInitials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm tracking-tight text-foreground leading-tight">
                          {account.name}
                        </h4>
                        {account.isDefault && (
                          <span className="text-[8px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate max-w-[120px] sm:max-w-[180px]">
                        {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                        {account.bankName ? ` • ${account.bankName}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Clean, minimalist actions in top-right */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(account)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Edit Account"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                      title="Delete Account"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Balance and Masks */}
                <div className="flex justify-between items-end pt-2">
                  <div className="space-y-0.5">
                    {maskedNumber && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        AC: {maskedNumber}
                      </p>
                    )}
                    {account.upiId && (
                      <p className="text-[9px] text-muted-foreground/80 font-mono">
                        UPI: {account.upiId}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-foreground font-mono tracking-tight leading-none">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CFO Cash Drag & Yield Drag Analyzer */}
      {!loading && accounts.length > 0 && (
        <CashDragAnalyzer accounts={accounts} />
      )}
    </div>
  )
}
