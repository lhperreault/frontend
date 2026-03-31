"use client"

import { HoverSyncProvider } from "@/providers/hover-sync-provider"
import { useWorkspace } from "@/providers/workspace-provider"
import { type ViewId } from "@/lib/types/workspace"
import { SlotContainer } from "./slot-container"
import { SlotCountToggle } from "./slot-count-toggle"
import { WorkspaceToast } from "./workspace-toast"

// ─── View registry ─────────────────────────────────────────────────────────
// Views are added here as they are implemented in Sprint 2+.
// For now, unimplemented views show a placeholder.

import dynamic from "next/dynamic"

const DocumentView = dynamic(
  () => import("@/components/views/document-view").then((m) => m.DocumentView),
  { ssr: false }
)
const AiChatView = dynamic(
  () => import("@/components/views/ai-chat-view").then((m) => m.AiChatView),
  { ssr: false }
)
const FilterSearchView = dynamic(
  () =>
    import("@/components/views/filter-search-view").then(
      (m) => m.FilterSearchView
    ),
  { ssr: false }
)
const SummaryView = dynamic(
  () => import("@/components/views/summary-view").then((m) => m.SummaryView),
  { ssr: false }
)
const AllDocumentsView = dynamic(
  () =>
    import("@/components/views/all-documents-view").then(
      (m) => m.AllDocumentsView
    ),
  { ssr: false }
)
const TimelineView = dynamic(
  () =>
    import("@/components/views/timeline-view").then((m) => m.TimelineView),
  { ssr: false }
)
const ClaimsCountsView = dynamic(
  () =>
    import("@/components/views/claims-counts-view").then(
      (m) => m.ClaimsCountsView
    ),
  { ssr: false }
)

function ViewPlaceholder({ viewId }: { viewId: ViewId }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground/50">
      {viewId} — coming soon
    </div>
  )
}

function ViewRenderer({ viewId, caseId }: { viewId: ViewId; caseId: string }) {
  switch (viewId) {
    case "document":
      return <DocumentView caseId={caseId} />
    case "ai-chat":
      return <AiChatView caseId={caseId} />
    case "filter-search":
      return <FilterSearchView caseId={caseId} />
    case "summary":
      return <SummaryView caseId={caseId} />
    case "all-documents":
      return <AllDocumentsView caseId={caseId} />
    case "timeline":
      return <TimelineView caseId={caseId} />
    case "claims-counts":
      return <ClaimsCountsView caseId={caseId} />
    default:
      return <ViewPlaceholder viewId={viewId} />
  }
}

// ─── FlexibleWorkspace ──────────────────────────────────────────────────────

interface FlexibleWorkspaceProps {
  caseId: string
}

export function FlexibleWorkspace({ caseId }: FlexibleWorkspaceProps) {
  const { slots } = useWorkspace()

  return (
    <HoverSyncProvider>
      <div className="relative flex h-full overflow-hidden">
        {slots.map((slot, i) => (
          <SlotContainer
            key={i}
            slotIndex={i}
            viewId={slot.viewId}
            isOnly={slots.length === 1}
          >
            <ViewRenderer viewId={slot.viewId} caseId={caseId} />
          </SlotContainer>
        ))}
        {/* Panel-count toggle — floated at bottom-right */}
        <div className="absolute bottom-3 right-3 z-40">
          <SlotCountToggle />
        </div>
        {/* Toast notifications */}
        <WorkspaceToast />
      </div>
    </HoverSyncProvider>
  )
}
