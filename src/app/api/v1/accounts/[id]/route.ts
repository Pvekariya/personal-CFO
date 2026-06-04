import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess, apiError } from "@/lib/api/response"
import { updateAccountSchema } from "@/lib/validations/accounts"

// GET /api/v1/accounts/[id] — Get single account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { id } = await params

  const account = await prisma.account.findFirst({
    where: {
      id,
      workspaceId: authResult.workspaceId,
      deletedAt: null,
    },
    include: {
      balanceHistory: {
        orderBy: { recordedAt: "desc" },
        take: 30,
      },
    },
  })

  if (!account) {
    return apiError("Account not found", 404)
  }

  return apiSuccess(account)
}

// PATCH /api/v1/accounts/[id] — Update account
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateAccountSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten())
    }

    // Verify ownership
    const existing = await prisma.account.findFirst({
      where: { id, workspaceId: authResult.workspaceId, deletedAt: null },
    })

    if (!existing) {
      return apiError("Account not found", 404)
    }

    const data = parsed.data

    // Handle default account toggle
    if (data.isDefault) {
      await prisma.account.updateMany({
        where: { workspaceId: authResult.workspaceId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.accountNumber !== undefined && {
          accountNumber: data.accountNumber,
        }),
        ...(data.ifscCode !== undefined && {
          ifscCode: data.ifscCode || null,
        }),
        ...(data.upiId !== undefined && {
          upiId: data.upiId || null,
        }),
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    // If balance changed, record snapshot
    if (
      data.balance !== undefined &&
      Number(existing.balance) !== data.balance
    ) {
      await prisma.accountBalance.create({
        data: {
          accountId: account.id,
          balance: data.balance,
        },
      })
    }

    return apiSuccess(account)
  } catch (error) {
    console.error("Update account error:", error)
    return apiError("Failed to update account", 500)
  }
}

// DELETE /api/v1/accounts/[id] — Soft delete account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { id } = await params

  // Verify ownership
  const existing = await prisma.account.findFirst({
    where: { id, workspaceId: authResult.workspaceId, deletedAt: null },
  })

  if (!existing) {
    return apiError("Account not found", 404)
  }

  // Soft delete
  await prisma.account.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })

  return apiSuccess({ deleted: true })
}
