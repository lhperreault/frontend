import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * DELETE /api/case/[caseId]/documents/[documentId]
 *
 * Full dependency tree (from FK query) — delete leaf-first by document_id:
 *
 *   evidence_links     → sections, counts, allegations, documents
 *   section_embeddings → sections, documents
 *   extractions        → sections, documents
 *   kg_edges           → kg_nodes, sections
 *   kg_nodes           → sections, documents, kg_nodes(self)
 *   legal_elements     → counts, sections, documents
 *   allegations        → counts, claims, sections, documents
 *   counts             → claims, sections, documents
 *   claims             → sections, documents
 *   sections           → sections(self), documents
 *   documents
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> },
) {
  const { caseId, documentId } = await params
  const supabase = createServerClient()

  // Fetch kg_node ids (needed to delete edges by node id)
  const { data: nodes } = await supabase
    .from("kg_nodes")
    .select("id")
    .eq("document_id", documentId)
  const nodeIds = (nodes ?? []).map((n) => n.id)

  // 1. evidence_links
  await supabase
    .from("evidence_links")
    .delete()
    .or(`document_id.eq.${documentId},evidence_document_id.eq.${documentId}`)

  // 2. section_embeddings
  await supabase.from("section_embeddings").delete().eq("document_id", documentId)

  // 3. extractions
  await supabase.from("extractions").delete().eq("document_id", documentId)

  // 4. kg_edges
  if (nodeIds.length > 0) {
    await supabase.from("kg_edges").delete().in("source_node_id", nodeIds)
    await supabase.from("kg_edges").delete().in("target_node_id", nodeIds)
  }
  await supabase.from("kg_edges").delete().eq("source_document_id", documentId)

  // 5. kg_nodes
  await supabase.from("kg_nodes").delete().eq("document_id", documentId)

  // 6. legal_elements
  await supabase.from("legal_elements").delete().eq("document_id", documentId)

  // 7. allegations
  await supabase.from("allegations").delete().eq("document_id", documentId)

  // 8. counts
  await supabase.from("counts").delete().eq("document_id", documentId)

  // 9. claims
  await supabase.from("claims").delete().eq("document_id", documentId)

  // 10. sections
  await supabase.from("sections").delete().eq("document_id", documentId)

  // 11. Null out primary_document_id on the case if it points here
  await supabase
    .from("cases")
    .update({ primary_document_id: null })
    .eq("id", caseId)
    .eq("primary_document_id", documentId)

  // 12. Delete the document itself
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
