"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts"

type NetWorthSnapshot = {
  id: string
  totalAssets: string
  totalLiabilities: string
  netWorth: string
  breakdown: Record<string, number>
  snapshotDate: string
}

export default function NetWorthPage() {
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([])
  const [currency, setCurrency] = useState("INR")
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [nwRes, profRes] = await Promise.all([
        fetch("/api/v1/net-worth"),
        fetch("/api/v1/profile"),
      ])
      const nwJson = await nwRes.json()
      const profJson = await profRes.json()

      if (nwJson.data) setSnapshots(nwJson.data)
      if (profJson.data?.currency) setCurrency(profJson.data.currency)
    } catch (error) {
      console.error("Failed to load net worth data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleCapture() {
    setCapturing(true)
    try {
      const res = await fetch("/api/v1/net-worth/capture", { method: "POST" })
      if (res.ok) {
        fetchData()
      }
    } catch (e) {
      console.error("Failed to capture snapshot:", e)
    } finally {
      setCapturing(false)
    }
  }

  // Format data for Recharts
  const chartData = snapshots.map((s) => ({
    date: formatDate(s.snapshotDate),
    NetWorth: parseFloat(s.netWorth),
    Assets: parseFloat(s.totalAssets),
    Liabilities: parseFloat(s.totalLiabilities),
  }))

  const latestSnapshot = snapshots[snapshots.length - 1]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Net Worth Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Historical view of your true wealth.
          </p>
        </div>
        <Button onClick={handleCapture} disabled={capturing}>
          {capturing ? "Capturing..." : "Take Snapshot Now"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading history...</div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card border-dashed">
          <p className="text-lg">No snapshots found</p>
          <p className="text-sm mt-1">Take your first snapshot to start tracking your net worth!</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Latest Metric Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-muted-foreground">Latest Net Worth</p>
              <p className="text-2xl font-bold mt-1 text-primary">
                {formatCurrency(parseFloat(latestSnapshot.netWorth), currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">As of {formatDate(latestSnapshot.snapshotDate)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold mt-1 text-emerald-500">
                {formatCurrency(parseFloat(latestSnapshot.totalAssets), currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium text-muted-foreground">Total Liabilities</p>
              <p className="text-2xl font-bold mt-1 text-rose-500">
                {formatCurrency(parseFloat(latestSnapshot.totalLiabilities), currency)}
              </p>
            </div>
          </div>

          {/* Line Chart for Net Worth Growth */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-lg border-b pb-4 mb-4">Net Worth Growth Over Time</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNW" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis 
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0), currency)}
                    labelClassName="text-foreground font-medium"
                  />
                  <Area
                    type="monotone"
                    dataKey="NetWorth"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorNW)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assets vs Liabilities Bar Chart */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold text-lg border-b pb-4 mb-4">Assets vs Liabilities</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis 
                    tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value || 0), currency)}
                  />
                  <Legend />
                  <Bar dataKey="Assets" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Liabilities" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
