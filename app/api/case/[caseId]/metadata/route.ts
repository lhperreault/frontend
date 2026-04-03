import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  return NextResponse.json(data)
}

const _EDITABLE_FIELDS = [
  "case_name",
  "case_type",
  "case_stage",
  "party_role",
  "our_client",
  "opposing_party",
  "court_name",
  "judge_name",
  "case_context",
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const body = await request.json()

  // Only allow known editable fields — strip anything else
  const updates: Record<string, string | null> = {}
  for (const field of _EDITABLE_FIELDS) {
    if (field in body) updates[field] = body[field] ?? null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("cases")
    .update(updates)
    .eq("id", caseId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
