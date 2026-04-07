import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
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
async function deleteDocumentCascade(
  supabase: SupabaseClient,
  documentId: string,
  caseId: string,
): Promise<{ error?: string }> {
  const { data: nodes } = await supabase
    .from("kg_nodes")
    .select("id")
    .eq("document_id", documentId)
  const nodeIds = (nodes ?? []).map((n: { id: string }) => n.id)

  await supabase
    .from("evidence_links")
    .delete()
    .or(`document_id.eq.${documentId},evidence_document_id.eq.${documentId}`)

  await supabase.from("section_embeddings").delete().eq("document_id", documentId)
  await supabase.from("extractions").delete().eq("document_id", documentId)

  if (nodeIds.length > 0) {
    await supabase.from("kg_edges").delete().in("source_node_id", nodeIds)
    await supabase.from("kg_edges").delete().in("target_node_id", nodeIds)
  }
  await supabase.from("kg_edges").delete().eq("source_document_id", documentId)

  await supabase.from("kg_nodes").delete().eq("document_id", documentId)
  await supabase.from("legal_elements").delete().eq("document_id", documentId)
  await supabase.from("allegations").delete().eq("document_id", documentId)
  await supabase.from("counts").delete().eq("document_id", documentId)
  await supabase.from("claims").delete().eq("document_id", documentId)
  await supabase.from("sections").delete().eq("document_id", documentId)

  await supabase
    .from("cases")
    .update({ primary_document_id: null })
    .eq("id", caseId)
    .eq("primary_document_id", documentId)

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("case_id", caseId)

  return error ? { error: error.message } : {}
}

/**
 * DELETE /api/case/[caseId]/documents/[documentId]
 *
 * Deletes the document and all its attached exhibits (child documents with
 * parent_document_id pointing to this document), cascading through all
 * dependent tables for each.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string; documentId: string }> },
) {
  const { caseId, documentId } = await params
  const supabase = createServerClient()

  // Find and delete all child documents (exhibits) first
  const { data: children } = await supabase
    .from("documents")
    .select("id")
    .eq("parent_document_id", documentId)

  for (const child of children ?? []) {
    const { error } = await deleteDocumentCascade(supabase, child.id, caseId)
    if (error) {
      return NextResponse.json({ error: `Failed to delete exhibit: ${error}` }, { status: 500 })
    }
  }

  // Delete the parent document
  const { error } = await deleteDocumentCascade(supabase, documentId, caseId)
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true, deletedExhibits: (children ?? []).length })
}
