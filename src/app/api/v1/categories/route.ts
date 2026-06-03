import { prisma } from "@/lib/db/client"
import { requireAuth } from "@/lib/api/auth"
import { apiSuccess } from "@/lib/api/response"

// GET /api/v1/categories — List categories for workspace
export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const { workspaceId } = authResult

  const categories = await prisma.category.findMany({
    where: { workspaceId, isActive: true },
    orderBy: [{ group: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  })

  // Group by category group for easier frontend consumption
  const grouped = categories
    .filter((c) => !c.parentId) // Only top-level
    .reduce(
      (acc, cat) => {
        if (!acc[cat.group]) acc[cat.group] = []
        acc[cat.group].push(cat)
        return acc
      },
      {} as Record<string, typeof categories>
    )

  return apiSuccess({ categories, grouped })
}
