import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const res = await fetch(`${BACKEND}/api/case/${caseId}/sessions`)
  if (!res.ok) return NextResponse.json({ sessions: [] }, { status: res.status })
  return NextResponse.json(await res.json())
}
