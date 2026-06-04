"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function loginAction(_prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password."
        case "CallbackRouteError":
          return "Invalid email or password."
        default:
          return "Something went wrong. Please try again."
      }
    }
    // MUST re-throw: Auth.js signIn() throws a NEXT_REDIRECT on success.
    // If we catch it here, the redirect never happens.
    throw error
  }
}
