import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { apiError, apiSuccess } from "@/lib/api/response"
import { prisma } from "@/lib/db/client"
import { parseQuickCaptureText } from "@/lib/quick-capture"
import { createTransactionSchema } from "@/lib/validations/transactions"
import { createTransactionInWorkspace } from "@/lib/transactions/create-transaction"

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  const workspaceId = session?.user?.workspaceId

  if (!userId || !workspaceId) {
    return apiError("Unauthorized", 401)
  }

  try {
    const body = await request.json()
    const text = body?.text || body?.message || ""

    if (!text.trim()) {
      return apiError("Message text is required", 400)
    }

    const accounts = await prisma.account.findMany({
      where: { workspaceId, isActive: true, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
      select: { id: true, name: true, type: true },
    })

    if (accounts.length === 0) {
      return apiError("Please create an account first.", 409)
    }

    const draft = parseQuickCaptureText(text, accounts, undefined, "whatsapp")

    const normalizedDraft = {
      ...draft,
      accountId: draft.accountId || accounts[0].id,
      amount: Math.abs(draft.amount),
      date: draft.date.split("T")[0],
    }

    const validation = createTransactionSchema.safeParse(normalizedDraft)
    if (!validation.success) {
      return apiError("Quick capture could not parse all fields.", 422, {
        draft: normalizedDraft,
        issues: validation.error.flatten(),
      })
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTx = await createTransactionInWorkspace(tx, workspaceId, validation.data)

      await tx.notification.create({
        data: {
          userId,
          type: "TRANSACTION_ALERT",
          title: `WhatsApp Simulated: ₹${Number(createdTx.amount).toLocaleString("en-IN")}`,
          body: `Logged "${createdTx.description}" (${createdTx.type}) via WhatsApp simulation test.`,
          channel: "IN_APP",
          data: {
            transactionId: createdTx.id,
            rawText: text,
            source: "whatsapp_simulation",
          },
        },
      })

      return createdTx
    })

    return apiSuccess({
      transaction,
      source: "whatsapp_simulation",
      message: `Logged ${transaction.type.toLowerCase()} of ₹${transaction.amount} successfully.`,
    })
  } catch (error) {
    console.error("WhatsApp simulation error:", error)
    return NextResponse.json({ error: "Failed to simulate WhatsApp message" }, { status: 500 })
  }
}
