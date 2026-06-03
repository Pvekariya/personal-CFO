import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"

export async function GET(request: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let currency = "INR"
    if (session.user.workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: session.user.workspaceId }
      })
      if (workspace) currency = workspace.currency
    }

    return NextResponse.json({ data: { ...user, currency } })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // We update User details
    if (body.firstName !== undefined || body.lastName !== undefined || body.phone !== undefined || body.avatarUrl !== undefined || body.twoFactorEnabled !== undefined) {
      const userDataToUpdate: any = {}
      if (body.firstName !== undefined) userDataToUpdate.firstName = body.firstName
      if (body.lastName !== undefined) userDataToUpdate.lastName = body.lastName
      if (body.phone !== undefined) userDataToUpdate.phone = body.phone || null
      if (body.avatarUrl !== undefined) userDataToUpdate.avatarUrl = body.avatarUrl || null
      if (body.twoFactorEnabled !== undefined) userDataToUpdate.twoFactorEnabled = body.twoFactorEnabled

      if (Object.keys(userDataToUpdate).length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: userDataToUpdate,
        })
      }
    }

    // We update Profile details
    const profileUpdateData: any = {}
    const fieldsToMap = [
      "age", "city", "state", "retirementAge", 
      "riskProfile", "monthlyIncome", "annualCTC", 
      "employmentType", "dependents", "maritalStatus",
      "financialFreedomTarget", "financialFreedomYear", "inflationAssumption"
    ]

    for (const field of fieldsToMap) {
      if (body[field] !== undefined) {
        if (["age", "retirementAge", "dependents", "financialFreedomYear"].includes(field)) {
          profileUpdateData[field] = body[field] ? parseInt(body[field]) : null
        } else if (["monthlyIncome", "annualCTC", "financialFreedomTarget", "inflationAssumption"].includes(field)) {
          profileUpdateData[field] = body[field] ? parseFloat(body[field]) : null
        } else {
          profileUpdateData[field] = body[field]
        }
      }
    }

    if (body.biometricEnabled !== undefined) {
      profileUpdateData.metadata = {
        biometricEnabled: body.biometricEnabled
      }
    }

    if (Object.keys(profileUpdateData).length > 0) {
      await prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileUpdateData,
        },
        update: profileUpdateData,
      })
    }

    if (body.currency && session.user.workspaceId) {
      await prisma.workspace.update({
        where: { id: session.user.workspaceId },
        data: { currency: body.currency },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 })
  }
}
