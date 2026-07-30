import type { Prisma } from "@/generated/prisma/client"
import type { CreateTransactionInput } from "@/lib/validations/transactions"
import { convertCurrency } from "@/lib/currency"

const categoryRules: Record<string, string> = {
  uber: "Transport",
  ola: "Transport",
  flight: "Travel",
  irctc: "Travel",
  swiggy: "Dining",
  zomato: "Dining",
  restaurant: "Dining",
  starbucks: "Dining",
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  netflix: "Entertainment",
  spotify: "Entertainment",
  movie: "Entertainment",
  bookmyshow: "Entertainment",
  salary: "Salary",
  payroll: "Salary",
  bonus: "Salary",
  "d-mart": "Groceries",
  blinkit: "Groceries",
  zepto: "Groceries",
  instamart: "Groceries",
  bigbasket: "Groceries",
  pharmacy: "Health",
  apollo: "Health",
  hospital: "Health",
}

export async function createTransactionInWorkspace(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  data: CreateTransactionInput
) {
  const account = await tx.account.findFirst({
    where: { id: data.accountId, workspaceId, deletedAt: null },
  })

  if (!account) {
    throw new Error("Account not found")
  }

  let finalCategoryId = data.categoryId || null

  if (finalCategoryId) {
    const category = await tx.category.findFirst({
      where: { id: finalCategoryId, workspaceId },
    })
    if (!category) {
      throw new Error("Category not found")
    }
  } else if (data.merchant || data.description) {
    const searchString = (data.merchant || data.description || "").toLowerCase()

    const pastTxn = await tx.transaction.findFirst({
      where: {
        workspaceId,
        categoryId: { not: null },
        OR: [
          ...(data.merchant
            ? [{ merchant: { equals: data.merchant, mode: "insensitive" as const } }]
            : []),
          ...(data.description
            ? [
                {
                  description: {
                    equals: data.description,
                    mode: "insensitive" as const,
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: { date: "desc" },
    })

    if (pastTxn?.categoryId) {
      finalCategoryId = pastTxn.categoryId
    } else {
      for (const [keyword, catName] of Object.entries(categoryRules)) {
        if (searchString.includes(keyword)) {
          const cat = await tx.category.findFirst({
            where: {
              workspaceId,
              name: { equals: catName, mode: "insensitive" },
            },
          })
          if (cat) {
            finalCategoryId = cat.id
            break
          }
        }
      }
    }
  }

  const workspace = await tx.workspace.findUnique({
    where: { id: workspaceId },
    select: { currency: true },
  })
  const baseCurrency = workspace?.currency || "INR"
  const amountInBaseCurrency = await convertCurrency(data.amount, data.currency, baseCurrency)

  const transaction = await tx.transaction.create({
    data: {
      workspaceId,
      accountId: data.accountId,
      categoryId: finalCategoryId,
      type: data.type,
      status: "COMPLETED",
      amount: data.amount,
      currency: data.currency,
      amountInBaseCurrency,
      description: data.description,
      notes: data.notes,
      merchant: data.merchant,
      reference: data.reference,
      date: new Date(data.date),
      tags: data.tags,
      isRecurring: data.isRecurring,
      metadata: data.metadata ?? undefined,
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

  if (data.type === "INVESTMENT" && data.metadata?.linkedAssetId) {
    await tx.asset.update({
      where: { id: data.metadata.linkedAssetId },
      data: {
        investedAmount: { increment: data.amount },
        currentValue: { increment: data.amount },
      },
    })
    await tx.assetTransaction.create({
      data: {
        assetId: data.metadata.linkedAssetId,
        type: "BUY",
        amount: data.amount,
        date: new Date(data.date),
        notes: data.description,
      },
    })
  }

  if (data.type === "LOAN_REPAYMENT" && data.metadata?.linkedLiabilityId) {
    await tx.liability.update({
      where: { id: data.metadata.linkedLiabilityId },
      data: {
        outstandingBalance: { decrement: data.amount },
      },
    })
    await tx.liabilityPayment.create({
      data: {
        liabilityId: data.metadata.linkedLiabilityId,
        amount: data.amount,
        principal: data.amount,
        date: new Date(data.date),
        notes: data.description,
      },
    })
  }

  return transaction
}
