import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const supabase = createServerClient()

  const { data: nodes, error: nodesErr } = await supabase
    .from("kg_nodes")
    .select("*")
    .eq("case_id", caseId)

  if (nodesErr) {
    return NextResponse.json({ error: nodesErr.message }, { status: 500 })
  }

  const nodeIds = (nodes ?? []).map((n) => n.id as string)

  const { data: edges, error: edgesErr } = nodeIds.length
    ? await supabase
        .from("kg_edges")
        .select("*")
        .in("source_node_id", nodeIds)
    : { data: [], error: null }

  if (edgesErr) {
    return NextResponse.json({ error: edgesErr.message }, { status: 500 })
  }

  return NextResponse.json({ nodes: nodes ?? [], edges: edges ?? [] })
}
