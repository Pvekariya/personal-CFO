"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const mobileTabs = [
  { label: "Home", href: "/dashboard", icon: "https://img.icons8.com/ios/50/combo-chart--v1.png" },
  { label: "Accounts", href: "/accounts", icon: "https://img.icons8.com/ios/50/museum.png" },
  { label: "Activity", href: "/transactions", icon: "https://img.icons8.com/ios/50/bank-cards.png" },
  { label: "Invest", href: "/investments", icon: "https://img.icons8.com/ios/50/line-chart.png" },
  { label: "Advisor", href: "/recommendations", icon: "https://img.icons8.com/ios/50/idea.png" },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-md border-t border-border/40 px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+6px)] shadow-[0_-8px_30px_rgb(0,0,0,0.12)] select-none">
      {/* Top micro border indicator line wrapper */}
      <div className="flex justify-between items-center max-w-md mx-auto relative">
        {mobileTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className="flex flex-col items-center justify-center flex-1 py-1.5 relative transition-transform duration-200 active:scale-95 group"
            >
              {/* Top border active accent line */}
              <div className={`absolute top-0 w-8 h-[2px] rounded-full transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-primary to-purple-500 opacity-100 scale-100 shadow-[0_1px_8px_rgba(var(--primary),0.6)]' : 'bg-transparent opacity-0 scale-50'}`} />

              {/* Highlight background pill */}
              <div className={`absolute inset-x-2.5 inset-y-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/10 opacity-100 scale-100' : 'bg-transparent opacity-0 scale-75'}`} />

              {/* Icon */}
              <img
                src={tab.icon}
                alt={tab.label}
                className={`w-[18px] h-[18px] mb-1 z-10 transition-all duration-300 dark:invert ${isActive ? 'opacity-100 scale-105' : 'opacity-50 group-hover:opacity-85'}`}
              />

              {/* Label */}
              <span className={`text-[9px] z-10 transition-colors font-medium tracking-tight ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground/90'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
