"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"

export function WhatsAppIntegrationPortal() {
  const [testText, setTestText] = useState('Paid ₹600 for movie split with Rahul')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/webhooks/whatsapp`
    : "/api/v1/webhooks/whatsapp"

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRunTest(e: React.FormEvent) {
    e.preventDefault()
    if (!testText.trim() || testing) return

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch("/api/v1/quick-capture/test-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText }),
      })
      const json = await res.json()
      setTestResult(json)
      if (res.ok) {
        window.dispatchEvent(new Event("finance-data-updated"))
      }
    } catch (err) {
      setTestResult({ error: "Failed to connect to WhatsApp ingestion endpoint" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-card rounded-3xl border border-border/70 p-6 md:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
            <img src="https://img.icons8.com/color/48/whatsapp.png" alt="WhatsApp" className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">WhatsApp & Ingestion Portal</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Log transactions directly from WhatsApp messages or shortcuts with zero friction
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
          Webhook Active
        </span>
      </div>

      {/* Webhook Connection Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Your WhatsApp Webhook Endpoint</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground outline-none select-all"
            />
            <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 rounded-xl font-semibold">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Verify Token / Secret</p>
          <input
            type="text"
            readOnly
            value="personal-cfo-whatsapp-secret"
            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground outline-none select-all"
          />
        </div>
      </div>

      {/* Live Interactive Ingestion Tester */}
      <form onSubmit={handleRunTest} className="space-y-4 pt-2">
        <div className="space-y-2">
          <label htmlFor="whatsapp-test-input" className="text-sm font-bold text-foreground flex items-center justify-between">
            <span>Test Ingestion Engine</span>
            <span className="text-xs text-muted-foreground font-normal">Supports standard text & Splitwise syntax</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="whatsapp-test-input"
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder='Try: "Paid ₹1200 for dinner split with Rahul and Aman"'
              className="flex-1 h-11 rounded-2xl border border-input bg-background px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit" disabled={testing || !testText.trim()} className="h-11 rounded-2xl font-bold px-6">
              {testing ? "Testing..." : "Simulate Message"}
            </Button>
          </div>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-300 ${testResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
            <div className="flex justify-between items-center font-bold">
              <span>{testResult.success ? "✅ Ingestion Succeeded" : "❌ Ingestion Result"}</span>
              {testResult.data?.transaction && (
                <span>₹{Number(testResult.data.transaction.amount).toLocaleString("en-IN")}</span>
              )}
            </div>
            <p className="leading-relaxed">{testResult.message || testResult.error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
