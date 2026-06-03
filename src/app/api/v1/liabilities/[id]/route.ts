import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  const { id } = await params

  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.liability.delete({
      where: { id, workspaceId },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete liability" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId
  const { id } = await params

  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { name, type, lender, principalAmount, outstandingBalance, interestRate, emiAmount, tenure, notes } = body

    const liability = await prisma.liability.update({
      where: { id, workspaceId },
      data: {
        name,
        type,
        lender,
        principalAmount: Number(principalAmount),
        outstandingBalance: Number(outstandingBalance),
        interestRate: interestRate ? Number(interestRate) : null,
        emiAmount: emiAmount ? Number(emiAmount) : null,
        tenure: tenure ? parseInt(tenure) : null,
        notes,
      },
    })

    return NextResponse.json({ data: liability })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update liability" }, { status: 500 })
  }
}
