import { ActionBoard } from "@/components/action-board/action-board"

export default async function BoardPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  return <ActionBoard caseId={caseId} />
}
