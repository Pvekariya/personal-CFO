import type { Metadata } from "next"
import { Manrope, Geist_Mono } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
      : "http://localhost:3000"
  ),
  title: {
    default: "Personal CFO OS | Your AI Wealth Manager",
    template: "%s | Personal CFO OS",
  },
  description:
    "An enterprise-grade, AI-powered Personal CFO Operating System. Track net worth, optimize cash flow, manage debt, and plan for financial freedom with intelligent insights.",
  keywords: [
    "Personal CFO",
    "Wealth Management",
    "Net Worth Tracker",
    "Financial Freedom",
    "AI Financial Advisor",
    "Investment Planner",
    "Debt Management",
    "Retirement Planning",
    "Personal Finance",
  ],
  authors: [{ name: "Personal CFO Team" }],
  creator: "Personal CFO OS",
  publisher: "Personal CFO OS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Personal CFO",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    title: "Personal CFO OS | Your AI Wealth Manager",
    description: "An enterprise-grade, AI-powered Personal CFO Operating System. Track net worth, optimize cash flow, manage debt, and plan for financial freedom.",
    siteName: "Personal CFO OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal CFO OS | Your AI Wealth Manager",
    description: "An enterprise-grade, AI-powered Personal CFO Operating System.",
    creator: "@personalcfo",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans tracking-tight">
        <Providers>{children}</Providers>
      </body>
    </html>
  )  
}
