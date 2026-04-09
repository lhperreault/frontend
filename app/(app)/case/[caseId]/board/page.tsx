import { CaseBoard } from "@/components/case-board/case-board"

export default async function BoardPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  return <CaseBoard caseId={caseId} />
}
