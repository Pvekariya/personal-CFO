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
      return NextResponse.json({ success: true, message: "If this number is registered, an OTP will be sent." })
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Set expiry to 10 minutes from now
    const expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpiry: expiry
      }
    })

    // In a real application, we would send this via Email (Resend, SendGrid, etc.)
    // For this MVP, we will simulate it by returning it to the user.
    console.log(`[EMAIL MOCK] OTP for ${email} is: ${otp}`)

    return NextResponse.json({ 
      success: true, 
      message: `OTP sent successfully! (MOCK OTP: ${otp})` 
    })
  } catch (error: any) {
    console.error("Forgot password send error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json()
    
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Email, OTP, and new password are required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    if (user.resetOtp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
    }

    if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 })
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update user and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetOtp: null,
        resetOtpExpiry: null
      }
    })

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (error: any) {
    console.error("Forgot password verify error:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
