"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type ShortcutItem = {
  keys: string[]
  description: string
  category: "Global" | "Navigation" | "Actions"
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["⌘", "Shift", "A"], description: "Quick Add Finance Entry (WhatsApp style)", category: "Actions" },
  { keys: ["?"], description: "Toggle Keyboard Shortcuts Cheat Sheet", category: "Global" },
  { keys: ["⌘", "/"], description: "Toggle Keyboard Shortcuts Cheat Sheet", category: "Global" },
  { keys: ["Esc"], description: "Close Modal or Dismiss Overlay", category: "Global" },
  { keys: ["Tab"], description: "Navigate Next Accessible Element", category: "Navigation" },
  { keys: ["Shift", "Tab"], description: "Navigate Previous Accessible Element", category: "Navigation" },
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore inside text inputs/textareas
      const target = event.target as HTMLElement
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable

      const isCmdSlash = (event.metaKey || event.ctrlKey) && event.key === "/"
      const isQuestionMark = event.key === "?" && !isInput

      if (isCmdSlash || isQuestionMark) {
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="w-full max-w-xl bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 id="shortcuts-title" className="text-xl font-extrabold tracking-tight text-foreground">
              Keyboard Shortcuts
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Navigate Personal CFO OS at lightning speed
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground text-sm font-bold"
            aria-label="Close keyboard shortcuts modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {["Actions", "Global", "Navigation"].map((cat) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat}</h3>
              <div className="space-y-2">
                {SHORTCUTS.filter((s) => s.category === cat).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm"
                  >
                    <span className="font-medium text-foreground text-xs">{item.description}</span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      {item.keys.map((k, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="px-2 py-1 bg-background border border-border rounded-lg shadow-xs text-foreground font-bold"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/60">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded border font-mono">Esc</kbd> or click anywhere outside to close.
        </div>
      </div>
    </div>
  )
}
