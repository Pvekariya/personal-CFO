import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/response"
import {
  createTransactionSchema,
  transactionQuerySchema,
} from "@/lib/validations/transactions"
import type { Prisma } from "@/generated/prisma/client"

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

    const data = parsed.data

    // Verify account belongs to workspace
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, workspaceId, deletedAt: null },
    })

    if (!account) {
      return apiError("Account not found", 404)
    }

    // Verify category if provided
    let finalCategoryId = data.categoryId || null;
    
    if (finalCategoryId) {
      const category = await prisma.category.findFirst({
        where: { id: finalCategoryId, workspaceId },
      })
      if (!category) {
        return apiError("Category not found", 404)
      }
    } else if (data.merchant || data.description) {
      // 🧠 Smart Auto-Categorization Engine
      const searchString = (data.merchant || data.description || "").toLowerCase()
      
      // Attempt 1: Learn from past transactions (Historical matching)
      const pastTxn = await prisma.transaction.findFirst({
        where: {
          workspaceId,
          categoryId: { not: null },
          OR: [
            ...(data.merchant ? [{ merchant: { equals: data.merchant, mode: "insensitive" as const } }] : []),
            ...(data.description ? [{ description: { equals: data.description, mode: "insensitive" as const } }] : []),
          ]
        },
        orderBy: { date: "desc" }
      })

      if (pastTxn?.categoryId) {
        finalCategoryId = pastTxn.categoryId
      } else {
        // Attempt 2: Keyword Heuristics
        const rules: Record<string, string> = {
          "uber": "Transport", "ola": "Transport", "flight": "Travel", "irctc": "Travel",
          "swiggy": "Dining", "zomato": "Dining", "restaurant": "Dining", "starbucks": "Dining",
          "amazon": "Shopping", "flipkart": "Shopping", "myntra": "Shopping",
          "netflix": "Entertainment", "spotify": "Entertainment", "movie": "Entertainment", "bookmyshow": "Entertainment",
          "salary": "Salary", "payroll": "Salary", "bonus": "Salary",
          "d-mart": "Groceries", "blinkit": "Groceries", "zepto": "Groceries", "instamart": "Groceries", "bigbasket": "Groceries",
          "pharmacy": "Health", "apollo": "Health", "hospital": "Health"
        }

        for (const [keyword, catName] of Object.entries(rules)) {
          if (searchString.includes(keyword)) {
            const cat = await prisma.category.findFirst({
              where: { workspaceId, name: { equals: catName, mode: "insensitive" } }
            })
            if (cat) {
              finalCategoryId = cat.id
              break
            }
          }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transaction = await prisma.$transaction(async (tx: any) => {
      // Create transaction
      const txn = await tx.transaction.create({
        data: {
          workspaceId,
          accountId: data.accountId,
          categoryId: finalCategoryId,
          type: data.type,
          status: "COMPLETED",
          amount: data.amount,
          currency: data.currency,
          amountInBaseCurrency: data.amount, // Same for now (INR)
          description: data.description,
          notes: data.notes,
          merchant: data.merchant,
          reference: data.reference,
          date: new Date(data.date),
          tags: data.tags,
          isRecurring: data.isRecurring,
          metadata: data.metadata || null,
        },
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: {
            select: {
              id: true,
              name: true,
              group: true,
              color: true,
              icon: true,
            },
          },
        },
      })

      // Update account balance
      const balanceChange =
        data.type === "INCOME" || data.type === "LOAN_DISBURSEMENT"
          ? data.amount
          : -data.amount

      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: { increment: balanceChange },
        },
      })

      // Sync with Investments (Asset)
      if (data.type === "INVESTMENT" && data.metadata?.linkedAssetId) {
        await tx.asset.update({
          where: { id: data.metadata.linkedAssetId },
          data: {
            investedAmount: { increment: data.amount },
            currentValue: { increment: data.amount }, // Optimistic assumption
          }
        })
        await tx.assetTransaction.create({
          data: {
            assetId: data.metadata.linkedAssetId,
            type: "BUY",
            amount: data.amount,
            date: new Date(data.date),
            notes: data.description,
          }
        })
      }

      // Sync with Liabilities (Loan Repayment)
      if (data.type === "LOAN_REPAYMENT" && data.metadata?.linkedLiabilityId) {
        await tx.liability.update({
          where: { id: data.metadata.linkedLiabilityId },
          data: {
            outstandingBalance: { decrement: data.amount },
          }
        })
        await tx.liabilityPayment.create({
          data: {
            liabilityId: data.metadata.linkedLiabilityId,
            amount: data.amount,
            principal: data.amount, // Optimistic assumption
            date: new Date(data.date),
            notes: data.description,
          }
        })
      }

      return txn
    })

    return apiSuccess(transaction)
  } catch (error) {
    console.error("Create transaction error:", error)
    return apiError("Failed to create transaction", 500)
  }
}
