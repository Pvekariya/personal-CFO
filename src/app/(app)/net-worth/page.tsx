"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import dynamic from "next/dynamic"

const FIREProjectionCalculator = dynamic(
  () => import("@/components/shared/FIREProjectionCalculator").then((m) => m.FIREProjectionCalculator),
  { ssr: false }
)
const NetWorthCharts = dynamic(
  () => import("@/components/net-worth/NetWorthCharts").then((m) => m.NetWorthCharts),
  { ssr: false }
)

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
  const chartData = useMemo(() => {
    return snapshots.map((s) => ({
      date: formatDate(s.snapshotDate),
      NetWorth: parseFloat(s.netWorth),
      Assets: parseFloat(s.totalAssets),
      Liabilities: parseFloat(s.totalLiabilities),
    }))
  }, [snapshots])

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

          {/* Interactive Net Worth Charts */}
          <NetWorthCharts chartData={chartData} currency={currency} />

          {/* FIRE Projection Calculator */}
          <FIREProjectionCalculator
            currentNetWorth={latestSnapshot ? parseFloat(latestSnapshot.netWorth) : 500000}
          />
        </div>
      )}
    </div>
  )
}
