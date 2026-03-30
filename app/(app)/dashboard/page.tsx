import { OmniDropZone } from "@/components/entryway/omni-drop-zone"
import { RecentCases } from "@/components/entryway/recent-cases"
import { InboundStream } from "@/components/entryway/inbound-stream"

/**
 * Dashboard — the Entryway view shown when no case is selected.
 * Upload new documents (caseId is created server-side on ingest)
 * or navigate to an existing case.
 */
export default function DashboardPage() {
  return (
    <div className="h-full overflow-y-auto">
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Entryway</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop documents to begin ingestion, or open a recent case.
        </p>
      </div>

      <OmniDropZone />

      <InboundStream />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent Cases</h2>
        <RecentCases />
      </section>
    </div>
    </div>
  )
}
