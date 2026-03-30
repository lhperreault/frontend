import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const res = await fetch(`${BACKEND}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    return NextResponse.json(await res.json())
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({
      answer: `Backend agent is not running. Start the FastAPI server at ${BACKEND}. (${message})`,
      confidence: 0,
      needs_review: false,
      provenance_links: [],
      reasoning_steps: [`Could not reach backend at ${BACKEND}: ${message}`],
      agent_name: "system",
      query: body.query ?? "",
    })
  }
}
