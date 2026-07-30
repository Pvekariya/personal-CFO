// Memory cache for exchange rates to avoid hitting rate-limits
interface CachedRates {
  base: string
  rates: Record<string, number>
  fetchedAt: number
}

const ratesCache: Record<string, CachedRates> = {}
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour cache duration

// Baseline fallback rates in case API is offline
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.78, AED: 3.67, SGD: 1.34, CHF: 0.88 },
  INR: { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0093, AED: 0.044, SGD: 0.016, CHF: 0.011 },
  EUR: { EUR: 1, USD: 1.09, INR: 90.5, GBP: 0.85, AED: 4.0, SGD: 1.46, CHF: 0.96 },
  GBP: { GBP: 1, USD: 1.28, INR: 107.0, EUR: 1.18, AED: 4.7, SGD: 1.72, CHF: 1.13 },
  AED: { AED: 1, USD: 0.27, INR: 22.7, EUR: 0.25, GBP: 0.21, SGD: 0.37, CHF: 0.24 },
  SGD: { SGD: 1, USD: 0.75, INR: 62.0, EUR: 0.68, GBP: 0.58, AED: 2.74, CHF: 0.66 },
  CHF: { CHF: 1, USD: 1.14, INR: 95.0, EUR: 1.04, GBP: 0.89, AED: 4.17, SGD: 1.52 },
}

export async function getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const now = Date.now()
  const cached = ratesCache[baseCurrency]

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`)
    if (!res.ok) throw new Error("API responded with error status")
    const data = await res.json()
    
    if (data.rates) {
      ratesCache[baseCurrency] = {
        base: baseCurrency,
        rates: data.rates,
        fetchedAt: now,
      }
      return data.rates
    }
  } catch (error) {
    console.warn(`Failed to fetch live rates for ${baseCurrency}, using hardcoded fallbacks:`, error)
  }

  // Use hardcoded fallback rates if fetch fails
  return FALLBACK_RATES[baseCurrency] || FALLBACK_RATES.USD
}

export async function convertCurrency(
  amount: number | string,
  from: string,
  to: string
): Promise<number> {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return 0
  if (from === to) return numAmount

  // Fetch rates using 'from' as base
  const rates = await getExchangeRates(from)
  const rate = rates[to]

  if (rate !== undefined) {
    return numAmount * rate
  }

  // If rate not found in base, try using 'to' as base (inverse rate)
  const reverseRates = await getExchangeRates(to)
  const reverseRate = reverseRates[from]
  if (reverseRate !== undefined && reverseRate > 0) {
    return numAmount / reverseRate
  }

  return numAmount
}
