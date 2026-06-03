import { z } from "zod"

export const goalTypes = [
  "EMERGENCY_FUND",
  "RETIREMENT",
  "HOME_PURCHASE",
  "VEHICLE",
  "EDUCATION",
  "MARRIAGE",
  "TRAVEL",
  "BUSINESS",
  "FINANCIAL_FREEDOM",
  "WEALTH_CREATION",
  "CUSTOM",
] as const

export const goalStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_TRACK",
  "AT_RISK",
  "BEHIND",
  "COMPLETED",
  "PAUSED",
] as const

export const goalPriorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const

export const createGoalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100),
  type: z.enum(goalTypes),
  status: z.enum(goalStatuses).default("NOT_STARTED"),
  priority: z.enum(goalPriorities).default("MEDIUM"),
  targetAmount: z.coerce.number().positive("Target amount must be greater than 0"),
  currentAmount: z.coerce.number().min(0).default(0),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED", "SGD"]).default("INR"),
  targetDate: z.string().min(1, "Target date is required"),
  inflationRate: z.coerce.number().min(0).max(30).optional(),
  expectedReturn: z.coerce.number().min(0).max(100).optional(),
  stepUpSIP: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
})

export type CreateGoalInput = z.infer<typeof createGoalSchema>

export const updateGoalSchema = createGoalSchema.partial()
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>

export const goalQuerySchema = z.object({
  type: z.enum(goalTypes).optional(),
  status: z.enum(goalStatuses).optional(),
  priority: z.enum(goalPriorities).optional(),
  search: z.string().max(100).optional(),
})
export type GoalQueryInput = z.infer<typeof goalQuerySchema>
