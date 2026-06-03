import { z } from "zod"

export const createBudgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Budget name is required").max(100),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD"]).default("INR"),
  period: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  alertAt: z.coerce.number().min(1).max(100).default(80),
  isActive: z.boolean().default(true),
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>

export const updateBudgetSchema = createBudgetSchema.partial()
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>

export const budgetQuerySchema = z.object({
  categoryId: z.string().optional(),
  period: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]).optional(),
  isActive: z.string().transform(v => v === "true").optional(),
  search: z.string().max(100).optional(),
})
export type BudgetQueryInput = z.infer<typeof budgetQuerySchema>
