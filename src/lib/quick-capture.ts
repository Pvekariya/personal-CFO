import { z } from "zod"
import type { CreateTransactionInput } from "@/lib/validations/transactions"

type QuickCaptureAccount = {
  id: string
  name: string
  type: string
}

export const quickCaptureSchema = z.object({
  text: z.string().min(1, "Message text is required"),
  accountId: z.string().optional(),
  source: z.enum(["manual", "shortcut", "whatsapp"]).default("shortcut"),
})

export type QuickCaptureInput = z.infer<typeof quickCaptureSchema>

export type SplitInfo = {
  isSplit: boolean
  totalAmount: number
  perPersonShare: number
  peopleCount: number
  participants: string[]
}

export type QuickCaptureDraft = CreateTransactionInput & {
  confidence: number
  source: QuickCaptureInput["source"]
  rawText: string
  inferredAccountName?: string
  needsReview: boolean
  splitInfo?: SplitInfo
}

const datePatterns = [
  /\b(today|tod|now)\b/i,
  /\b(yesterday|yday)\b/i,
  /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
]

const typePatterns: Array<{ type: CreateTransactionInput["type"]; keywords: string[] }> = [
  { type: "INCOME", keywords: ["salary", "credited", "credit", "received", "refund", "inflow", "paid in"] },
  { type: "INVESTMENT", keywords: ["invested", "sip", "mutual fund", "stocks", "shares", "etf", "bond"] },
  { type: "LOAN_REPAYMENT", keywords: ["emi", "repayment", "repaid", "loan repayment", "installment", "installment"] },
  { type: "LOAN_DISBURSEMENT", keywords: ["loan disbursement", "disbursed"] },
  { type: "TRANSFER", keywords: ["transfer", "sent to", "moved to", "upi to", "move to"] },
  { type: "EXPENSE", keywords: ["paid", "spent", "bought", "purchase", "debit", "withdrawn", "expense"] },
]

function startOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function parseDate(text: string) {
  const normalized = text.toLowerCase()
  if (/\byesterday\b|\byday\b/.test(normalized)) {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return startOfDay(date)
  }
  if (/\btoday\b|\btod\b|\bnow\b/.test(normalized)) {
    return startOfDay(new Date())
  }

  const match = normalized.match(datePatterns[2])
  if (!match?.[1]) return startOfDay(new Date())

  const [first, second, third] = match[1].split(/[/-]/).map((value) => Number.parseInt(value, 10))
  const year = third < 100 ? 2000 + third : third
  const day = first
  const month = second - 1
  return startOfDay(new Date(year, month, day))
}

function parseAmount(text: string) {
  const withoutDates = text.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, " ")
  const currencyMatches = [...withoutDates.matchAll(/(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi)]
  const primary =
    currencyMatches[0]?.[1] ??
    [...withoutDates.matchAll(/\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/g)][0]?.[1]
  if (!primary) return null

  const parsed = Number.parseFloat(primary.replace(/,/g, ""))
  return Number.isFinite(parsed) ? Math.abs(parsed) : null
}

function inferType(text: string): CreateTransactionInput["type"] {
  const lower = text.toLowerCase()
  for (const entry of typePatterns) {
    if (entry.keywords.some((keyword) => lower.includes(keyword))) {
      return entry.type
    }
  }
  return "EXPENSE"
}

function inferAccountId(text: string, accounts: QuickCaptureAccount[], preferredAccountId?: string) {
  if (preferredAccountId && accounts.some((account) => account.id === preferredAccountId)) {
    return {
      accountId: preferredAccountId,
      inferredAccountName: accounts.find((account) => account.id === preferredAccountId)?.name,
    }
  }

  const lower = text.toLowerCase()
  const match = accounts.find((account) => lower.includes(account.name.toLowerCase()))
  if (match) {
    return { accountId: match.id, inferredAccountName: match.name }
  }

  const firstAccount = accounts[0]
  return firstAccount ? { accountId: firstAccount.id, inferredAccountName: firstAccount.name } : { accountId: undefined }
}

function inferDescription(text: string) {
  const cleaned = text
    .replace(/(?:₹|rs\.?|inr)?\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?/gi, " ")
    .replace(/\b(today|tod|now|yesterday|yday)\b/gi, " ")
    .replace(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g, " ")
    .replace(/\b(from|to|at|via)\s+[A-Za-z0-9&().-]+(?:\s+[A-Za-z0-9&().-]+){0,3}/gi, " ")
    .replace(/\b(paid|spent|bought|received|credited|debit|transfer|sent|invested|emi|repaid|withdrawn)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned.length > 0 ? cleaned : text.trim()
}

function parseSplitInfo(text: string, amount: number | null): SplitInfo | undefined {
  if (!amount || amount <= 0) return undefined

  const lower = text.toLowerCase()
  if (!lower.includes("split")) return undefined

  // 1. Check for "split X ways" or "split between X"
  const waysMatch = lower.match(/split\s+(?:between\s+)?(\d+)\s*(?:ways|people|persons|members)?/i)
  if (waysMatch?.[1]) {
    const peopleCount = parseInt(waysMatch[1], 10)
    if (peopleCount > 1) {
      return {
        isSplit: true,
        totalAmount: amount,
        perPersonShare: Math.round((amount / peopleCount) * 100) / 100,
        peopleCount,
        participants: [],
      }
    }
  }

  // 2. Check for "split with Name1, Name2"
  const withMatch = text.match(/split\s+(?:with|among|between)\s+([A-Za-z0-9\s,&#]+)/i)
  if (withMatch?.[1]) {
    const rawNames = withMatch[1]
      .split(/[,&]|\band\b/i)
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && !/^(today|yesterday|hdfc|icici|sbi|axis|cash)$/i.test(n))

    if (rawNames.length > 0) {
      const peopleCount = rawNames.length + 1 // including user
      return {
        isSplit: true,
        totalAmount: amount,
        perPersonShare: Math.round((amount / peopleCount) * 100) / 100,
        peopleCount,
        participants: rawNames,
      }
    }
  }

  return undefined
}

export function parseQuickCaptureText(
  text: string,
  accounts: QuickCaptureAccount[],
  preferredAccountId?: string,
  source: QuickCaptureInput["source"] = "shortcut"
): QuickCaptureDraft {
  const amount = parseAmount(text)
  const type = inferType(text)
  const date = parseDate(text)
  const accountMatch = inferAccountId(text, accounts, preferredAccountId)
  const description = inferDescription(text)
  const splitInfo = parseSplitInfo(text, amount)

  const confidence = [
    amount !== null,
    Boolean(accountMatch.accountId),
    Boolean(description),
    Boolean(text.trim()),
  ].filter(Boolean).length / 4

  return {
    accountId: accountMatch.accountId ?? "",
    type,
    amount: amount ?? 0,
    currency: "INR",
    description,
    date: date.toISOString(),
    tags: [],
    isRecurring: false,
    source,
    rawText: text,
    confidence,
    needsReview: !amount || !accountMatch.accountId,
    inferredAccountName: accountMatch.inferredAccountName,
    splitInfo,
  }
}
