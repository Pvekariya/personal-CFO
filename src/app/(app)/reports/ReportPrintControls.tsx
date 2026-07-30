"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface ReportPrintControlsProps {
  currentMonth: number
  currentYear: number
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function ReportPrintControls({ currentMonth, currentYear }: ReportPrintControlsProps) {
  const router = useRouter()

  function handleMonthChange(newMonth: number) {
    router.push(`/reports?month=${newMonth}&year=${currentYear}`)
  }

  function handleYearChange(newYear: number) {
    router.push(`/reports?month=${currentMonth}&year=${newYear}`)
  }

  function handlePrint() {
    window.print()
  }

  function handleCSVExport() {
    window.open(`/api/v1/reports/export?month=${currentMonth}&year=${currentYear}`, "_blank")
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Month Selector */}
      <select
        value={currentMonth}
        onChange={(e) => handleMonthChange(Number(e.target.value))}
        className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
        aria-label="Select month for financial report"
      >
        {MONTHS.map((m, idx) => (
          <option key={m} value={idx + 1}>
            {m}
          </option>
        ))}
      </select>

      {/* Year Selector */}
      <select
        value={currentYear}
        onChange={(e) => handleYearChange(Number(e.target.value))}
        className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
        aria-label="Select year for financial report"
      >
        {[2024, 2025, 2026, 2027].map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* CSV Export Button */}
      <Button
        variant="outline"
        onClick={handleCSVExport}
        className="h-10 rounded-xl gap-2 font-bold hover:bg-muted/80 shadow-sm"
        aria-label="Export report data as CSV file"
      >
        <img src="https://img.icons8.com/ios/50/export.png" alt="" className="w-4 h-4 dark:invert" />
        Export CSV
      </Button>

      {/* Print Button */}
      <Button
        onClick={handlePrint}
        className="h-10 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40"
        aria-label="Print or save financial report as PDF"
      >
        <img src="https://img.icons8.com/ios/50/print.png" alt="" className="w-4 h-4 invert dark:invert-0" />
        Print / Save PDF
      </Button>
    </div>
  )
}
