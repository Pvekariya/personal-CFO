"use server"

import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"
import { signIn } from "@/auth"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"

export async function registerAction(_prevState: string | undefined, formData: FormData) {
  const firstName = (formData.get("firstName") as string)?.trim()
  const lastName = (formData.get("lastName") as string)?.trim() || null
  const email = (formData.get("email") as string)?.toLowerCase().trim()
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  // Validation
  if (!firstName || firstName.length < 1) return "First name is required."
  if (!email) return "Email is required."
  if (!password || password.length < 8) return "Password must be at least 8 characters."
  if (password !== confirmPassword) return "Passwords don't match."

  try {
    // Check for existing user
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return "An account with this email already exists."

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user, workspace, membership, and categories in a single transaction
    await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
          role: "OWNER",
          status: "ACTIVE",
        },
      })

      const workspace = await tx.workspace.create({
        data: {
          name: firstName + "'s Finances",
          slug: firstName.toLowerCase() + "-" + user.id.slice(0, 8),
          currency: "INR",
          timezone: "Asia/Kolkata",
        },
      })

      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: "OWNER", isActive: true },
      })

      // Seed default categories
      const { DEFAULT_CATEGORIES } = await import("@/scripts/seed-categories")
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat: any) => ({
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

    // Auto sign-in after successful registration
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/dashboard",
    })

    if (result?.error) {
      return "Account created successfully, but auto-login failed. Please sign in."
    }

    redirect("/dashboard")
  } catch (error: any) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    return "Something went wrong during registration. Please try again."
  }
}
