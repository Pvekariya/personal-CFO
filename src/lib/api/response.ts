import { NextResponse } from "next/server"

// Standard API response shape: { data, error, meta }
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, error: null, meta: meta ?? null })
}

export function apiError(
  message: string,
  status: number = 400,
  details?: unknown
) {
  return NextResponse.json(
    { data: null, error: message, details: details ?? null },
    { status }
  )
}

export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    data,
    error: null,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  })
}
