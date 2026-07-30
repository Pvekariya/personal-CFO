import { prisma } from "@/lib/db/client"

export async function scanAndGenerateAlerts(workspaceId: string, inputUserId?: string) {
  const generatedAlerts: Array<{ title: string; message: string; type: string }> = []

  try {
    // Resolve userId if not provided
    let userId = inputUserId
    if (!userId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId, isActive: true },
        select: { userId: true },
      })
      if (!member) return []
      userId = member.userId
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Check Low Account Balances (< ₹5,000)
    const lowAccounts = await prisma.account.findMany({
      where: {
        workspaceId,
        isActive: true,
        deletedAt: null,
        balance: { lt: 5000 },
      },
    })

    for (const acc of lowAccounts) {
      const title = `Low Balance Warning: ${acc.name}`
      const bodyText = `${acc.name} has a current balance of ₹${Number(acc.balance).toLocaleString("en-IN")}. Consider topping up.`

      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          title,
          createdAt: { gte: today },
        },
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            type: "BUDGET_BREACH",
            title,
            body: bodyText,
            channel: "IN_APP",
            data: { accountId: acc.id, balance: Number(acc.balance) },
          },
        })
        generatedAlerts.push({ title, message: bodyText, type: "BUDGET_BREACH" })
      }
    }

    // 2. High Expense Anomaly (> ₹15,000 in single transaction this week)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const highExpenses = await prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        type: "EXPENSE",
        amount: { gte: 15000 },
        date: { gte: sevenDaysAgo },
      },
      take: 3,
    })

    for (const tx of highExpenses) {
      const title = `High Expense Logged: ₹${Number(tx.amount).toLocaleString("en-IN")}`
      const bodyText = `Expense "${tx.description}" was recorded on ${new Date(tx.date).toISOString().split("T")[0]}.`

      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          title,
        },
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            type: "TRANSACTION_ALERT",
            title,
            body: bodyText,
            channel: "IN_APP",
            data: { transactionId: tx.id, amount: Number(tx.amount) },
          },
        })
        generatedAlerts.push({ title, message: bodyText, type: "TRANSACTION_ALERT" })
      }
    }

    // 3. Goal Milestones / Monthly Insights
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthTx = await prisma.transaction.findMany({
      where: { workspaceId, deletedAt: null, date: { gte: startOfMonth } },
    })

    let monthIncome = 0
    let monthExpense = 0
    for (const t of monthTx) {
      if (t.type === "INCOME") monthIncome += Number(t.amount)
      if (t.type === "EXPENSE") monthExpense += Number(t.amount)
    }

    if (monthIncome > 0 && monthExpense / monthIncome < 0.5) {
      const savingsRate = Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
      const title = `Great Savings Rate: ${savingsRate}% This Month! 🎉`
      const bodyText = `You have saved ₹${(monthIncome - monthExpense).toLocaleString("en-IN")} so far this month.`

      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          title,
          createdAt: { gte: startOfMonth },
        },
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            type: "AI_INSIGHT",
            title,
            body: bodyText,
            channel: "IN_APP",
            data: { savingsRate, monthIncome, monthExpense },
          },
        })
        generatedAlerts.push({ title, message: bodyText, type: "AI_INSIGHT" })
      }
    }

    return generatedAlerts
  } catch (error) {
    console.error("Error running alert scanner:", error)
    return []
  }
}
