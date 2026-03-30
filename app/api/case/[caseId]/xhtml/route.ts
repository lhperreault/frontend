import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Proxies the tagged XHTML from Supabase Storage for a document.
 * Avoids CORS issues when fetching from the browser directly.
 *
 * GET /api/case/[caseId]/xhtml?document_id=[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const documentId = request.nextUrl.searchParams.get("document_id")

  if (!documentId) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verify document belongs to this case and get its xhtml URL
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("tagged_xhtml_url")
    .eq("id", documentId)
    .eq("case_id", caseId)
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  if (!doc.tagged_xhtml_url) {
    return NextResponse.json({ error: "No XHTML available for this document" }, { status: 404 })
  }

  // Fetch the XHTML from storage server-side
  const res = await fetch(doc.tagged_xhtml_url)
  if (!res.ok) {
    return NextResponse.json(
      { error: `Storage fetch failed: ${res.status}` },
      { status: 502 },
    )
  }

  const xhtml = await res.text()
  return new NextResponse(xhtml, {
    headers: { "Content-Type": "application/xhtml+xml; charset=utf-8" },
  })
}
