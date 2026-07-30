import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { convertCurrency } from "@/lib/currency"

export async function POST(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Fetch current balances
    const [accounts, assets, liabilities, workspace] = await Promise.all([
      prisma.account.findMany({
        where: { workspaceId, isActive: true },
      }),
      prisma.asset.findMany({
        where: { workspaceId, isActive: true },
      }),
      prisma.liability.findMany({
        where: { workspaceId, isActive: true },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { currency: true },
      })
    ])

    const baseCurrency = workspace?.currency || "INR"

    // 2. Aggregate Data
    let totalAssets = 0
    let totalLiabilities = 0
    let cash = 0
    const breakdown: Record<string, number> = { cash: 0, loans: 0 }

    for (const a of accounts) {
      const bal = await convertCurrency(Number(a.balance), a.currency, baseCurrency)
      totalAssets += bal
      cash += bal
    }
    breakdown.cash = cash

    for (const a of assets) {
      const val = await convertCurrency(Number(a.currentValue), a.currency, baseCurrency)
      totalAssets += val
      
      const typeKey = a.type.toLowerCase()
      if (!breakdown[typeKey]) breakdown[typeKey] = 0
      breakdown[typeKey] += val
    }

    for (const l of liabilities) {
      const val = await convertCurrency(Number(l.outstandingBalance), l.currency, baseCurrency)
      totalLiabilities += val
      breakdown.loans += val
    }

    const netWorth = totalAssets - totalLiabilities

    // 3. Create Snapshot
    const snapshot = await prisma.netWorthSnapshot.create({
      data: {
        workspaceId,
        totalAssets,
        totalLiabilities,
        netWorth,
        breakdown,
        snapshotDate: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: snapshot })
  } catch (error) {
    console.error("Capture net worth error:", error)
    return NextResponse.json({ error: "Failed to capture snapshot" }, { status: 500 })
  }
}
