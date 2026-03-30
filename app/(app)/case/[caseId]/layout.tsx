import { CaseProvider } from "@/providers/case-provider"
import { CaseNavBar } from "@/components/shell/case-nav-bar"

export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params

  return (
    <CaseProvider caseId={caseId}>
      <div className="flex h-full flex-col overflow-hidden">
        <CaseNavBar caseId={caseId} />
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </CaseProvider>
  )
}
