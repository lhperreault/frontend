import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await fetch(`${BACKEND}/api/channels/${id}`, { method: "DELETE" })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
