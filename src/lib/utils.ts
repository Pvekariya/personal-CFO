import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currencyCode: string = "INR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  
  // Decide locale based on currency to get proper commas (US for USD, IN for INR)
  const locale = currencyCode === "INR" ? "en-IN" : "en-US"

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDate(dateInput: string | Date): string {
  const date = new Date(dateInput)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
