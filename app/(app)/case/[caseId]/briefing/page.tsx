import { BriefingDashboard } from "@/components/briefing/briefing-dashboard"

export default async function BriefingPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  return <BriefingDashboard caseId={caseId} />
}
