"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import dynamic from "next/dynamic"

const PortfolioRebalancer = dynamic(
  () => import("@/components/investments/PortfolioRebalancer").then((m) => m.PortfolioRebalancer),
  { ssr: false }
)

type Asset = {
  id: string
  name: string
  class: string
  type: string
  investedAmount: string
  currentValue: string
  expectedReturn: string | null
  platform: string | null
  notes: string | null
}

const ASSET_CLASSES = [
  "EQUITY", "DEBT", "GOLD", "SILVER", "REAL_ESTATE", "CRYPTO", "COMMODITY", "CASH_EQUIVALENT", "INTERNATIONAL", "ALTERNATIVE"
]

const ASSET_TYPES = [
  "MUTUAL_FUND", "DIRECT_STOCK", "ETF", "INDEX_FUND", "GOLD_PHYSICAL", "GOLD_DIGITAL", "SOVEREIGN_GOLD_BOND", "FIXED_DEPOSIT", "PPF", "EPF", "NPS", "BOND", "REAL_ESTATE", "CRYPTO", "SILVER", "REIT", "INVIT", "US_STOCKS", "OTHER"
]

export default function InvestmentsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    class: "EQUITY",
    type: "MUTUAL_FUND",
    investedAmount: "",
    currentValue: "",
    expectedReturn: "",
    platform: "",
    notes: "",
  })
  
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/investments")
      const json = await res.json()
      if (json.data) setAssets(json.data)
    } catch (e) {
      console.error("Failed to fetch assets:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setFormData({
      name: "",
      class: "EQUITY",
      type: "MUTUAL_FUND",
      investedAmount: "",
      currentValue: "",
      expectedReturn: "",
      platform: "",
      notes: "",
    })
    setEditingId(null)
    setFormError("")
  }

  function startEdit(asset: Asset) {
    setFormData({
      name: asset.name,
      class: asset.class,
      type: asset.type,
      investedAmount: asset.investedAmount,
      currentValue: asset.currentValue,
      expectedReturn: asset.expectedReturn || "",
      platform: asset.platform || "",
      notes: asset.notes || "",
    })
    setEditingId(asset.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setSaving(true)

    const url = editingId ? `/api/v1/investments/${editingId}` : "/api/v1/investments"
    const method = editingId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const json = await res.json()

      if (!res.ok) {
        setFormError(json.error || "Failed to save asset")
        setSaving(false)
        return
      }

      resetForm()
      setShowForm(false)
      fetchAssets()
    } catch {
      setFormError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this asset?")) return

    try {
      await fetch(`/api/v1/investments/${id}`, { method: "DELETE" })
      fetchAssets()
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  const { totalInvested, totalCurrent, totalGains, totalGainsPercent } = useMemo(() => {
    let invested = 0
    let current = 0
    assets.forEach((a) => {
      invested += parseFloat(a.investedAmount || "0")
      current += parseFloat(a.currentValue || "0")
    })
    const gains = current - invested
    const gainsPct = invested > 0 ? (gains / invested) * 100 : 0
    return { totalInvested: invested, totalCurrent: current, totalGains: gains, totalGainsPercent: gainsPct }
  }, [assets])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your MF, Stocks, FDs, and other assets in one place.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? "Cancel" : "+ Add Asset"}
        </Button>
      </div>

      {/* Portfolio Overview Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Current Value</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Invested Amount</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Total Returns</p>
          <p className={`text-2xl font-bold mt-1 ${totalGains >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalGains >= 0 ? "+" : ""}{formatCurrency(totalGains)}
          </p>
          <p className={`text-xs mt-1 ${totalGains >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalGains >= 0 ? "▲" : "▼"} {totalGainsPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <h3 className="font-semibold">
            {editingId ? "Edit Asset" : "New Investment Asset"}
          </h3>

          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                placeholder="e.g. Parag Parikh Flexi Cap"
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform / Broker</label>
              <input
                type="text"
                value={formData.platform}
                onChange={(e) => handleFieldChange("platform", e.target.value)}
                placeholder="e.g. Zerodha, Groww"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Class *</label>
              <select
                value={formData.class}
                onChange={(e) => handleFieldChange("class", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ASSET_CLASSES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Type *</label>
              <select
                value={formData.type}
                onChange={(e) => handleFieldChange("type", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Invested Amount *</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.investedAmount}
                onChange={(e) => handleFieldChange("investedAmount", e.target.value)}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Current Value *</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => handleFieldChange("currentValue", e.target.value)}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Return (CAGR %)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={formData.expectedReturn}
                onChange={(e) => handleFieldChange("expectedReturn", e.target.value)}
                placeholder="e.g. 12"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Asset" : "Create Asset"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading investments...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card border-dashed">
          <p className="text-lg">No assets tracked yet</p>
          <p className="text-sm mt-1">Add your mutual funds, stocks, and FDs here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Asset</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold text-right">Invested</th>
                <th className="px-6 py-4 font-semibold text-right">Current Value</th>
                <th className="px-6 py-4 font-semibold text-right">Returns</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => {
                const invested = parseFloat(asset.investedAmount)
                const current = parseFloat(asset.currentValue)
                const returns = current - invested
                const returnPercent = invested > 0 ? (returns / invested) * 100 : 0
                const isPositive = returns >= 0

                return (
                  <tr key={asset.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{asset.name}</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{asset.platform || "No platform"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                        {asset.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted-foreground font-mono">
                      {formatCurrency(invested)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums font-mono">
                      {formatCurrency(current)}
                    </td>
                    <td className={`px-6 py-4 text-right tabular-nums font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <p className="font-bold">{isPositive ? "+" : ""}{formatCurrency(returns)}</p>
                      <p className="text-[10px] opacity-80">{isPositive ? "+" : ""}{returnPercent.toFixed(2)}%</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => startEdit(asset)} className="text-primary hover:underline mr-3">Edit</button>
                      <button onClick={() => handleDelete(asset.id)} className="text-destructive hover:underline">Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Target Asset Allocation & Rebalancer */}
      {!loading && assets.length > 0 && (
        <PortfolioRebalancer assets={assets} />
      )}
    </div>
  )
}
