import { z } from "zod"

// ─── Transaction Schemas ─────────────────────────────────────

export const transactionTypes = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "INVESTMENT",
  "LOAN_REPAYMENT",
  "LOAN_DISBURSEMENT",
] as const

export const transactionStatuses = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "RECONCILED",
] as const

export const createTransactionSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().optional(),
  type: z.enum(transactionTypes),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD", "CHF"]).default("INR"),
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  merchant: z.string().max(200).optional(),
  reference: z.string().max(100).optional(),
  date: z.string().min(1, "Date is required"), // ISO date string
  tags: z.array(z.string().max(50)).max(10).default([]),
  isRecurring: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

export const updateTransactionSchema = createTransactionSchema.partial()
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

export const transactionQuerySchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(transactionTypes).optional(),
  status: z.enum(transactionStatuses).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().max(100).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["date", "amount", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>
