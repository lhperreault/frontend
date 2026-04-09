import { NextRequest } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

// Allow long-running SSE connections (capped at Vercel Hobby plan max of 300s)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const backendForm = new FormData()
  backendForm.append("file", file)
  const caseId = formData.get("case_id")
  if (caseId) backendForm.append("case_id", String(caseId))

  const res = await fetch(`${BACKEND}/api/ingest`, { method: "POST", body: backendForm })
  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Ingest failed" }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Pipe the SSE stream from the backend straight through to the client
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
}
