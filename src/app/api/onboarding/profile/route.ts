import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { profileSchema } from "@/lib/validations/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = profileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check if profile already exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (existingProfile) {
      // Update existing profile
      await prisma.userProfile.update({
        where: { userId: session.user.id },
        data: {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          age: data.age,
          city: data.city,
          state: data.state,
          country: data.country,
          retirementAge: data.retirementAge,
          expectedLifespan: data.expectedLifespan,
          riskTolerance: data.riskTolerance,
          riskProfile: data.riskProfile,
          monthlyIncome: data.monthlyIncome,
          annualCTC: data.annualCTC,
          expectedSalaryGrowth: data.expectedSalaryGrowth,
          employmentType: data.employmentType,
          dependents: data.dependents,
          maritalStatus: data.maritalStatus,
          financialFreedomTarget: data.financialFreedomTarget,
          financialFreedomYear: data.financialFreedomYear,
          inflationAssumption: data.inflationAssumption,
        },
      })
    } else {
      // Create new profile
      await prisma.userProfile.create({
        data: {
          userId: session.user.id,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          age: data.age,
          city: data.city,
          state: data.state,
          country: data.country,
          retirementAge: data.retirementAge,
          expectedLifespan: data.expectedLifespan,
          riskTolerance: data.riskTolerance,
          riskProfile: data.riskProfile,
          monthlyIncome: data.monthlyIncome,
          annualCTC: data.annualCTC,
          expectedSalaryGrowth: data.expectedSalaryGrowth,
          employmentType: data.employmentType,
          dependents: data.dependents,
          maritalStatus: data.maritalStatus,
          financialFreedomTarget: data.financialFreedomTarget,
          financialFreedomYear: data.financialFreedomYear,
          inflationAssumption: data.inflationAssumption,
        },
      })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error("Profile save error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
