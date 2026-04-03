import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string; sessionId: string }> },
) {
  const { caseId, sessionId } = await params
  const res = await fetch(`${BACKEND}/api/case/${caseId}/sessions/${sessionId}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
