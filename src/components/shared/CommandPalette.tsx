"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type CommandItem = {
  id: string
  title: string
  subtitle?: string
  icon: string
  action: () => void
  category: "Navigation" | "Quick Actions"
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.shiftKey
      if (isCmdK) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
      if (event.key === "Escape" && open) {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery("")
    }
  }, [open])

  const commands: CommandItem[] = [
    {
      id: "nav-dashboard",
      title: "Go to Dashboard",
      subtitle: "Overview of Net Worth, Cash Flow & KPI Cards",
      icon: "https://img.icons8.com/ios/50/combo-chart--v1.png",
      category: "Navigation",
      action: () => {
        router.push("/dashboard")
        setOpen(false)
      },
    },
    {
      id: "nav-accounts",
      title: "Go to Accounts",
      subtitle: "Bank Accounts, Wallets & Balance Balances",
      icon: "https://img.icons8.com/ios/50/museum.png",
      category: "Navigation",
      action: () => {
        router.push("/accounts")
        setOpen(false)
      },
    },
    {
      id: "nav-transactions",
      title: "Go to Transactions",
      subtitle: "Full Ledger & Filters",
      icon: "https://img.icons8.com/ios/50/bank-cards.png",
      category: "Navigation",
      action: () => {
        router.push("/transactions")
        setOpen(false)
      },
    },
    {
      id: "nav-reports",
      title: "Go to Financial Reports & Export",
      subtitle: "Printable PDF Monthly Statements & CSV Exporter",
      icon: "https://img.icons8.com/ios/50/print.png",
      category: "Navigation",
      action: () => {
        router.push("/reports")
        setOpen(false)
      },
    },
    {
      id: "nav-net-worth",
      title: "Go to Net Worth & FIRE Projections",
      subtitle: "Historical Net Worth & Freedom Calculator",
      icon: "https://img.icons8.com/ios/50/diamond--v1.png",
      category: "Navigation",
      action: () => {
        router.push("/net-worth")
        setOpen(false)
      },
    },
    {
      id: "nav-tax",
      title: "Go to Tax Planning & Optimizer",
      subtitle: "Old vs New Regime Tax Optimizer & 80C Gap",
      icon: "https://img.icons8.com/ios/50/tax.png",
      category: "Navigation",
      action: () => {
        router.push("/tax")
        setOpen(false)
      },
    },
    {
      id: "nav-settings",
      title: "Go to Settings & WhatsApp Portal",
      subtitle: "Profile, WhatsApp Webhooks & Ingestion Test",
      icon: "https://img.icons8.com/ios/50/settings--v1.png",
      category: "Navigation",
      action: () => {
        router.push("/settings")
        setOpen(false)
      },
    },
    {
      id: "action-print",
      title: "Print Monthly Report",
      subtitle: "Open print view for current financial report",
      icon: "https://img.icons8.com/ios/50/print.png",
      category: "Quick Actions",
      action: () => {
        router.push("/reports")
        setOpen(false)
        setTimeout(() => window.print(), 500)
      },
    },
    {
      id: "action-scan",
      title: "Scan Budget & Low Balance Alerts",
      subtitle: "Run background anomaly and alert check",
      icon: "https://img.icons8.com/ios/50/bell.png",
      category: "Quick Actions",
      action: () => {
        fetch("/api/v1/notifications/scan", { method: "POST" })
          .then(() => window.dispatchEvent(new Event("finance-data-updated")))
          .catch(() => {})
        setOpen(false)
      },
    },
  ]

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase()
    return cmd.title.toLowerCase().includes(q) || (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q))
  })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      <div
        className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border/60 flex items-center gap-3 bg-muted/20">
          <img src="https://img.icons8.com/ios/50/search--v1.png" alt="" className="w-5 h-5 dark:invert opacity-60 ml-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search page (e.g. 'Reports', 'Tax', 'Print')..."
            className="w-full bg-transparent text-sm font-medium outline-none text-foreground placeholder:text-muted-foreground"
            aria-label="Command search input"
          />
          <kbd className="px-2 py-1 bg-background border border-border rounded-lg text-[10px] font-mono text-muted-foreground font-bold">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground italic">
              No matching commands found for "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-primary/10 transition-colors text-left group border border-transparent hover:border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-muted/50 border border-border/40 group-hover:bg-primary/20 transition-colors">
                    <img src={item.icon} alt="" className="w-4 h-4 dark:invert opacity-80" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground font-medium">{item.subtitle}</p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border/40">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-border/60 bg-muted/20 text-center text-[11px] text-muted-foreground">
          Use <kbd className="px-1.5 py-0.5 bg-background border rounded font-mono">⌘ K</kbd> to toggle command palette anytime.
        </div>
      </div>
    </div>
  )
}
