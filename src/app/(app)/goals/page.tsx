"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"

type Goal = {
  id: string
  name: string
  type: string
  targetAmount: string
  currentAmount: string
  targetDate: string
  inflationRate: string
  expectedReturn: string
  inflationAdjustedTarget: string | null
  requiredSIP: string | null
  notes: string | null
}

const GOAL_TYPES = [
  "EMERGENCY_FUND",
  "RETIREMENT",
  "HOME_PURCHASE",
  "VEHICLE",
  "EDUCATION",
  "MARRIAGE",
  "TRAVEL",
  "BUSINESS",
  "FINANCIAL_FREEDOM",
  "WEALTH_CREATION",
  "CUSTOM",
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    type: "FINANCIAL_FREEDOM",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
    inflationRate: "7",
    expectedReturn: "12",
    notes: "",
  })
  
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/goals")
      const json = await res.json()
      if (json.data) setGoals(json.data)
    } catch (e) {
      console.error("Failed to fetch goals:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  function resetForm() {
    setFormData({
      name: "",
      type: "FINANCIAL_FREEDOM",
      targetAmount: "",
      currentAmount: "0",
      targetDate: "",
      inflationRate: "7",
      expectedReturn: "12",
      notes: "",
    })
    setEditingId(null)
    setFormError("")
  }

  function startEdit(goal: Goal) {
    setFormData({
      name: goal.name,
      type: goal.type,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate.split("T")[0],
      inflationRate: goal.inflationRate,
      expectedReturn: goal.expectedReturn,
      notes: goal.notes || "",
    })
    setEditingId(goal.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setSaving(true)

    const url = editingId ? `/api/v1/goals/${editingId}` : "/api/v1/goals"
    const method = editingId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount) || 0,
          inflationRate: parseFloat(formData.inflationRate) || 0,
          expectedReturn: parseFloat(formData.expectedReturn) || 0,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setFormError(json.error || "Failed to save goal")
        setSaving(false)
        return
      }

      resetForm()
      setShowForm(false)
      fetchGoals()
    } catch {
      setFormError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this goal?")) return

    try {
      await fetch(`/api/v1/goals/${id}`, { method: "DELETE" })
      fetchGoals()
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals & Calculations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Set targets, adjust for inflation, and calculate required SIPs.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? "Cancel" : "+ Add Goal"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <h3 className="font-semibold">
            {editingId ? "Edit Goal" : "New Goal Calculator"}
          </h3>

          {formError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Goal Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dream Home 2030"
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Goal Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {GOAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Amount (Today's Value) *</label>
              <input
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                placeholder="e.g. 1000000"
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Current Saved Amount</label>
              <input
                type="number"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                placeholder="e.g. 50000"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Date *</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Inflation Assumption (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.inflationRate}
                onChange={(e) => setFormData({ ...formData, inflationRate: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Return CAGR (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.expectedReturn}
                onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Calculating & Saving..." : editingId ? "Update Goal" : "Calculate & Create Goal"}
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

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card border-dashed">
          <p className="text-lg">No goals created yet</p>
          <p className="text-sm mt-1">
            Add a goal to calculate your required SIP and inflation-adjusted targets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{goal.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {goal.type.replace(/_/g, " ")} • Target: {formatDate(goal.targetDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Today's Value</p>
                  <p className="font-bold">{formatCurrency(goal.targetAmount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Future Cost (Inflation @ {goal.inflationRate}%)</p>
                  <p className="text-lg font-bold text-rose-500 mt-0.5">
                    {formatCurrency(goal.inflationAdjustedTarget || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Required Monthly SIP (@ {goal.expectedReturn}%)</p>
                  <p className="text-lg font-bold text-emerald-500 mt-0.5">
                    {formatCurrency(goal.requiredSIP || 0)} <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Saved so far: <span className="font-medium text-foreground">{formatCurrency(goal.currentAmount)}</span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(goal)}
                    className="text-xs text-primary hover:underline transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-xs text-destructive hover:underline transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
