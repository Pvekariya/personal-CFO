import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { convertCurrency } from "@/lib/currency"

export async function GET(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [liabilities, workspace] = await Promise.all([
      prisma.liability.findMany({
        where: { workspaceId },
        orderBy: { outstandingBalance: "desc" },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { currency: true },
      })
    ])

    const baseCurrency = workspace?.currency || "INR"

    const liabilitiesWithConversion = await Promise.all(
      liabilities.map(async (liability) => {
        const convertedOutstandingBalance = await convertCurrency(
          Number(liability.outstandingBalance),
          liability.currency,
          baseCurrency
        )
        return {
          ...liability,
          convertedOutstandingBalance: convertedOutstandingBalance.toString(),
        }
      })
    )

    return NextResponse.json({ data: liabilitiesWithConversion })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch liabilities" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, type, lender, principalAmount, outstandingBalance, interestRate, emiAmount, tenure, notes, currency } = body

    const liability = await prisma.liability.create({
      data: {
        workspaceId,
        name,
        type,
        lender,
        principalAmount: Number(principalAmount),
        outstandingBalance: Number(outstandingBalance),
        interestRate: interestRate ? Number(interestRate) : null,
        emiAmount: emiAmount ? Number(emiAmount) : null,
        tenure: tenure ? parseInt(tenure) : null,
        notes,
        currency,
      },
    })

    return NextResponse.json({ data: liability })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create liability" }, { status: 500 })
  }
}
