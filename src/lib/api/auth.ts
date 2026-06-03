import { auth } from "@/auth"
import { apiError } from "@/lib/api/response"

/**
 * Auth guard for API routes.
 * Returns the session if valid, or an error Response if not authenticated.
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user?.id || !session.user.workspaceId) {
    return { session: null, error: apiError("Unauthorized", 401) }
  }

  return {
    session,
    error: null,
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
  }
}
