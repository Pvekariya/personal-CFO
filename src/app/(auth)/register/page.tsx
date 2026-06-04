"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { registerAction } from "./actions"

export default function RegisterPage() {
  const [error, setError] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  async function clientAction(formData: FormData) {
    if (formData.get("password") !== formData.get("confirmPassword")) {
      setError("Passwords do not match")
      return
    }

    setError(undefined)
    startTransition(async () => {
      const errorMessage = await registerAction(undefined, formData)
      if (errorMessage) {
        setError(errorMessage)
      }
    })
  }

  return (
    <div className="space-y-8 max-w-sm mx-auto">
      <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
          Create an account
        </h1>
        <p className="text-muted-foreground font-medium">
          Start mastering your wealth today.
        </p>
      </div>

      <form action={clientAction} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-destructive/10 p-4 text-sm font-medium text-destructive animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-bold text-foreground/90 pl-1">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-bold text-foreground/90 pl-1">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
            />
          </div>
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <label htmlFor="email" className="text-sm font-bold text-foreground/90 pl-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
          <label htmlFor="password" className="text-sm font-bold text-foreground/90 pl-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700 fill-mode-both">
          <label htmlFor="confirmPassword" className="text-sm font-bold text-foreground/90 pl-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000 fill-mode-both">
          <Button type="submit" className="w-full h-12 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:translate-y-0" disabled={isPending}>
            {isPending ? "Creating Account..." : "Create Account"}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm font-medium text-muted-foreground animate-in fade-in duration-700 delay-1000 fill-mode-both">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
