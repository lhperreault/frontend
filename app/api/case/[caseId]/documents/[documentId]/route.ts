import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * DELETE /api/case/[caseId]/documents/[documentId]
 *
 * Cascading document deletion using the service-role key (bypasses RLS).
 * Order matters — delete child rows before the parent document to avoid FK violations:
 *   1. evidence_links  (references document_id + evidence_document_id)
 *   2. extractions     (references document_id)
 *   3. kg_edges        (references source_node_id/target_node_id in kg_nodes)
 *   4. kg_nodes        (references document_id)
 *   5. sections        (references document_id)
 *   6. documents       (the row itself)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> },
) {
  const { caseId, documentId } = await params
  const supabase = createServerClient()

  // 1. Fetch all kg_node ids for this document (needed to delete their edges)
  const { data: nodes } = await supabase
    .from("kg_nodes")
    .select("id")
    .eq("document_id", documentId)

  const nodeIds = (nodes ?? []).map((n) => n.id)

  // 2. Delete evidence_links referencing this document (either side)
  await supabase
    .from("evidence_links")
    .delete()
    .or(`document_id.eq.${documentId},evidence_document_id.eq.${documentId}`)

  // 3. Delete extractions
  await supabase.from("extractions").delete().eq("document_id", documentId)

  // 4. Delete kg_edges touching any node from this document
  if (nodeIds.length > 0) {
    await supabase.from("kg_edges").delete().in("source_node_id", nodeIds)
    await supabase.from("kg_edges").delete().in("target_node_id", nodeIds)
  }
  // Also delete edges with source_document_id
  await supabase.from("kg_edges").delete().eq("source_document_id", documentId)

  // 5. Delete kg_nodes
  await supabase.from("kg_nodes").delete().eq("document_id", documentId)

  // 6. Delete sections
  await supabase.from("sections").delete().eq("document_id", documentId)

  // 7. Null out primary_document_id on the case if it points here
  await supabase
    .from("cases")
    .update({ primary_document_id: null })
    .eq("id", caseId)
    .eq("primary_document_id", documentId)

  // 8. Finally delete the document itself
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("case_id", caseId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
