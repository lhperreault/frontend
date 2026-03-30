import { createServerClient } from "@/lib/supabase/server"
import { DocumentsTable } from "@/components/documents/documents-table"
import type { Document } from "@/lib/types/case"

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  const supabase = createServerClient()

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {(documents ?? []).length} document{(documents ?? []).length !== 1 ? "s" : ""} in this case
          </p>
        </div>

        <DocumentsTable documents={(documents ?? []) as Document[]} caseId={caseId} />
      </div>
    </div>
  )
}
