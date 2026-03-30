import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { case_id, query } = body as { case_id: string; query: string; limit?: number }

  // ── Try the Python hybrid search first ────────────────────────────────────
  try {
    const res = await fetch(`${BACKEND}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      return NextResponse.json(await res.json())
    }
  } catch {
    // Backend unavailable — fall through to Supabase fallback
  }

  // ── Supabase keyword fallback ─────────────────────────────────────────────
  // Uses ilike on section_title and section_text joined through documents.
  const supabase = createServerClient()

  const { data: sections, error } = await supabase
    .from("sections")
    .select(`
      id,
      document_id,
      section_title,
      section_text,
      level,
      page_range,
      start_page,
      end_page,
      semantic_label,
      anchor_id,
      is_synthetic,
      documents!inner(id, file_name, document_type, case_id)
    `)
    .eq("documents.case_id", case_id)
    .or(`section_title.ilike.%${query}%,section_text.ilike.%${query}%`)
    .order("start_page", { ascending: true })
    .limit(body.limit ?? 10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform to match SearchResponse shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (sections ?? []).map((s: any) => ({
    section_id:     s.id,
    document_id:    s.document_id,
    file_name:      s.documents?.file_name   ?? "",
    document_type:  s.documents?.document_type ?? null,
    section_title:  s.section_title,
    semantic_label: s.semantic_label,
    level:          s.level,
    page_range:     s.page_range,
    parent_context: null,
    section_text:   s.section_text?.substring(0, 500) ?? null,
    scores:         { semantic: 0, keyword: 1, combined: 0.5 },
    provenance: {
      anchor_id:   s.anchor_id,
      is_synthetic: s.is_synthetic,
      start_page:  s.start_page,
      end_page:    s.end_page,
    },
  }))

  return NextResponse.json({
    query,
    case_id,
    filters_applied: { fallback: true },
    results,
    total_results: results.length,
  })
}
