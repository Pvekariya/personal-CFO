import { z } from "zod"

// ─── Login ───────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})
export type LoginInput = z.infer<typeof loginSchema>

// ─── Register ────────────────────────────────────────────────
export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().max(50).optional(),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
export type RegisterInput = z.infer<typeof registerSchema>

// ─── Onboarding Profile ─────────────────────────────────────
export const profileSchema = z.object({
  dateOfBirth: z.string().optional(),
  age: z.coerce.number().int().min(16).max(120).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(10).default("IN"),
  retirementAge: z.coerce.number().int().min(30).max(100).optional(),
  expectedLifespan: z.coerce.number().int().min(50).max(120).optional(),
  riskTolerance: z.coerce.number().int().min(1).max(10).optional(),
  riskProfile: z.enum(["Conservative", "Moderate", "Aggressive"]).optional(),
  monthlyIncome: z.coerce.number().min(0).optional(),
  annualCTC: z.coerce.number().min(0).optional(),
  expectedSalaryGrowth: z.coerce.number().min(0).max(100).optional(),
  employmentType: z.string().max(50).optional(),
  dependents: z.coerce.number().int().min(0).default(0),
  maritalStatus: z.string().max(20).optional(),
  financialFreedomTarget: z.coerce.number().min(0).optional(),
  financialFreedomYear: z.coerce.number().int().min(2025).max(2100).optional(),
  inflationAssumption: z.coerce.number().min(0).max(30).default(7.0),
})
export type ProfileInput = z.infer<typeof profileSchema>
