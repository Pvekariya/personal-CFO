"use server"

import { registerSchema } from "@/lib/validations/auth"
import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"
import { DEFAULT_CATEGORIES } from "@/scripts/seed-categories"
import { signIn } from "@/auth"

export async function registerAction(prevState: string | undefined, formData: FormData) {
  try {
    const data = Object.fromEntries(formData.entries())
    const parsed = registerSchema.safeParse(data)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const formErrors = parsed.error.flatten().formErrors
      const firstErrorKey = Object.keys(fieldErrors)[0]
      return (firstErrorKey && fieldErrors[firstErrorKey as keyof typeof fieldErrors]?.[0]) || 
             formErrors[0] || 
             "Validation failed"
    }

    const { firstName, lastName, password } = parsed.data
    const email = parsed.data.email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return "An account with this email already exists"

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName: lastName || null,
          passwordHash,
          role: "OWNER",
          status: "ACTIVE",
        },
      })

      const workspace = await tx.workspace.create({
        data: {
          name: `${firstName}'s Finances`,
          slug: `${firstName.toLowerCase()}-${user.id.slice(0, 8)}`,
          currency: "INR",
          timezone: "Asia/Kolkata",
        },
      })

      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: "OWNER", isActive: true },
      })

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          workspaceId: workspace.id,
          name: cat.name,
          group: cat.group,
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
          isActive: true,
        })),
      })
    })

    // Automatically sign in the user. This will natively redirect on success.
    await signIn("credentials", { email, password, redirectTo: "/onboarding/profile" })

  } catch (error: any) {
    // If it's a Next.js redirect error from signIn, let it pass through
    if (error.name === "RedirectError" || (error.message && error.message.includes("NEXT_REDIRECT"))) {
      throw error
    }
    console.error("Registration action error:", error)
    return "Something went wrong during registration."
  }
}
