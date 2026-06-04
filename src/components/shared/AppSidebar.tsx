"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignOutButton } from "@/components/shared/SignOutButton"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "https://img.icons8.com/ios/50/combo-chart--v1.png" },
  { label: "Accounts", href: "/accounts", icon: "https://img.icons8.com/ios/50/museum.png" },
  { label: "Transactions", href: "/transactions", icon: "https://img.icons8.com/ios/50/bank-cards.png" },
  { label: "Investments", href: "/investments", icon: "https://img.icons8.com/ios/50/line-chart.png" },
  { label: "Liabilities", href: "/liabilities", icon: "https://img.icons8.com/ios/50/debt.png" },
  { label: "Analytics", href: "/analytics", icon: "https://img.icons8.com/ios/50/pie-chart.png" },
  { label: "Net Worth", href: "/net-worth", icon: "https://img.icons8.com/ios/50/diamond--v1.png" },
  { label: "Vault", href: "/vault", icon: "https://img.icons8.com/ios/50/safe.png" },
  { label: "Tax", href: "/tax", icon: "https://img.icons8.com/ios/50/tax.png" },
  { label: "Goals", href: "/goals", icon: "https://img.icons8.com/ios/50/goal--v1.png" },
  { label: "Advice", href: "/recommendations", icon: "https://img.icons8.com/ios/50/idea.png" },
  { label: "Settings", href: "/settings", icon: "https://img.icons8.com/ios/50/settings--v1.png" },
]

export function AppSidebar({ userName, userEmail }: { userName?: string | null, userEmail?: string | null }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  // Auto collapse on mobile initially
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Auto collapse after selection (navigation)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsCollapsed(true)
    }
  }, [pathname])

  // Listen to custom toggle event from TopHeader
  useEffect(() => {
    const handleToggle = () => setIsCollapsed(prev => !prev)
    window.addEventListener("toggleSidebar", handleToggle)
    return () => window.removeEventListener("toggleSidebar", handleToggle)
  }, [])

  return (
    <>
      <aside 
        className={`
          border-r border-border bg-sidebar flex flex-col transition-all duration-300 z-20
          ${isCollapsed ? "w-16 items-center" : "w-64"}
          md:relative absolute h-full
          ${isCollapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0"}
        `}
      >
        <div className={`p-4 border-b border-border flex items-center gap-3 h-[73px] ${isCollapsed ? "justify-center px-0 w-full" : ""}`}>
          <img src="https://img.icons8.com/ios/50/wallet.png" alt="Logo" className="w-6 h-6 dark:invert shrink-0" />
          
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h2 className="font-bold text-lg text-sidebar-foreground leading-tight whitespace-nowrap">
                Personal CFO
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]">
                {userName || userEmail}
              </p>
            </div>
          )}
        </div>

        {/* Toggle Button for Desktop */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-6 bg-border rounded-full p-1 border border-background shadow-sm hover:scale-110 transition-transform z-10"
        >
          <img 
            src={isCollapsed ? "https://img.icons8.com/ios/50/forward--v1.png" : "https://img.icons8.com/ios/50/back--v1.png"} 
            alt="Toggle" 
            className="w-3 h-3 dark:invert opacity-70" 
          />
        </button>

        <nav className={`flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? "w-full" : ""}`}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-xl text-sm transition-all group relative overflow-hidden
                  ${isCollapsed ? "justify-center p-3" : "px-3 py-2.5"}
                  ${isActive 
                    ? "text-primary font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-border/50 bg-gradient-to-r from-primary/10 to-primary/5" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <img 
                  src={item.icon} 
                  alt={item.label} 
                  className={`w-5 h-5 transition-opacity dark:invert ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} 
                />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className={`p-4 border-t border-border ${isCollapsed ? "flex justify-center px-0 w-full" : ""}`}>
          {isCollapsed ? (
            <button title="Sign Out" className="opacity-70 hover:opacity-100 transition-opacity">
               <img src="https://img.icons8.com/ios/50/exit.png" alt="Sign Out" className="w-5 h-5 dark:invert" />
            </button>
          ) : (
            <SignOutButton />
          )}
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-10"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  )
}
