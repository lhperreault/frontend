import { redirect } from "next/navigation"

export default function CaseRootPage({ params }: { params: { caseId: string } }) {
  redirect(`/case/${params.caseId}/workspace`)
}
