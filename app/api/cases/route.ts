import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * GET /api/cases
 * Returns all cases (service-role, bypasses RLS) with document counts.
 */
export async function GET() {
  const supabase = createServerClient()

  const { data: caseRows, error } = await supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ids = (caseRows ?? []).map((c) => c.id)
  let docCounts: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("case_id")
      .in("case_id", ids)

    for (const d of docs ?? []) {
      if (d.case_id) docCounts[d.case_id] = (docCounts[d.case_id] ?? 0) + 1
    }
  }

  return NextResponse.json({ cases: caseRows ?? [], docCounts })
}
