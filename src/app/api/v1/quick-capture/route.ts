import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { apiError, apiSuccess } from "@/lib/api/response"
import { quickCaptureSchema, parseQuickCaptureText } from "@/lib/quick-capture"
import { createTransactionSchema } from "@/lib/validations/transactions"
import { createTransactionInWorkspace } from "@/lib/transactions/create-transaction"

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  let workspaceId = session?.user?.workspaceId

  if (userId && !workspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId, isActive: true },
      select: { workspaceId: true },
    })
    if (member) {
      workspaceId = member.workspaceId
    }
  }

  if (!userId || !workspaceId) {
    return apiError("Unauthorized", 401)
  }

  try {
    const body = await request.json()
    const parsed = quickCaptureSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten())
    }

    const accounts = await prisma.account.findMany({
      where: { workspaceId, isActive: true, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, type: true },
    })

    if (accounts.length === 0) {
      return apiError("Add an account before using quick capture.", 409)
    }

    const draft = parseQuickCaptureText(parsed.data.text, accounts, parsed.data.accountId, parsed.data.source)

    const normalizedDraft = {
      ...draft,
      accountId: draft.accountId || accounts[0].id,
      amount: Math.abs(draft.amount),
      date: draft.date.split("T")[0],
    }

    const validation = createTransactionSchema.safeParse(normalizedDraft)
    if (!validation.success) {
      return apiError("Quick capture needs a little more detail.", 422, {
        draft: normalizedDraft,
        issues: validation.error.flatten(),
      })
    }

    const transaction = await prisma.$transaction(async (tx) => {
      return createTransactionInWorkspace(tx, workspaceId, validation.data)
    })

    return apiSuccess({
      transaction,
      draft: normalizedDraft,
      confidence: draft.confidence,
      needsReview: draft.needsReview,
    })
  } catch (error) {
    console.error("Quick capture error:", error)
    return NextResponse.json({ error: "Failed to capture transaction" }, { status: 500 })
  }
}
