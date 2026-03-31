import { createServerClient } from "@/lib/supabase/server"
import { WorkspaceProvider } from "@/providers/workspace-provider"
import { FlexibleWorkspace } from "@/components/workspace/flexible-workspace"

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>
  searchParams: Promise<{ doc?: string }>
}) {
  const { caseId } = await params
  const { doc } = await searchParams

  // Resolve initial documentId server-side: prefer URL param, else first document
  let documentId = doc ?? null
  if (!documentId) {
    const supabase = createServerClient()
    const { data } = await supabase
      .from("documents")
      .select("id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()
    documentId = data?.id ?? null
  }

  return (
    <WorkspaceProvider caseId={caseId} initialDocumentId={documentId}>
      <div className="flex h-full flex-col overflow-hidden">
        <FlexibleWorkspace caseId={caseId} />
      </div>
    </WorkspaceProvider>
  )
}
