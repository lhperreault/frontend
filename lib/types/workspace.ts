export type ViewId =
  | "filter-search"
  | "summary"
  | "document"
  | "all-documents"
  | "timeline"
  | "ai-chat"
  | "claims-counts"

export interface SlotConfig {
  viewId: ViewId
  widthPct: number // percentage of total workspace width
}

export const VIEW_LABELS: Record<ViewId, string> = {
  "filter-search":  "Filter & Search",
  "summary":        "Summary",
  "document":       "Document",
  "all-documents":  "All Documents",
  "timeline":       "Timeline",
  "ai-chat":        "AI Chat",
  "claims-counts":  "Claims & Counts",
}

export const DEFAULT_SLOTS: SlotConfig[] = [
  { viewId: "document", widthPct: 60 },
  { viewId: "ai-chat",  widthPct: 40 },
]
