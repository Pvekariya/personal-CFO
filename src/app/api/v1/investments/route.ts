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
    const [assets, workspace] = await Promise.all([
      prisma.asset.findMany({
        where: { workspaceId },
        orderBy: { currentValue: "desc" },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { currency: true },
      })
    ])

    const baseCurrency = workspace?.currency || "INR"

    const assetsWithConversion = await Promise.all(
      assets.map(async (asset) => {
        const convertedCurrentValue = await convertCurrency(
          Number(asset.currentValue),
          asset.currency,
          baseCurrency
        )
        const convertedInvestedAmount = await convertCurrency(
          Number(asset.investedAmount),
          asset.currency,
          baseCurrency
        )
        return {
          ...asset,
          convertedCurrentValue: convertedCurrentValue.toString(),
          convertedInvestedAmount: convertedInvestedAmount.toString(),
        }
      })
    )

    return NextResponse.json({ data: assetsWithConversion })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 })
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
    const { name, class: assetClass, type, investedAmount, currentValue, expectedReturn, platform, notes, currency } = body

    const asset = await prisma.asset.create({
      data: {
        workspaceId,
        name,
        class: assetClass,
        type,
        investedAmount: Number(investedAmount),
        currentValue: Number(currentValue),
        expectedReturn: expectedReturn ? Number(expectedReturn) : null,
        platform,
        notes,
        currency,
      },
    })

    return NextResponse.json({ data: asset })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create investment" }, { status: 500 })
  }
}
