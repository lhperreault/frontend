import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * DELETE /api/case/[caseId]
 *
 * Full dependency tree — delete leaf-first.
 * All document-scoped tables are deleted via document_id (in docIds).
 * Case-scoped tables (case_events, agent_responses, reviews) are deleted by case_id.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const supabase = createServerClient()

  // Fetch all document ids for this case
  const { data: docs } = await supabase
    .from("documents")
    .select("id")
    .eq("case_id", caseId)
  const docIds = (docs ?? []).map((d) => d.id)

  if (docIds.length > 0) {
    // Fetch kg_node ids (needed to delete edges by node id)
    const { data: nodes } = await supabase
      .from("kg_nodes")
      .select("id")
      .in("document_id", docIds)
    const nodeIds = (nodes ?? []).map((n) => n.id)

    // 1. evidence_links
    await supabase.from("evidence_links").delete().in("document_id", docIds)
    await supabase.from("evidence_links").delete().in("evidence_document_id", docIds)

    // 2. section_embeddings (before sections)
    await supabase.from("section_embeddings").delete().in("document_id", docIds)

    // 3. extractions
    await supabase.from("extractions").delete().in("document_id", docIds)

    // 4. kg_edges
    if (nodeIds.length > 0) {
      await supabase.from("kg_edges").delete().in("source_node_id", nodeIds)
      await supabase.from("kg_edges").delete().in("target_node_id", nodeIds)
    }
    await supabase.from("kg_edges").delete().in("source_document_id", docIds)

    // 5. kg_nodes
    await supabase.from("kg_nodes").delete().in("document_id", docIds)

    // 6. legal_elements
    await supabase.from("legal_elements").delete().in("document_id", docIds)

    // 7. allegations
    await supabase.from("allegations").delete().in("document_id", docIds)

    // 8. counts
    await supabase.from("counts").delete().in("document_id", docIds)

    // 9. claims
    await supabase.from("claims").delete().in("document_id", docIds)

    // 10. sections
    await supabase.from("sections").delete().in("document_id", docIds)

    // 11. documents
    await supabase.from("documents").delete().in("id", docIds)
  }

  // 12. case_events
  await supabase.from("case_events").delete().eq("case_id", caseId)

  // 13. reviews (child of agent_responses)
  const { data: agentRows } = await supabase
    .from("agent_responses")
    .select("id")
    .eq("case_id", caseId)
  const agentIds = (agentRows ?? []).map((r) => r.id)
  if (agentIds.length > 0) {
    await supabase.from("reviews").delete().in("agent_response_id", agentIds)
  }

  // 14. agent_responses
  await supabase.from("agent_responses").delete().eq("case_id", caseId)

  // 15. Delete the case
  const { error } = await supabase.from("cases").delete().eq("id", caseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
