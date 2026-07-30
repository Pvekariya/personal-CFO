"use client"

import dynamic from "next/dynamic"

const AIChatbot = dynamic(() => import("@/components/shared/AIChatbot").then(mod => mod.AIChatbot), { ssr: false })
const QuickCapture = dynamic(() => import("@/components/shared/QuickCapture").then(mod => mod.QuickCapture), { ssr: false })
const KeyboardShortcuts = dynamic(() => import("@/components/shared/KeyboardShortcuts").then(mod => mod.KeyboardShortcuts), { ssr: false })
const CommandPalette = dynamic(() => import("@/components/shared/CommandPalette").then(mod => mod.CommandPalette), { ssr: false })

export function ClientOverlays() {
  return (
    <>
      <AIChatbot />
      <QuickCapture />
      <KeyboardShortcuts />
      <CommandPalette />
    </>
  )
}
