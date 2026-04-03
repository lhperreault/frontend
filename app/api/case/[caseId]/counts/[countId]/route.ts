import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

type Params = { params: Promise<{ caseId: string; countId: string }> }

// PATCH /api/case/[caseId]/counts/[countId]
// Body: { count_label?, count_type?, summary? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const { caseId, countId } = await params
  const body = await request.json()

  // Only allow editing these three user-facing fields
  const allowed = ["count_label", "count_type", "summary"] as const
  const updates: Record<string, string | null> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key] ?? null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("counts")
    .update(updates)
    .eq("id", countId)
    .eq("case_id", caseId)
    .select("id, count_number, count_label, count_type, summary")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/case/[caseId]/counts/[countId]
// Removes the count and all its children (elements, allegations, evidence_links).
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { caseId, countId } = await params
  const supabase = createServerClient()

  // Delete in FK dependency order so the operation works even without CASCADE.
  // 1. evidence_links that reference this count's allegations or elements
  const { data: allegationIds } = await supabase
    .from("allegations")
    .select("id")
    .eq("count_id", countId)

  const { data: elementIds } = await supabase
    .from("legal_elements")
    .select("id")
    .eq("count_id", countId)

  const alIds = (allegationIds ?? []).map((r) => r.id as string)
  const elIds  = (elementIds  ?? []).map((r) => r.id as string)

  if (alIds.length) {
    await supabase.from("evidence_links").delete().in("allegation_id", alIds)
  }
  if (elIds.length) {
    await supabase.from("evidence_links").delete().in("element_id", elIds)
  }

  // Count-level evidence links
  await supabase.from("evidence_links").delete().eq("count_id", countId)

  // 2. allegations and legal_elements
  await supabase.from("allegations").delete().eq("count_id", countId)
  await supabase.from("legal_elements").delete().eq("count_id", countId)

  // 3. the count itself (verify it belongs to this case first)
  const { error } = await supabase
    .from("counts")
    .delete()
    .eq("id", countId)
    .eq("case_id", caseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
