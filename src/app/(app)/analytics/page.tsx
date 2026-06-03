"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency } from "@/lib/utils"

type Asset = {
  id: string
  name: string
  class: string
  type: string
  investedAmount: string
  currentValue: string
  platform: string | null
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#82ca9d', '#a4de6c', '#d0ed57']

export default function AnalyticsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [currency, setCurrency] = useState("INR")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, profRes] = await Promise.all([
          fetch("/api/v1/investments"),
          fetch("/api/v1/profile")
        ])
        
        const invJson = await invRes.json()
        const profJson = await profRes.json()
        
        if (invJson.data) setAssets(invJson.data)
        if (profJson.data?.currency) setCurrency(profJson.data.currency)
      } catch (error) {
        console.error("Failed to load analytics data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
  }

  // Calculate Asset Allocation (by Class)
  const classAllocationMap: Record<string, number> = {}
  let totalPortfolioValue = 0

  assets.forEach(asset => {
    const val = parseFloat(asset.currentValue)
    totalPortfolioValue += val
    
    const assetClass = asset.class.replace(/_/g, " ")
    if (!classAllocationMap[assetClass]) {
      classAllocationMap[assetClass] = 0
    }
    classAllocationMap[assetClass] += val
  })

  const classData = Object.entries(classAllocationMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Calculate Platform Allocation
  const platformMap: Record<string, number> = {}
  assets.forEach(asset => {
    const val = parseFloat(asset.currentValue)
    const platform = asset.platform || "Other / Unspecified"
    
    if (!platformMap[platform]) {
      platformMap[platform] = 0
    }
    platformMap[platform] += val
  })

  const platformData = Object.entries(platformMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

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
          
          {/* Asset Class Allocation */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center">
            <h3 className="font-semibold text-lg self-start w-full border-b pb-4 mb-4">
              Allocation by Asset Class
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {classData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0), currency)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4 space-y-2">
              {classData.map((item, index) => (
                <div key={item.name} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    {item.name}
                  </span>
                  <span className="font-medium">
                    {((item.value / totalPortfolioValue) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Distribution */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center">
            <h3 className="font-semibold text-lg self-start w-full border-b pb-4 mb-4">
              Distribution by Platform
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0), currency)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4 space-y-2">
              {platformData.map((item, index) => (
                <div key={item.name} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }}></span>
                    {item.name}
                  </span>
                  <span className="font-medium">
                    {((item.value / totalPortfolioValue) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
