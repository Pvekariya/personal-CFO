import { PrismaClient } from "@/generated/prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import * as dotenv from "dotenv"

// Force override cached environment variables with the latest .env
// Trigger reload for schema updates (added CHF/SGD enums)
dotenv.config({ override: true })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  // Neon free tier database has a concurrent connection limit of 10.
  // We restrict connection pool limits to prevent connection exhaustion during hot-reloads.
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10000, // Close idle connections after 10s
    connectionTimeoutMillis: 5000, // Timeout connection attempts after 5s
    allowExitOnIdle: true, // Allow node process to exit when pool is idle
  })

  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma
    globalForPrisma.pool = pool
  }

  return prisma
}

export const prisma = getPrismaClient()
