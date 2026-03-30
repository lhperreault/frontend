import { createServerClient } from "@/lib/supabase/server"
import { PanelLayout } from "@/components/shell/panel-layout"
import { ChronologyDrawer } from "@/components/chronology/chronology-drawer"
import { WorkspaceCenter } from "@/components/lightbox/workspace-center"

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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <PanelLayout
          caseId={caseId}
          centerContent={
            <WorkspaceCenter caseId={caseId} initialDocumentId={documentId} />
          }
        />
      </div>
      <ChronologyDrawer caseId={caseId} />
    </div>
  )
}
