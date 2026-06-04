import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"
import { loginSchema } from "@/lib/validations/auth"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        webauthnResponse: { label: "WebAuthn Response", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const email = (credentials.email as string).toLowerCase().trim()

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            workspaces: {
              where: { isActive: true },
              take: 1,
            },
            profile: true,
            webAuthnCredentials: true,
          },
        })

        if (!user || user.status !== "ACTIVE") return null

        // Standard Password Verification Flow
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        )
        if (!passwordMatch) return null

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        const membership = user.workspaces[0]

        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" "),
          image: user.avatarUrl,
          workspaceId: membership?.workspaceId ?? "",
          role: user.role,
          onboardingComplete: !!user.profile,
        }
      },
    }),
  ],
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in — populate token from user object
      if (user) {
        token.id = user.id
        token.workspaceId = (user as any).workspaceId
        token.role = (user as any).role
        token.onboardingComplete = (user as any).onboardingComplete
        token.picture = user.image
      }
      
      // Allow client to update session properties
      if (trigger === "update" && session) {
        if (session.onboardingComplete !== undefined) token.onboardingComplete = session.onboardingComplete
        if (session.image !== undefined) token.picture = session.image
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.workspaceId = token.workspaceId as string
        session.user.role = token.role as string
        session.user.onboardingComplete = token.onboardingComplete as boolean
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
})
