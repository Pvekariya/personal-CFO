"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function loginAction(prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", Object.fromEntries(formData.entries()), { redirectTo: "/" })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password."
        case "CallbackRouteError":
          return "Configuration error or invalid credentials."
        default:
          return "Authentication failed. Please try again."
      }
    }
    // Must re-throw Next.js redirect errors
    throw error
  }
}
