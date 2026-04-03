import { DocumentsTabView } from "@/components/views/documents-tab-view"

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  return <DocumentsTabView caseId={caseId} />
}
