import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const params = new URLSearchParams()
  for (const key of ["firm_id", "status", "limit", "offset"]) {
    const val = searchParams.get(key)
    if (val) params.set(key, val)
  }

  const res = await fetch(`${BACKEND}/api/intake/queue?${params}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
