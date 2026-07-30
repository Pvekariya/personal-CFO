import { z } from "zod"

// ─── Account Schemas ─────────────────────────────────────────

export const accountTypes = [
  "SAVINGS",
  "CURRENT",
  "SALARY",
  "FIXED_DEPOSIT",
  "PPF",
  "EPF",
  "NPS",
  "WALLET",
  "CRYPTO_WALLET",
  "BUSINESS_CURRENT",
  "BUSINESS_SAVINGS",
  "BUSINESS_OD",
] as const

export const currencyCodes = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "CHF",
] as const

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  type: z.enum(accountTypes),
  bankName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional().or(z.literal("")),
  ifscCode: z.string().max(20).optional().or(z.literal("")),
  upiId: z.string().max(100).optional().or(z.literal("")),
  balance: z.coerce.number().default(0),
  currency: z.enum(currencyCodes).default("INR"),
  isDefault: z.boolean().default(false),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
})
export type CreateAccountInput = z.infer<typeof createAccountSchema>

export const updateAccountSchema = createAccountSchema.partial()
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>

export const accountQuerySchema = z.object({
  type: z.enum(accountTypes).optional(),
  isActive: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  search: z.string().max(100).optional(),
})
