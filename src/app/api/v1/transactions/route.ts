import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/response"
import {
  createTransactionSchema,
  transactionQuerySchema,
} from "@/lib/validations/transactions"
import type { Prisma } from "@/generated/prisma/client"
import { createTransactionInWorkspace } from "@/lib/transactions/create-transaction"

// GET /api/v1/transactions — List transactions with filters, pagination, sorting
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { workspaceId } = authResult

  const searchParams = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = transactionQuerySchema.safeParse(searchParams)

  if (!parsed.success) {
    return apiError("Invalid query parameters", 400, parsed.error.flatten())
  }

  const query = parsed.data

  const where: Prisma.TransactionWhereInput = {
    account: { workspaceId },
    deletedAt: null,
  }

  if (query.accountId) where.accountId = query.accountId
  if (query.categoryId) where.categoryId = query.categoryId
  if (query.type) where.type = query.type
  if (query.status) where.status = query.status
  if (query.startDate || query.endDate) {
    where.date = {}
    if (query.startDate) where.date.gte = new Date(query.startDate)
    if (query.endDate) where.date.lte = new Date(query.endDate)
  }
  if (query.minAmount || query.maxAmount) {
    where.amount = {}
    if (query.minAmount) where.amount.gte = query.minAmount
    if (query.maxAmount) where.amount.lte = query.maxAmount
  }
  if (query.search) {
    where.OR = [
      { description: { contains: query.search, mode: "insensitive" } },
      { merchant: { contains: query.search, mode: "insensitive" } },
      { notes: { contains: query.search, mode: "insensitive" } },
    ]
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, group: true, color: true, icon: true } },
      },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return apiPaginated(transactions, total, query.page, query.limit)
}

// POST /api/v1/transactions — Create a new transaction
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { workspaceId } = authResult

  try {
    const body = await request.json()
    const parsed = createTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten())
    }

    const transaction = await prisma.$transaction(async (tx) => {
      return createTransactionInWorkspace(tx, workspaceId, parsed.data)
    })

    return apiSuccess(transaction)
  } catch (error) {
    console.error("Create transaction error:", error)
    return apiError("Failed to create transaction", 500)
  }
}
