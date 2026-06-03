import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const base64String = buffer.toString("base64")
    const mimeType = file.type || "image/jpeg"
    const fileUrl = `data:${mimeType};base64,${base64String}`
    
    // Save to user profile in database
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: fileUrl }
    })

    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
