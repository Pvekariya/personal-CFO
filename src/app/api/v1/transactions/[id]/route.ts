import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess, apiError } from "@/lib/api/response"
import { updateTransactionSchema } from "@/lib/validations/transactions"

// GET /api/v1/transactions/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { id } = await params

  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      account: { workspaceId: authResult.workspaceId },
      deletedAt: null,
    },
    include: {
      account: { select: { id: true, name: true, type: true } },
      category: {
        select: { id: true, name: true, group: true, color: true, icon: true },
      },
    },
  })

  if (!transaction) {
    return apiError("Transaction not found", 404)
  }

  return apiSuccess(transaction)
}

// PATCH /api/v1/transactions/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten())
    }

    // Verify ownership
    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        account: { workspaceId: authResult.workspaceId },
        deletedAt: null,
      },
    })

    if (!existing) {
      return apiError("Transaction not found", 404)
    }

    const data = parsed.data

    const transaction = await prisma.$transaction(async (tx) => {
      // If amount or type changed, reverse old balance and apply new
      if (
        data.amount !== undefined &&
        Number(existing.amount) !== data.amount
      ) {
        const oldBalanceChange =
          existing.type === "INCOME" || existing.type === "LOAN_DISBURSEMENT"
            ? Number(existing.amount)
            : -Number(existing.amount)

        const newType = data.type || existing.type
        const newAmount = data.amount

        const newBalanceChange =
          newType === "INCOME" || newType === "LOAN_DISBURSEMENT"
            ? newAmount
            : -newAmount

        const netChange = newBalanceChange - oldBalanceChange

        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: netChange } },
        })
      }

      return tx.transaction.update({
        where: { id },
        data: {
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.amount !== undefined && {
            amount: data.amount,
            amountInBaseCurrency: data.amount,
          }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.merchant !== undefined && { merchant: data.merchant }),
          ...(data.reference !== undefined && { reference: data.reference }),
          ...(data.date !== undefined && { date: new Date(data.date) }),
          ...(data.tags !== undefined && { tags: data.tags }),
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
    })

    return apiSuccess(transaction)
  } catch (error) {
    console.error("Update transaction error:", error)
    return apiError("Failed to update transaction", 500)
  }
}

// DELETE /api/v1/transactions/[id] — Soft delete + reverse balance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { id } = await params

  const existing = await prisma.transaction.findFirst({
    where: {
      id,
      account: { workspaceId: authResult.workspaceId },
      deletedAt: null,
    },
  })

  if (!existing) {
    return apiError("Transaction not found", 404)
  }

  await prisma.$transaction(async (tx) => {
    // Reverse balance change
    const balanceChange =
      existing.type === "INCOME" || existing.type === "LOAN_DISBURSEMENT"
        ? -Number(existing.amount)
        : Number(existing.amount)

    await tx.account.update({
      where: { id: existing.accountId },
      data: { balance: { increment: balanceChange } },
    })

    // Soft delete
    await tx.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  })

  return apiSuccess({ deleted: true })
}
