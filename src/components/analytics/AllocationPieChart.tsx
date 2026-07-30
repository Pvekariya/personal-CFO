"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency } from "@/lib/utils"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#82ca9d', '#a4de6c', '#d0ed57']

interface AllocationPieChartProps {
  title: string
  data: Array<{ name: string; value: number }>
  totalValue: number
  colorOffset: number
  currency: string
}

export function AllocationPieChart({ title, data, totalValue, colorOffset, currency }: AllocationPieChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center shadow-sm">
      <div className="flex items-center justify-between w-full border-b pb-4 mb-4 select-none">
        <h3 className="font-semibold text-base text-foreground">{title}</h3>
      </div>
      
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[(index + colorOffset) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0), currency)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + colorOffset) % COLORS.length] }} />
              {item.name}
            </span>
            <span className="font-medium">
              {totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
