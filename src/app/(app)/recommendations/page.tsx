"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"

type Recommendation = {
  id: string
  category: string
  priority: string
  title: string
  body: string
  impact: string | null
  action: string | null
  isRead: boolean
  createdAt: string
}

const PriorityColors: Record<string, string> = {
  CRITICAL: "border-rose-500 bg-rose-50",
  HIGH: "border-orange-400 bg-orange-50",
  MEDIUM: "border-blue-400 bg-blue-50",
  LOW: "border-slate-300 bg-slate-50",
}

const CategoryIcons: Record<string, string> = {
  EMERGENCY_FUND: "🛡️",
  DEBT: "📉",
  TAX: "🧾",
  INVESTMENT: "📈",
  PORTFOLIO: "🥧",
  SPENDING: "💸",
  GOAL: "🎯",
  INSURANCE: "☂️",
  BUSINESS: "🏢",
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/recommendations")
      const json = await res.json()
      if (json.data) setRecommendations(json.data)
    } catch (error) {
      console.error("Failed to load recommendations", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/recommendations/generate", { method: "POST" })
      if (res.ok) {
        fetchRecommendations()
      }
    } catch (e) {
      console.error("Failed to generate", e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Insights & Advice</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rule-based financial recommendations based on your personal data.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Scanning Finances..." : "Run AI Health Check"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading insights...</div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card border-dashed">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-lg">No pending recommendations.</p>
          <p className="text-sm mt-1">Run a health check to analyze your finances.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div 
              key={rec.id} 
              className={`rounded-xl border-l-4 p-5 shadow-sm transition-all hover:shadow-md ${PriorityColors[rec.priority] || "border-slate-300 bg-card"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="text-3xl mt-1">
                    {CategoryIcons[rec.category] || "💡"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-slate-900">{rec.title}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/60 text-slate-700">
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm">{rec.body}</p>
                    
                    {rec.impact && (
                      <div className="mt-3 inline-block bg-white/80 rounded-md px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                        Impact: {rec.impact}
                      </div>
                    )}
                  </div>
                </div>
                
                {rec.action && (
                  <Button variant="outline" size="sm" className="bg-white border-slate-300">
                    {rec.action}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
