import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { generateAuthenticationOptions } from "@simplewebauthn/server"

// rpID is derived dynamically

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { webAuthnCredentials: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.webAuthnCredentials.length === 0) {
      return NextResponse.json({ error: "No biometrics registered" }, { status: 400 })
    }

    const url = new URL(request.url)
    const rpID = url.searchParams.get("rpID") || request.headers.get("x-forwarded-host")?.split(":")[0] || request.headers.get("host")?.split(":")[0] || "localhost"

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.webAuthnCredentials.map(cred => ({
        id: new Uint8Array(cred.credentialID),
        type: "public-key",
      })),
      userVerification: "preferred",
    })

    // Save challenge
    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge }
    })

    return NextResponse.json(options)
  } catch (error: any) {
    console.error("Auth options error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
