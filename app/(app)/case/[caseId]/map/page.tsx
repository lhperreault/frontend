import { CaseMap } from "@/components/case-map/case-map"

export default async function MapPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  return <div className="h-full"><CaseMap caseId={caseId} /></div>
}
