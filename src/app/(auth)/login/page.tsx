"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const payload: any = {
        email,
        password,
        redirect: false,
      }

      const result: any = await signIn("credentials", payload)

      if (result?.error) {
        setError("Invalid email or password.")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
          Welcome back
        </h1>
        <p className="text-muted-foreground font-medium">
          Sign in to your Personal CFO OS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-destructive/10 p-4 text-sm font-medium text-destructive animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          <label htmlFor="email" className="text-sm font-bold text-foreground/90 pl-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. john@example.com"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <div className="flex items-center justify-between pl-1 pr-1">
            <label htmlFor="password" className="text-sm font-bold text-foreground/90">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="flex h-12 w-full rounded-2xl border border-input/60 bg-background/50 px-4 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 disabled:opacity-50 hover:bg-background/80"
          />
        </div>

        <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
          <Button type="submit" className="w-full h-12 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:translate-y-0" disabled={loading}>
            {loading ? "Authenticating..." : "Sign in securely"}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm font-medium text-muted-foreground animate-in fade-in duration-700 delay-700 fill-mode-both">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
