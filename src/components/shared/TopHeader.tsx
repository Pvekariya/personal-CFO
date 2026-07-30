"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

type Notification = {
  id: string
  title: string
  message?: string
  body?: string
  type: string
  isRead: boolean
  createdAt: string
}

export function TopHeader({
  user,
  title,
  subtitle,
  icon,
  children,
}: {
  user?: any
  title?: string
  subtitle?: string
  icon?: string
  children?: React.ReactNode
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [filter, setFilter] = useState<"ALL" | "ALERTS" | "INSIGHTS">("ALL")
  const [scanning, setScanning] = useState(false)

  // Use separate refs to avoid multi-viewport click conflicts
  const mobileDropdownRef = useRef<HTMLDivElement>(null)
  const desktopDropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = () => {
    fetch("/api/v1/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setNotifications(json.data)
      })
      .catch((e) => console.error("Error fetching notifications:", e))
  }

  useEffect(() => {
    let active = true
    fetch("/api/v1/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (active && json.data) setNotifications(json.data)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const inMobile = mobileDropdownRef.current?.contains(target)
      const inDesktop = desktopDropdownRef.current?.contains(target)
      if (!inMobile && !inDesktop) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function markAsRead() {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id)
    if (unreadIds.length === 0) return

    setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
    await fetch("/api/v1/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    })
  }

  async function triggerManualScan() {
    setScanning(true)
    try {
      await fetch("/api/v1/notifications/scan", { method: "POST" })
      await fetchNotifications()
    } finally {
      setScanning(false)
    }
  }

  function toggleDropdown() {
    const nextState = !showDropdown
    setShowDropdown(nextState)
    if (nextState && unreadCount > 0) {
      markAsRead()
    }
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U"

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "ALERTS") return n.type === "BUDGET_BREACH" || n.type === "TRANSACTION_ALERT"
    if (filter === "INSIGHTS") return n.type === "AI_INSIGHT" || n.type === "GOAL_MILESTONE"
    return true
  })

  // Shared notification list panel layout
  const renderDropdownPanel = () => {
    if (!showDropdown) return null

    return (
      <div
        className="absolute right-0 mt-3 w-80 sm:w-88 max-h-[460px] flex flex-col bg-card border border-border/85 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-label="Notifications Panel"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={triggerManualScan}
            disabled={scanning}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan Alerts"}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-border/60 bg-muted/10 p-1 gap-1">
          {(["ALL", "ALERTS", "INSIGHTS"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground italic">
              No {filter.toLowerCase()} notifications.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl text-sm transition-all ${
                  notif.isRead
                    ? "opacity-70 hover:bg-secondary/40 border border-transparent"
                    : "bg-primary/5 hover:bg-primary/10 border border-primary/20"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-xs text-foreground">{notif.title}</div>
                  <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {notif.message || notif.body}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 w-full animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between w-full border-b border-border/50 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new Event("toggleSidebar"))}
            className="p-1 -ml-2 rounded-lg hover:bg-secondary"
            aria-label="Toggle navigation menu"
          >
            <img src="https://img.icons8.com/ios/50/menu--v1.png" alt="" className="w-5 h-5 dark:invert opacity-70" />
          </button>
          <div className="flex items-center gap-2">
            <img src="https://img.icons8.com/ios/50/wallet.png" alt="Logo" className="w-5 h-5 dark:invert shrink-0" />
            <h2 className="font-bold text-base tracking-tight truncate">Personal CFO</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={mobileDropdownRef}>
            <button
              onClick={toggleDropdown}
              className="relative p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label={`Notifications tray (${unreadCount} unread)`}
              aria-expanded={showDropdown}
            >
              <img src="https://img.icons8.com/ios/50/bell.png" alt="" className="w-5 h-5 dark:invert opacity-80" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-background" />
              )}
            </button>
            {renderDropdownPanel()}
          </div>
          <Link href="/settings" aria-label="Go to settings">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md border border-background ring-2 ring-primary/20 overflow-hidden">
              {user?.image ? (
                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Desktop Heading & Subtitle */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 shadow-inner">
              <img src={icon} alt="" className="w-6 h-6 dark:invert drop-shadow-md" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground drop-shadow-sm">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-muted-foreground font-medium text-sm mt-1.5 ml-1 opacity-80">{subtitle}</p>
        )}
      </div>

      <div className="hidden md:flex items-center gap-3">
        {children && <div className="flex items-center gap-3 mr-2">{children}</div>}

        {/* Desktop Notifications Dropdown */}
        <div className="relative" ref={desktopDropdownRef}>
          <button
            onClick={toggleDropdown}
            className="relative p-2.5 rounded-full bg-secondary/40 hover:bg-secondary transition-colors border border-border/50"
            aria-label={`Notifications tray (${unreadCount} unread)`}
            aria-expanded={showDropdown}
          >
            <img src="https://img.icons8.com/ios/50/bell.png" alt="" className="w-5 h-5 dark:invert opacity-80" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background animate-pulse" />
            )}
          </button>
          {renderDropdownPanel()}
        </div>

        {/* Profile Avatar */}
        <Link href="/settings" aria-label="Settings profile">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer hover:shadow-lg transition-all hover:scale-105 border border-background ring-2 ring-primary/20 overflow-hidden">
            {user?.image ? (
              <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
        </Link>
      </div>
    </div>
  )
}
