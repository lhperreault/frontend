import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const backendForm = new FormData()
  backendForm.append("file", file)

  for (const key of ["firm_id", "case_id", "corpus_id", "priority", "processing_mode"]) {
    const val = formData.get(key)
    if (val) backendForm.append(key, String(val))
  }

  const res = await fetch(`${BACKEND}/api/intake/upload`, {
    method: "POST",
    body: backendForm,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
