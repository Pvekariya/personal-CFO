"use client"

import { useState, useEffect, useMemo } from "react"
import { cn, formatCurrency } from "@/lib/utils"
import dynamic from "next/dynamic"

const CFOHealthAudit = dynamic(
  () => import("@/components/analytics/CFOHealthAudit").then((m) => m.CFOHealthAudit),
  { ssr: false }
)

const AllocationPieChart = dynamic(
  () => import("@/components/analytics/AllocationPieChart").then((m) => m.AllocationPieChart),
  { ssr: false }
)

type Asset = {
  id: string
  name: string
  class: string
  type: string
  investedAmount: string
  currentValue: string
  platform: string | null
  convertedCurrentValue?: string
  convertedInvestedAmount?: string
}

export default function AnalyticsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [liabilities, setLiabilities] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [currency, setCurrency] = useState("INR")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, profRes, accRes, liabRes, txnRes] = await Promise.all([
          fetch("/api/v1/investments"),
          fetch("/api/v1/profile"),
          fetch("/api/v1/accounts"),
          fetch("/api/v1/liabilities"),
          fetch("/api/v1/transactions"),
        ])
        
        const invJson = await invRes.json()
        const profJson = await profRes.json()
        const accJson = await accRes.json()
        const liabJson = await liabRes.json()
        const txnJson = await txnRes.json()
        
        if (invJson.data) setAssets(invJson.data)
        if (profJson.data) {
          setProfile(profJson.data)
          if (profJson.data.currency) setCurrency(profJson.data.currency)
        }
        if (accJson.data) setAccounts(accJson.data)
        if (liabJson.data) setLiabilities(liabJson.data)
        if (txnJson.data) setTransactions(txnJson.data)
      } catch (error) {
        console.error("Failed to load analytics data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate allocations using useMemo
  const { totalPortfolioValue, classData, platformData } = useMemo(() => {
    let totalPortfolioValue = 0
    const classAllocationMap: Record<string, number> = {}
    const platformMap: Record<string, number> = {}

    assets.forEach(asset => {
      const val = parseFloat(asset.convertedCurrentValue || asset.currentValue) || 0
      totalPortfolioValue += val
      
      const assetClass = asset.class.replace(/_/g, " ")
      if (!classAllocationMap[assetClass]) {
        classAllocationMap[assetClass] = 0
      }
      classAllocationMap[assetClass] += val

      const platform = asset.platform || "Other / Unspecified"
      if (!platformMap[platform]) {
        platformMap[platform] = 0
      }
      platformMap[platform] += val
    })

    const classData = Object.entries(classAllocationMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const platformData = Object.entries(platformMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return { totalPortfolioValue, classData, platformData }
  }, [assets])

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deep dive into your asset allocation and distribution.
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card border-dashed">
          <p className="text-lg">No assets to analyze</p>
          <p className="text-sm mt-1">Head over to Investments to add your portfolio data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <AllocationPieChart
            title="Allocation by Asset Class"
            data={classData}
            totalValue={totalPortfolioValue}
            colorOffset={0}
            currency={currency}
          />

          <AllocationPieChart
            title="Distribution by Platform"
            data={platformData}
            totalValue={totalPortfolioValue}
            colorOffset={3}
            currency={currency}
          />

          {/* CFO 7-Point Financial Health Audit */}
          <div className="md:col-span-2">
            <CFOHealthAudit
              assets={assets}
              accounts={accounts}
              liabilities={liabilities}
              transactions={transactions}
              profile={profile}
              currency={currency}
            />
          </div>

        </div>
      )}
    </div>
  )
}
