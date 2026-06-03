import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { writeFile } from "fs/promises"
import path from "path"

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
    
    // Ensure filename is safe
    const filename = `${userId}-${Date.now()}${path.extname(file.name)}`
    const uploadDir = path.join(process.cwd(), "public/uploads/avatars")
    
    await writeFile(path.join(uploadDir, filename), buffer)
    
    const fileUrl = `/uploads/avatars/${filename}`

    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
