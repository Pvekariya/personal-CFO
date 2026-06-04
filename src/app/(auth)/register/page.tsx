"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Register
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Registration failed")
        setLoading(false)
        return
      }

      // Auto sign-in after registration
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError("Account created but sign-in failed. Please log in manually.")
        // Don't push to login, just show the error and let them click it
        setLoading(false)
      } else {
        window.location.href = "/onboarding/profile"
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">Create an account</h1>
        <p className="text-muted-foreground font-medium">
          Start mastering your wealth today.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
              type="text"
              value={formData.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="e.g. John"
              required
              className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-bold text-foreground/90 pl-1">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="e.g. Doe"
              className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
            />
          </div>
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <label htmlFor="email" className="text-sm font-bold text-foreground/90 pl-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="e.g. john@example.com"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
          <label htmlFor="password" className="text-sm font-bold text-foreground/90 pl-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder="Min 8 chars, uppercase + number"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700 fill-mode-both">
          <label htmlFor="confirmPassword" className="text-sm font-bold text-foreground/90 pl-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            placeholder="••••••••"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000 fill-mode-both">
          <Button type="submit" className="w-full h-12 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:translate-y-0" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm font-medium text-muted-foreground animate-in fade-in duration-700 delay-[1200ms] fill-mode-both">
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
