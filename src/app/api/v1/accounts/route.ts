import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess, apiError } from "@/lib/api/response"
import {
  createAccountSchema,
  accountQuerySchema,
} from "@/lib/validations/accounts"
import { convertCurrency } from "@/lib/currency"

// GET /api/v1/accounts — List accounts for workspace
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { workspaceId } = authResult

  const searchParams = Object.fromEntries(request.nextUrl.searchParams)
  const query = accountQuerySchema.safeParse(searchParams)

  const where: Record<string, unknown> = {
    workspaceId,
    deletedAt: null,
  }

  if (query.success) {
    if (query.data.type) where.type = query.data.type
    if (query.data.isActive !== undefined) where.isActive = query.data.isActive
    if (query.data.search) {
      where.OR = [
        { name: { contains: query.data.search, mode: "insensitive" } },
        { bankName: { contains: query.data.search, mode: "insensitive" } },
      ]
    }
  }

  const [accounts, workspace] = await Promise.all([
    prisma.account.findMany({
      where: where as any,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { currency: true },
    })
  ])

  const baseCurrency = workspace?.currency || "INR"

  const accountsWithConversion = await Promise.all(
    accounts.map(async (account) => {
      const convertedBalance = await convertCurrency(
        Number(account.balance),
        account.currency,
        baseCurrency
      )
      return {
        ...account,
        convertedBalance: convertedBalance.toString(),
      }
    })
  )

  return apiSuccess(accountsWithConversion)
}

// POST /api/v1/accounts — Create a new account
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { workspaceId } = authResult

  try {
    const body = await request.json()
    const parsed = createAccountSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten())
    }

    const data = parsed.data

    // If this is the first account or marked as default, ensure only one default
    if (data.isDefault) {
      await prisma.account.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const account = await prisma.account.create({
      data: {
        workspaceId,
        name: data.name,
        type: data.type,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode || null,
        upiId: data.upiId || null,
        balance: data.balance,
        currency: data.currency,
        isDefault: data.isDefault,
        color: data.color,
        icon: data.icon,
        notes: data.notes,
      },
    })

    // Record initial balance snapshot
    if (data.balance > 0) {
      await prisma.accountBalance.create({
        data: {
          accountId: account.id,
          balance: data.balance,
        },
      })
    }

    return apiSuccess(account)
  } catch (error) {
    console.error("Create account error:", error)
    return apiError("Failed to create account", 500)
  }
}
