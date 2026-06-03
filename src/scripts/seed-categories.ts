/**
 * Default Category Seeder
 *
 * Run with: npx tsx src/scripts/seed-categories.ts <workspaceId>
 *
 * Seeds the default expense/income categories for a workspace.
 * Categories are grouped into: NEED, WANT, FUN, HOME, INVESTMENT, INCOME
 */

import { PrismaClient } from "@/generated/prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const dbUrl = process.env.DATABASE_URL
const pool = new Pool({ connectionString: dbUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_CATEGORIES = [
  // ─── NEEDS ────────────────────────────────────────────────
  { name: "Groceries", group: "NEED", icon: "🛒", color: "#22c55e" },
  { name: "Rent", group: "NEED", icon: "🏠", color: "#22c55e" },
  { name: "Utilities", group: "NEED", icon: "💡", color: "#22c55e" },
  { name: "Insurance", group: "NEED", icon: "🛡️", color: "#22c55e" },
  { name: "Healthcare", group: "NEED", icon: "🏥", color: "#22c55e" },
  { name: "Education", group: "NEED", icon: "📚", color: "#22c55e" },
  { name: "Transport (Daily)", group: "NEED", icon: "🚌", color: "#22c55e" },
  { name: "Phone & Internet", group: "NEED", icon: "📱", color: "#22c55e" },
  { name: "EMI / Loan", group: "NEED", icon: "🏦", color: "#22c55e" },

  // ─── WANTS ────────────────────────────────────────────────
  { name: "Dining Out", group: "WANT", icon: "🍔", color: "#f59e0b" },
  { name: "Shopping", group: "WANT", icon: "🛍️", color: "#f59e0b" },
  { name: "Subscriptions", group: "WANT", icon: "📺", color: "#f59e0b" },
  { name: "Personal Care", group: "WANT", icon: "💇", color: "#f59e0b" },
  { name: "Clothing", group: "WANT", icon: "👕", color: "#f59e0b" },
  { name: "Gifts", group: "WANT", icon: "🎁", color: "#f59e0b" },

  // ─── FUN ──────────────────────────────────────────────────
  { name: "Travel", group: "FUN", icon: "✈️", color: "#8b5cf6" },
  { name: "Entertainment", group: "FUN", icon: "🎬", color: "#8b5cf6" },
  { name: "Sports & Fitness", group: "FUN", icon: "🏋️", color: "#8b5cf6" },
  { name: "Hobbies", group: "FUN", icon: "🎨", color: "#8b5cf6" },
  { name: "Parties & Events", group: "FUN", icon: "🎉", color: "#8b5cf6" },

  // ─── HOME ─────────────────────────────────────────────────
  { name: "Home Maintenance", group: "HOME", icon: "🔧", color: "#06b6d4" },
  { name: "Furniture", group: "HOME", icon: "🪑", color: "#06b6d4" },
  { name: "Home Improvement", group: "HOME", icon: "🏗️", color: "#06b6d4" },
  { name: "Domestic Help", group: "HOME", icon: "🧹", color: "#06b6d4" },

  // ─── INVESTMENT ───────────────────────────────────────────
  { name: "Mutual Fund (SIP)", group: "INVESTMENT", icon: "📈", color: "#3b82f6" },
  { name: "Stocks", group: "INVESTMENT", icon: "📊", color: "#3b82f6" },
  { name: "Fixed Deposit", group: "INVESTMENT", icon: "🏧", color: "#3b82f6" },
  { name: "Gold", group: "INVESTMENT", icon: "🥇", color: "#3b82f6" },
  { name: "PPF / EPF / NPS", group: "INVESTMENT", icon: "🏛️", color: "#3b82f6" },
  { name: "Crypto", group: "INVESTMENT", icon: "🪙", color: "#3b82f6" },

  // ─── INCOME ───────────────────────────────────────────────
  { name: "Salary", group: "INCOME", icon: "💰", color: "#10b981" },
  { name: "Business Revenue", group: "INCOME", icon: "🏢", color: "#10b981" },
  { name: "Freelance", group: "INCOME", icon: "💻", color: "#10b981" },
  { name: "Interest", group: "INCOME", icon: "🏦", color: "#10b981" },
  { name: "Dividends", group: "INCOME", icon: "💹", color: "#10b981" },
  { name: "Rental Income", group: "INCOME", icon: "🏘️", color: "#10b981" },
  { name: "Other Income", group: "INCOME", icon: "💵", color: "#10b981" },

  // ─── MISC ─────────────────────────────────────────────────
  { name: "Taxes", group: "NEED", icon: "📋", color: "#ef4444" },
  { name: "Charity / Donations", group: "WANT", icon: "❤️", color: "#f59e0b" },
  { name: "Other", group: "NEED", icon: "📦", color: "#6b7280" },
]

async function seedCategories(workspaceId: string) {
  console.log(`Seeding categories for workspace: ${workspaceId}`)

  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) {
    console.error(`Workspace ${workspaceId} not found!`)
    process.exit(1)
  }

  // Check if already seeded
  const existing = await prisma.category.count({
    where: { workspaceId, isSystem: true },
  })

  if (existing > 0) {
    console.log(`Already seeded (${existing} system categories found). Skipping.`)
    return
  }

  // Create all categories
  const created = await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      workspaceId,
      name: cat.name,
      group: cat.group,
      icon: cat.icon,
      color: cat.color,
      isSystem: true,
      isActive: true,
    })),
  })

  console.log(`✅ Created ${created.count} default categories`)
}

// Removed direct execution to prevent process.exit() during Next.js build/import

// Export for programmatic use (e.g., from register route)
export { DEFAULT_CATEGORIES, seedCategories }
