"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function OnboardingProfilePage() {
  const router = useRouter()
  const { update } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    age: "",
    city: "",
    state: "",
    retirementAge: "",
    riskProfile: "",
    monthlyIncome: "",
    annualCTC: "",
    employmentType: "",
    dependents: "",
    maritalStatus: "",
    financialFreedomTarget: "",
    financialFreedomYear: "",
    inflationAssumption: "",
  })

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Remove empty strings so Zod treats them as undefined (optional) rather than coercing to 0
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== "")
      )

      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "Failed to save profile")
        setLoading(false)
        return
      }

      // Update session to mark onboarding complete
      await update({ onboardingComplete: true })
      router.push("/onboarding/complete")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Your financial profile
        </h1>
        <p className="text-muted-foreground text-sm">
          Help your AI CFO understand your situation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="age" className="text-sm font-medium">
              Age
            </label>
            <input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => updateField("age", e.target.value)}
              placeholder="e.g. 30"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="maritalStatus" className="text-sm font-medium">
              Marital status
            </label>
            <select
              id="maritalStatus"
              value={formData.maritalStatus}
              onChange={(e) => updateField("maritalStatus", e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium">
              City
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="e.g. Mumbai"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="state" className="text-sm font-medium">
              State
            </label>
            <input
              id="state"
              type="text"
              value={formData.state}
              onChange={(e) => updateField("state", e.target.value)}
              placeholder="e.g. Maharashtra"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="monthlyIncome" className="text-sm font-medium">
              Monthly income (₹)
            </label>
            <input
              id="monthlyIncome"
              type="number"
              value={formData.monthlyIncome}
              onChange={(e) => updateField("monthlyIncome", e.target.value)}
              placeholder="e.g. 150000"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="annualCTC" className="text-sm font-medium">
              Annual CTC (₹)
            </label>
            <input
              id="annualCTC"
              type="number"
              value={formData.annualCTC}
              onChange={(e) => updateField("annualCTC", e.target.value)}
              placeholder="e.g. 1800000"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="employmentType" className="text-sm font-medium">
              Employment
            </label>
            <select
              id="employmentType"
              value={formData.employmentType}
              onChange={(e) => updateField("employmentType", e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select</option>
              <option value="Salaried">Salaried</option>
              <option value="Self-Employed">Self-Employed</option>
              <option value="Business">Business Owner</option>
              <option value="Freelancer">Freelancer</option>
              <option value="Student">Student</option>
              <option value="Unemployed">Unemployed</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="dependents" className="text-sm font-medium">
              Dependents
            </label>
            <input
              id="dependents"
              type="number"
              value={formData.dependents}
              onChange={(e) => updateField("dependents", e.target.value)}
              placeholder="e.g. 2"
              min="0"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="retirementAge" className="text-sm font-medium">
              Target retirement age
            </label>
            <input
              id="retirementAge"
              type="number"
              value={formData.retirementAge}
              onChange={(e) => updateField("retirementAge", e.target.value)}
              placeholder="e.g. 50"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="riskProfile" className="text-sm font-medium">
              Risk appetite
            </label>
            <select
              id="riskProfile"
              value={formData.riskProfile}
              onChange={(e) => updateField("riskProfile", e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select</option>
              <option value="Conservative">Conservative</option>
              <option value="Moderate">Moderate</option>
              <option value="Aggressive">Aggressive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="financialFreedomTarget" className="text-sm font-medium">
              FF target (₹)
            </label>
            <input
              id="financialFreedomTarget"
              type="number"
              value={formData.financialFreedomTarget}
              onChange={(e) =>
                updateField("financialFreedomTarget", e.target.value)
              }
              placeholder="e.g. 50000000"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="financialFreedomYear" className="text-sm font-medium">
              FF target year
            </label>
            <input
              id="financialFreedomYear"
              type="number"
              value={formData.financialFreedomYear}
              onChange={(e) =>
                updateField("financialFreedomYear", e.target.value)
              }
              placeholder="e.g. 2040"
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Save & continue"}
        </Button>
      </form>
    </div>
  )
}
