import { z } from "zod"

export const assetClasses = [
  "EQUITY",
  "DEBT",
  "GOLD",
  "SILVER",
  "REAL_ESTATE",
  "CRYPTO",
  "COMMODITY",
  "CASH_EQUIVALENT",
  "INTERNATIONAL",
  "ALTERNATIVE",
] as const

export const assetTypes = [
  "MUTUAL_FUND",
  "DIRECT_STOCK",
  "ETF",
  "INDEX_FUND",
  "GOLD_PHYSICAL",
  "GOLD_DIGITAL",
  "SOVEREIGN_GOLD_BOND",
  "FIXED_DEPOSIT",
  "PPF",
  "EPF",
  "NPS",
  "BOND",
  "REAL_ESTATE",
  "CRYPTO",
  "SILVER",
  "REIT",
  "INVIT",
  "US_STOCKS",
  "OTHER",
] as const

export const createAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(100),
  class: z.enum(assetClasses),
  type: z.enum(assetTypes),
  symbol: z.string().max(50).optional(),
  isin: z.string().max(50).optional(),
  units: z.coerce.number().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  currentPrice: z.coerce.number().min(0).optional(),
  currentValue: z.coerce.number().min(0, "Current value cannot be negative"),
  investedAmount: z.coerce.number().min(0, "Invested amount cannot be negative"),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD", "CHF"]).default("INR"),
  purchaseDate: z.string().optional(),
  maturityDate: z.string().optional(),
  expectedReturn: z.coerce.number().min(0).max(100).optional(),
  platform: z.string().max(100).optional(),
  folioNumber: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
  goalId: z.string().optional(),
})

export type CreateAssetInput = z.infer<typeof createAssetSchema>

export const updateAssetSchema = createAssetSchema.partial()
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>

export const assetQuerySchema = z.object({
  class: z.enum(assetClasses).optional(),
  type: z.enum(assetTypes).optional(),
  isActive: z.string().transform(v => v === "true").optional(),
  search: z.string().max(100).optional(),
  goalId: z.string().optional(),
})
export type AssetQueryInput = z.infer<typeof assetQuerySchema>
