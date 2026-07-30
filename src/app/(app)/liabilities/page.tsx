"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import dynamic from "next/dynamic"

const DebtAvalancheOptimizer = dynamic(
  () => import("@/components/liabilities/DebtAvalancheOptimizer").then((m) => m.DebtAvalancheOptimizer),
  { ssr: false }
)

type Liability = {
  id: string
  name: string
  type: string
  lender: string | null
  principalAmount: string
  outstandingBalance: string
  interestRate: string | null
  emiAmount: string | null
  tenure: number | null
  notes: string | null
}

const LIABILITY_TYPES = [
  "HOME_LOAN", "CAR_LOAN", "EDUCATION_LOAN", "PERSONAL_LOAN", "BUSINESS_LOAN", "OVERDRAFT", "CREDIT_CARD", "FAMILY_DEBT", "INHERITED_DEBT", "INFORMAL_DEBT", "OTHER"
]

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [currency, setCurrency] = useState("INR")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    type: "PERSONAL_LOAN",
    lender: "",
    principalAmount: "",
    outstandingBalance: "",
    interestRate: "",
    emiAmount: "",
    tenure: "",
    notes: "",
  })
  
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [liabRes, profRes] = await Promise.all([
        fetch("/api/v1/liabilities"),
        fetch("/api/v1/profile")
      ])
      
      const liabJson = await liabRes.json()
      const profJson = await profRes.json()
      
      if (liabJson.data) setLiabilities(liabJson.data)
      if (profJson.data?.currency) setCurrency(profJson.data.currency)
    } catch (e) {
      console.error("Failed to fetch data:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setFormData({
      name: "",
      type: "PERSONAL_LOAN",
      lender: "",
      principalAmount: "",
      outstandingBalance: "",
      interestRate: "",
      emiAmount: "",
      tenure: "",
      notes: "",
    })
    setEditingId(null)
    setFormError("")
  }

  function startEdit(liability: Liability) {
    setFormData({
      name: liability.name,
      type: liability.type,
      lender: liability.lender || "",
      principalAmount: liability.principalAmount,
      outstandingBalance: liability.outstandingBalance,
      interestRate: liability.interestRate || "",
      emiAmount: liability.emiAmount || "",
      tenure: liability.tenure?.toString() || "",
      notes: liability.notes || "",
    })
    setEditingId(liability.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setSaving(true)

    const url = editingId ? `/api/v1/liabilities/${editingId}` : "/api/v1/liabilities"
    const method = editingId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const json = await res.json()

      if (!res.ok) {
        setFormError(json.error || "Failed to save liability")
        setSaving(false)
        return
      }

      resetForm()
      setShowForm(false)
      fetchData()
    } catch {
      setFormError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this liability?")) return

    try {
      await fetch(`/api/v1/liabilities/${id}`, { method: "DELETE" })
      fetchData()
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  const { totalOutstanding, totalPrincipal, totalEMI } = useMemo(() => {
    let out = 0, prin = 0, emi = 0
    liabilities.forEach((l) => {
      out += parseFloat(l.outstandingBalance || "0")
      prin += parseFloat(l.principalAmount || "0")
      emi += parseFloat(l.emiAmount || "0")
    })
    return { totalOutstanding: out, totalPrincipal: prin, totalEMI: emi }
  }, [liabilities])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liabilities & Loans</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your debts, EMIs, and credit cards.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? "Cancel" : "+ Add Liability"}
        </Button>
      </div>

      {/* Liabilities Overview Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-rose-500">{formatCurrency(totalOutstanding, currency)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Original Principal</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalPrincipal, currency)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Monthly EMI</p>
          <p className="text-2xl font-bold mt-1 text-amber-500">{formatCurrency(totalEMI, currency)}</p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <h3 className="font-semibold">
            {editingId ? "Edit Liability" : "New Liability"}
          </h3>

          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Liability Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g. HDFC Home Loan"
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Lender / Bank</label>
              <input
                type="text"
                value={formData.lender}
                onChange={(e) => handleFieldChange("lender", e.target.value)}
                placeholder="e.g. HDFC Bank, SBI"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => handleFieldChange("type", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {LIABILITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Original Principal *</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.principalAmount}
                onChange={(e) => handleFieldChange("principalAmount", e.target.value)}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Outstanding Balance *</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.outstandingBalance}
                onChange={(e) => handleFieldChange("outstandingBalance", e.target.value)}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Monthly EMI</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.emiAmount}
                onChange={(e) => handleFieldChange("emiAmount", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Interest Rate (Annual %)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={formData.interestRate}
                onChange={(e) => handleFieldChange("interestRate", e.target.value)}
                placeholder="e.g. 8.5"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remaining Tenure (Months)</label>
              <input
                type="number"
                inputMode="decimal"
                value={formData.tenure}
                onChange={(e) => handleFieldChange("tenure", e.target.value)}
                placeholder="e.g. 24"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Liability" : "Create Liability"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading liabilities...</div>
      ) : liabilities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card border-dashed">
          <p className="text-lg">No liabilities tracked yet</p>
          <p className="text-sm mt-1">Add your loans and credit card debts here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Liability</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold text-right">Interest / EMI</th>
                <th className="px-6 py-4 font-semibold text-right">Principal</th>
                <th className="px-6 py-4 font-semibold text-right">Outstanding</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {liabilities.map((liability) => {
                const principal = parseFloat(liability.principalAmount)
                const outstanding = parseFloat(liability.outstandingBalance)
                const progress = principal > 0 ? ((principal - outstanding) / principal) * 100 : 0

                return (
                  <tr key={liability.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{liability.name}</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{liability.lender || "No lender"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-600">
                        {liability.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {liability.interestRate ? <p className="font-semibold text-foreground/90 font-mono">{liability.interestRate}%</p> : null}
                      {liability.emiAmount ? <p className="text-xs text-muted-foreground/80 mt-0.5 font-mono">{formatCurrency(liability.emiAmount, currency)}/mo</p> : null}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(principal, currency)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      <p className="text-rose-500">{formatCurrency(outstanding, currency)}</p>
                      <div className="w-full bg-muted h-1.5 rounded-full mt-1 overflow-hidden flex justify-end">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => startEdit(liability)} className="text-primary hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDelete(liability.id)} className="text-destructive hover:underline">Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CFO Debt Avalanche & Prepayment Optimizer */}
      {!loading && liabilities.length > 0 && (
        <DebtAvalancheOptimizer liabilities={liabilities} currency={currency} />
      )}
    </div>
  )
}
