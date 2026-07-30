import { z } from "zod"

export const liabilityTypes = [
  "HOME_LOAN",
  "CAR_LOAN",
  "EDUCATION_LOAN",
  "PERSONAL_LOAN",
  "BUSINESS_LOAN",
  "OVERDRAFT",
  "CREDIT_CARD",
  "FAMILY_DEBT",
  "INHERITED_DEBT",
  "INFORMAL_DEBT",
  "OTHER",
] as const

export const createLiabilitySchema = z.object({
  name: z.string().min(1, "Liability name is required").max(100),
  type: z.enum(liabilityTypes),
  lender: z.string().max(100).optional(),
  principalAmount: z.coerce.number().positive("Principal amount must be greater than 0"),
  outstandingBalance: z.coerce.number().min(0, "Outstanding balance cannot be negative"),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  emiAmount: z.coerce.number().min(0).optional(),
  tenure: z.coerce.number().int().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  nextDueDate: z.string().optional(),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD", "CHF"]).default("INR"),
  isActive: z.boolean().default(true),
  isFormalAgreement: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
})

export type CreateLiabilityInput = z.infer<typeof createLiabilitySchema>

export const updateLiabilitySchema = createLiabilitySchema.partial()
export type UpdateLiabilityInput = z.infer<typeof updateLiabilitySchema>

export const liabilityQuerySchema = z.object({
  type: z.enum(liabilityTypes).optional(),
  isActive: z.string().transform(v => v === "true").optional(),
  search: z.string().max(100).optional(),
})
export type LiabilityQueryInput = z.infer<typeof liabilityQuerySchema>
