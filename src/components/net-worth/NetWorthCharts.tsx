"use client"

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
import { formatCurrency } from "@/lib/utils"

interface NetWorthChartsProps {
  chartData: Array<{
    date: string
    NetWorth: number
    Assets: number
    Liabilities: number
  }>
  currency: string
}

export function NetWorthCharts({ chartData, currency }: NetWorthChartsProps) {
  return (
    <div className="space-y-6">
      {/* Line Chart for Net Worth Growth */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-semibold text-lg border-b pb-4 mb-4 select-none">Net Worth Growth Over Time</h3>
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
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-semibold text-lg border-b pb-4 mb-4 select-none">Assets vs Liabilities</h3>
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
  )
}
