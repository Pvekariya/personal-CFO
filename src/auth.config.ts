import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [], // no providers needed for middleware
} satisfies NextAuthConfig
