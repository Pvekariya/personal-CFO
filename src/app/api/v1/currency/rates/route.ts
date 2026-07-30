import { NextRequest, NextResponse } from "next/server"
import { getExchangeRates } from "@/lib/currency"

export async function GET(request: NextRequest) {
  const base = request.nextUrl.searchParams.get("base") || "USD"
  try {
    const rates = await getExchangeRates(base)
    return NextResponse.json({ success: true, rates })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
