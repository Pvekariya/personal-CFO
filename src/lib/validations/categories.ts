import { z } from "zod"

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  group: z.enum(["NEED", "WANT", "FUN", "HOME", "INVESTMENT"]),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export const updateCategorySchema = createCategorySchema.partial()
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

export const categoryQuerySchema = z.object({
  group: z.enum(["NEED", "WANT", "FUN", "HOME", "INVESTMENT"]).optional(),
  isActive: z.string().transform(v => v === "true").optional(),
  search: z.string().max(100).optional(),
  parentId: z.string().optional(),
})
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>
