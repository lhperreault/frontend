import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const nodeType = request.nextUrl.searchParams.get("node_type")
  const supabase = createServerClient()

  let query = supabase.from("kg_nodes").select("*").eq("case_id", caseId)
  if (nodeType) query = query.eq("node_type", nodeType)

  const { data, error } = await query.order("node_label", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}
