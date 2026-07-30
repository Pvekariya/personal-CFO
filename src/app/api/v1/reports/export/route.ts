import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { apiError } from "@/lib/api/response"

export async function GET(request: Request) {
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

  if (!workspaceId) {
    return apiError("Unauthorized", 401)
  }

  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") // 1-12
    const year = searchParams.get("year") // e.g. 2026

    const now = new Date()
    const targetYear = year ? parseInt(year, 10) : now.getFullYear()
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth()

    const startDate = new Date(targetYear, targetMonth, 1)
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    })

    // Generate CSV Header & Rows
    const headers = ["Date", "Type", "Category", "Description", "Amount (INR)", "Account", "Status"]
    const csvRows = [headers.join(",")]

    for (const tx of transactions) {
      const dateStr = new Date(tx.date).toISOString().split("T")[0]
      const typeStr = tx.type
      const catStr = `"${(tx.category?.name || "Uncategorized").replace(/"/g, '""')}"`
      const descStr = `"${(tx.description || "").replace(/"/g, '""')}"`
      const amountStr = tx.amount.toString()
      const accountStr = `"${(tx.account?.name || "").replace(/"/g, '""')}"`
      const statusStr = tx.status

      csvRows.push([dateStr, typeStr, catStr, descStr, amountStr, accountStr, statusStr].join(","))
    }

    const csvContent = csvRows.join("\n")
    const filename = `Financial_Report_${targetYear}_${(targetMonth + 1).toString().padStart(2, "0")}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export CSV error:", error)
    return NextResponse.json({ error: "Failed to generate CSV export" }, { status: 500 })
  }
}
