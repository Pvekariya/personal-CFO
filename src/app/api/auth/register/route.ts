import { prisma } from "@/lib/db/client"
import { registerSchema } from "@/lib/validations/auth"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { DEFAULT_CATEGORIES } from "@/scripts/seed-categories"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const formErrors = parsed.error.flatten().formErrors
      const firstErrorKey = Object.keys(fieldErrors)[0]
      const firstErrorMessage = 
        (firstErrorKey && fieldErrors[firstErrorKey as keyof typeof fieldErrors]?.[0]) || 
        formErrors[0] || 
        "Validation failed"

      return NextResponse.json(
        { error: firstErrorMessage, details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { firstName, lastName, password } = parsed.data
    const email = parsed.data.email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user + workspace in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
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

      // Create default workspace
      const workspace = await tx.workspace.create({
        data: {
          name: `${firstName}'s Finances`,
          slug: `${firstName.toLowerCase()}-${user.id.slice(0, 8)}`,
          currency: "INR",
          timezone: "Asia/Kolkata",
        },
      })

      // Link user to workspace
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
          isActive: true,
        },
      })

      // Seed default categories
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

      return { user, workspace }
    })

    return NextResponse.json(
      {
        data: {
          id: result.user.id,
          email: result.user.email,
          workspaceId: result.workspace.id,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
