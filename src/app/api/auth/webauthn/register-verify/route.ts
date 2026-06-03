import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { verifyRegistrationResponse } from "@simplewebauthn/server"

// rpID and origin are derived dynamically

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.currentChallenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 400 })
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost"
    const rpID = host.split(":")[0]
    const protocol = host.includes("localhost") ? "http" : "https"
    const origin = `${protocol}://${host}`

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: [origin, "http://localhost:3000", "http://localhost:3001"],
        expectedRPID: rpID,
      })
    } catch (error: any) {
      console.error(error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

      await prisma.webAuthnCredential.create({
        data: {
          userId,
          credentialID: Buffer.from(credentialID),
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter: BigInt(counter),
          credentialDeviceType,
          credentialBackedUp,
          transports: "[]",
        }
      })

      // Update user profile to enable biometric
      await prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          metadata: { biometricEnabled: true }
        },
        update: {
          metadata: { biometricEnabled: true }
        }
      })

      // Clear challenge
      await prisma.user.update({
        where: { id: userId },
        data: { currentChallenge: null }
      })

      return NextResponse.json({ verified: true })
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 400 })
  } catch (error: any) {
    console.error("Register verify error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
