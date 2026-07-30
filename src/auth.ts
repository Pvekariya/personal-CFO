import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db/client"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = (credentials.email as string).toLowerCase().trim()
        const password = credentials.password as string

        if (!password) return null

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            workspaces: {
              where: { isActive: true },
              take: 1,
            },
            profile: true,
          },
        })

        if (!user || user.status !== "ACTIVE") return null

        const passwordMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatch) return null

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {})

        let workspaceId = user.workspaces[0]?.workspaceId || ""

        // If user has no active workspace membership, attach to primary workspace
        if (!workspaceId) {
          const defaultWs = await prisma.workspace.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          })
          if (defaultWs) {
            workspaceId = defaultWs.id
            await prisma.workspaceMember.create({
              data: {
                workspaceId,
                userId: user.id,
                role: "OWNER",
              },
            }).catch(() => {})
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0],
          image: user.avatarUrl,
          workspaceId,
          role: user.role,
          onboardingComplete: !!user.profile,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.workspaceId = (user as any).workspaceId
        token.role = (user as any).role
        token.onboardingComplete = (user as any).onboardingComplete
        // Do not store base64 images in session cookie to prevent HTTP 431 Header too large errors
        if (user.image && !user.image.startsWith("data:image")) {
          token.picture = user.image
        } else {
          token.picture = null
        }
      }
      if (trigger === "update" && session) {
        if (session.onboardingComplete !== undefined) token.onboardingComplete = session.onboardingComplete
        if (session.image !== undefined && !session.image.startsWith("data:image")) {
          token.picture = session.image
        }
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
