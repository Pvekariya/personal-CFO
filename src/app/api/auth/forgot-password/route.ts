import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { phone }
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

    // In a real application, we would send this via SMS (Twilio, SNS, etc.)
    // For this MVP, we will simulate it by returning it in dev or printing it.
    console.log(`[SMS MOCK] OTP for ${phone} is: ${otp}`)

    return NextResponse.json({ 
      success: true, 
      message: "OTP sent successfully! (Check console for mock SMS)" 
    })
  } catch (error: any) {
    console.error("Forgot password send error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { phone, otp, newPassword } = await request.json()
    
    if (!phone || !otp || !newPassword) {
      return NextResponse.json({ error: "Phone, OTP, and new password are required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { phone }
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
