import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Return success anyway to prevent user enumeration
      return NextResponse.json({ success: true, message: "If this email is registered, a temporary password will be sent." })
    }

    // Generate an 8-character temporary password
    const tempPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetOtp: null,
        resetOtpExpiry: null
      }
    })

    // In a real application, we would send this via Email (Resend, SendGrid, etc.)
    console.log(`[EMAIL MOCK] Temporary password for ${email} is: ${tempPassword}`)

    return NextResponse.json({ 
      success: true, 
      message: `Temporary password sent! (MOCK EMAIL: Your new temporary password is: ${tempPassword})` 
    })
  } catch (error: any) {
    console.error("Forgot password send error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
