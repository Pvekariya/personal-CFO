"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

type Notification = {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export function TopHeader({ user, title, subtitle, icon }: { user: any, title?: string, subtitle?: string, icon?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch notifications
    fetch("/api/v1/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setNotifications(json.data)
      })
      .catch((e) => console.error(e))
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  async function markAsRead() {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length === 0) return

    setNotifications(notifications.map(n => ({ ...n, isRead: true })))
    await fetch("/api/v1/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds })
    })
  }

  function toggleDropdown() {
    setShowDropdown(!showDropdown)
    if (!showDropdown && unreadCount > 0) {
      markAsRead()
    }
  }

  const initials = user?.name 
    ? user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U"

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Mobile Branding & Hamburger */}
      <div className="md:hidden flex items-center justify-between w-full border-b border-border/50 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => window.dispatchEvent(new Event("toggleSidebar"))} className="p-1 -ml-2 rounded-lg hover:bg-secondary">
            <img src="https://img.icons8.com/ios/50/menu--v1.png" alt="Menu" className="w-5 h-5 dark:invert opacity-70" />
          </button>
          <div className="flex items-center gap-2">
            <img src="https://img.icons8.com/ios/50/wallet.png" alt="Logo" className="w-5 h-5 dark:invert shrink-0" />
            <h2 className="font-bold text-base tracking-tight truncate">Personal CFO</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {/* Mobile Notifications & Profile */}
           <div className="relative" ref={dropdownRef}>
             <button onClick={toggleDropdown} className="relative p-2 rounded-full hover:bg-secondary transition-colors">
               <img src="https://img.icons8.com/ios/50/bell.png" alt="Notifications" className="w-5 h-5 dark:invert opacity-80" />
               {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-background" />}
             </button>
             {showDropdown && (
               <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 p-2">
                 {/* Mobile Notifications dropdown identical to desktop */}
                 <div className="p-3 border-b border-border mb-2 flex justify-between items-center">
                   <h3 className="font-semibold text-sm">Notifications</h3>
                   {unreadCount > 0 && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
                 </div>
                 {notifications.length === 0 ? (
                   <div className="p-4 text-center text-sm text-muted-foreground">You have no notifications.</div>
                 ) : (
                   <div className="space-y-1">
                     {notifications.map((notif) => (
                       <div key={notif.id} className={`p-3 rounded-lg text-sm ${notif.isRead ? 'opacity-70 hover:bg-secondary/50' : 'bg-primary/5 hover:bg-primary/10'} transition-colors`}>
                         <div className="font-medium">{notif.title}</div>
                         <div className="text-xs text-muted-foreground mt-1 leading-snug">{notif.body}</div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}
           </div>
           <Link href="/settings">
             <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer hover:shadow-lg transition-all border border-background ring-2 ring-primary/20 overflow-hidden">
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
      <div>
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/10 shadow-sm">
              <img src={icon} alt="Icon" className="w-7 h-7 dark:invert" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-muted-foreground font-medium text-sm mt-1.5 ml-1">
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="hidden md:flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={toggleDropdown}
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <img src="https://img.icons8.com/ios/50/bell.png" alt="Notifications" className="w-5 h-5 dark:invert opacity-80" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-background" />
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 p-2">
              <div className="p-3 border-b border-border mb-2 flex justify-between items-center">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  You have no notifications.
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-3 rounded-lg text-sm ${notif.isRead ? 'opacity-70 hover:bg-secondary/50' : 'bg-primary/5 hover:bg-primary/10'} transition-colors`}
                    >
                      <div className="font-medium">{notif.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 leading-snug">{notif.body}</div>
                      <div className="text-[10px] text-muted-foreground/60 mt-2">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <Link href="/settings">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-pointer hover:shadow-lg transition-all hover:scale-105 border border-background ring-2 ring-primary/20 overflow-hidden">
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
