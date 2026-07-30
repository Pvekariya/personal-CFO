"use server"

import { signIn } from "@/auth"
import { redirect } from "next/navigation"
import { loginSchema } from "@/lib/validations/auth"

export async function loginAction(_prevState: string | undefined, formData: FormData) {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    })

    if (!parsed.success) {
      return parsed.error.issues[0]?.message || "Please enter your email and password."
    }

    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
      redirectTo: "/dashboard",
    })

    if (result?.error) {
      return "Invalid email or password."
    }

    redirect("/dashboard")
  } catch (error: any) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    if (error?.type === "CredentialsSignin" || error?.name === "AuthError" || error?.message?.includes("CredentialsSignin")) {
      return "Invalid email or password."
    }
    return "Invalid email or password."
  }
}
