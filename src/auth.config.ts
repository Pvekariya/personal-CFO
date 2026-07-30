import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  secret: process.env.AUTH_SECRET || "zGCeXG+EEM5Dil6aN0D4lw+Z5O52D7eexysFdnLK5UevO183V2ORixDi3JI=",
  pages: {
    signIn: '/login',
  },
  providers: [], // no providers needed for middleware
} satisfies NextAuthConfig
