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
    await prisma.document.update({
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
