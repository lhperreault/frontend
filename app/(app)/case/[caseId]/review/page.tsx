import { ReviewQueue } from "@/components/review/review-queue"

export default async function ReviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  return <ReviewQueue caseId={caseId} />
}
