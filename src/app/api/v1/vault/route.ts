import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { DocumentType } from "@/generated/prisma/client"

export async function GET(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const documents = await prisma.document.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error("Fetch documents error:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const workspaceId = session?.user?.workspaceId

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let fileUrl = ""
    let name = ""
    let type: DocumentType = "OTHER"
    let description = ""
    let expiryDate = ""
    let isConfidential = false
    let fileSize: number | null = null
    let mimeType = ""

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      name = formData.get("name") as string
      type = (formData.get("type") as DocumentType) || "OTHER"
      description = formData.get("description") as string
      expiryDate = formData.get("expiryDate") as string
      isConfidential = formData.get("isConfidential") === "true"
      
      const file = formData.get("file") as File | null
      const linkUrl = formData.get("fileUrl") as string

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64String = buffer.toString("base64")
        const mime = file.type || "application/pdf"
        
        // Save as base64 data URI directly in DB since Vercel is read-only
        fileUrl = `data:${mime};base64,${base64String}`
        fileSize = file.size
        mimeType = mime
      } else if (linkUrl) {
        fileUrl = linkUrl
      }
    } else {
      const body = await request.json()
      name = body.name
      type = body.type || "OTHER"
      description = body.description
      fileUrl = body.fileUrl
      expiryDate = body.expiryDate
      isConfidential = !!body.isConfidential
    }

    if (!fileUrl) {
      return NextResponse.json({ error: "File or Link is required" }, { status: 400 })
    }

    const document = await prisma.document.create({
      data: {
        workspaceId,
        type,
        name,
        description,
        fileUrl,
        fileSize,
        mimeType,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isConfidential,
      },
    })

    return NextResponse.json({ data: document })
  } catch (error) {
    console.error("Create document error:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}
