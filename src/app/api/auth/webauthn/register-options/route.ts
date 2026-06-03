import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/client"
import { generateRegistrationOptions } from "@simplewebauthn/server"

const rpName = "Personal CFO OS"
// rpID is derived from request URL dynamically

export async function GET(request: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { webAuthnCredentials: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const url = new URL(request.url)
    const rpID = url.searchParams.get("rpID") || request.headers.get("x-forwarded-host")?.split(":")[0] || request.headers.get("host")?.split(":")[0] || "localhost"

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.email,
      attestationType: "none",
      excludeCredentials: user.webAuthnCredentials.map(cred => ({
        id: new Uint8Array(cred.credentialID),
        type: "public-key",
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform", // forces TouchID / FaceID
      },
    })

    // Save challenge to user
    await prisma.user.update({
      where: { id: userId },
      data: { currentChallenge: options.challenge }
    })

    return NextResponse.json(options)
  } catch (error: any) {
    console.error("Register options error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
