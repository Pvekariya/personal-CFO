import { useState, useEffect } from "react"

// insights types
type BudgetInsight = {
  id: string
  categoryName: string
  categoryIcon: string
  budgetAmount: number
  spent: number
  spentPercent: number
  status: "ON_TRACK" | "WARNING" | "DANGER" | "EXCEEDED"
}

type SubscriptionInsight = {
  id: string
  name: string
  amount: number
  type: string
  lastDate: string
  nextDate: string
  daysUntil: number
}

// State variables to add:
// const [insights, setInsights] = useState<{ monthElapsedPercent: number, budgets: BudgetInsight[], subscriptions: SubscriptionInsight[] } | null>(null)
//
// In fetchTransactions() or fetchInsights():
// const res = await fetch("/api/v1/transactions/insights")
// const json = await res.json()
// if (json.data) setInsights(json.data)
