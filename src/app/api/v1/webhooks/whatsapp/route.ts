import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { parseQuickCaptureText } from "@/lib/quick-capture"
import { createTransactionSchema } from "@/lib/validations/transactions"
import { createTransactionInWorkspace } from "@/lib/transactions/create-transaction"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

// Verification for Meta/Twilio WhatsApp Webhooks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "personal-cfo-whatsapp-secret"

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ status: "Personal CFO WhatsApp Webhook Online" }, { status: 200 })
}

// Ingestion for WhatsApp Messages (Twilio / Meta / Direct JSON)
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secretParam = searchParams.get("secret")
    const workspaceIdParam = searchParams.get("workspaceId")

    let messageText = ""
    let senderPhone = ""

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      messageText = (formData.get("Body") as string) || (formData.get("text") as string) || ""
      senderPhone = (formData.get("From") as string) || ""
    } else {
      const body = await request.json().catch(() => ({}))
      messageText =
        body?.Body ||
        body?.message ||
        body?.text ||
        body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
        ""
      senderPhone =
        body?.From ||
        body?.from ||
        body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
        ""
    }

    if (!messageText.trim()) {
      return NextResponse.json({ error: "No message content found" }, { status: 400 })
    }

    // Resolve target workspace
    let workspaceId = workspaceIdParam

    if (!workspaceId) {
      // Find workspace by primary owner or fallback to first active workspace
      const firstWorkspace = await prisma.workspace.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      })
      if (!firstWorkspace) {
        return NextResponse.json({ error: "No active workspace available" }, { status: 404 })
      }
      workspaceId = firstWorkspace.id
    }

    // Fetch accounts in workspace
    const accounts = await prisma.account.findMany({
      where: { workspaceId, isActive: true, deletedAt: null },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
    })

    if (accounts.length === 0) {
      return NextResponse.json(
        { 
          error: "No accounts found in workspace to assign transaction",
          reply: "No accounts configured in your workspace yet. Please add a bank account first."
        },
        { status: 400 }
      )
    }

    // Parse WhatsApp text into transaction draft
    const draft = parseQuickCaptureText(messageText, accounts, undefined, "whatsapp")

    // Determine if it is a query or a log request
    const isQuery =
      !draft.amount ||
      draft.amount <= 0 ||
      /cfo|balance|status|help|summary|net worth|cash flow|debt|audit|rebalance/i.test(messageText)

    if (isQuery) {
      // 1. Fetch live financial data for AI context
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          accounts: true,
          assets: true,
          liabilities: true,
          goals: true,
          budgets: true,
        }
      })

      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId, isActive: true },
        select: { userId: true },
      })

      const profile = member
        ? await prisma.userProfile.findUnique({
            where: { userId: member.userId },
          })
        : null

      const userDataContext = `
=============================================================
USER'S CURRENT FINANCIAL DATA (LIVE FROM DATABASE)
=============================================================
User Profile:
- Age: ${profile?.age || "Not provided"}
- Monthly Income: ${profile?.monthlyIncome ? "₹" + profile.monthlyIncome.toString() : "Not provided"}
- Risk Profile: ${profile?.riskProfile || "Not provided"}

Accounts & Balances:
${workspace?.accounts.map((a) => `- ${a.name} (${a.type}): ₹${a.balance}`).join("\n") || "No accounts found."}

Assets (Investments):
${workspace?.assets.map((a) => `- ${a.name} (${a.class}): ₹${a.currentValue}`).join("\n") || "No assets found."}

Liabilities (Debts):
${workspace?.liabilities.map((l) => `- ${l.name} (${l.type}): Outstanding ₹${l.outstandingBalance} (EMI: ₹${l.emiAmount || 0})`).join("\n") || "No liabilities found."}

Goals:
${workspace?.goals.map((g) => `- ${g.name}: Target ₹${g.targetAmount}, Current ₹${g.currentAmount} (Status: ${g.status})`).join("\n") || "No goals found."}
`

      const systemPrompt = `
You are my Personal CFO, Wealth Manager, and retirement planning advisor.
You think and act like a world-class CFO with 25 years of experience managing high-net-worth individuals in India.
You are direct, numbers-first, and honest. Every response has a number, a rupee amount, a date, or a percentage.
Keep your response concise, as it will be read on a WhatsApp chat screen. Do not use markdown heading blocks (like # or ##) as WhatsApp does not render them well; use bold text (*text*) or simple lines instead.

${userDataContext}
`

      const { text: replyText } = await generateText({
        model: google("models/gemini-1.5-flash"),
        system: systemPrompt,
        prompt: messageText,
      })

      return NextResponse.json({
        success: true,
        source: "whatsapp",
        type: "query",
        reply: replyText,
      })
    }

    // Otherwise, process as transaction log
    const normalizedDraft = {
      ...draft,
      accountId: draft.accountId || accounts[0].id,
      amount: Math.abs(draft.amount),
      date: draft.date.split("T")[0],
    }

    const validation = createTransactionSchema.safeParse(normalizedDraft)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Incomplete transaction data extracted from WhatsApp message",
          reply: "I detected a transaction log request, but it needs more details (e.g. 'Paid ₹450 for Uber from HDFC bank').",
          draft: normalizedDraft,
          issues: validation.error.flatten(),
        },
        { status: 422 }
      )
    }

    // Create transaction and notification
    const transaction = await prisma.$transaction(async (tx) => {
      const createdTx = await createTransactionInWorkspace(tx, workspaceId!, validation.data)

      const member = await tx.workspaceMember.findFirst({
        where: { workspaceId: workspaceId!, isActive: true },
        select: { userId: true },
      })

      if (member) {
        await tx.notification.create({
          data: {
            userId: member.userId,
            type: "TRANSACTION_ALERT",
            title: `WhatsApp Expense Logged: ₹${Number(createdTx.amount).toLocaleString("en-IN")}`,
            body: `Logged "${createdTx.description}" (${createdTx.type}) from WhatsApp.`,
            channel: "WHATSAPP",
            data: {
              transactionId: createdTx.id,
              rawText: messageText,
              sender: senderPhone,
            },
          },
        })
      }

      return createdTx
    })

    const targetAccountName = accounts.find((a) => a.id === transaction.accountId)?.name || "Wallet"
    const replyMessage = `Successfully logged *${transaction.type.toLowerCase()}* of *₹${Number(transaction.amount).toLocaleString("en-IN")}* for *"${transaction.description}"* using *${targetAccountName}* wallet.`

    return NextResponse.json({
      success: true,
      source: "whatsapp",
      type: "log",
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        description: transaction.description,
        type: transaction.type,
      },
      reply: replyMessage,
    })
  } catch (error) {
    console.error("WhatsApp webhook ingestion error:", error)
    return NextResponse.json({ error: "Failed to process WhatsApp webhook", reply: "Sorry, I had trouble processing that request." }, { status: 500 })
  }
}
