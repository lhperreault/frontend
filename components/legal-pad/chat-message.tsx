// @ts-nocheck
"use client"

import { useEffect, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { WhyToggle } from "./why-toggle"
import { ChatActions } from "./chat-actions"
import { formatProvenance } from "@/lib/utils/provenance"
import { confidenceToGlow } from "@/lib/constants/glow-colors"
import { useWorkspace } from "@/providers/workspace-provider"
import type { AgentResponse } from "@/lib/types/agent-response"
import type { KGNodeGrouped } from "@/lib/types/kg"
import { cn } from "@/lib/utils"

// ── Entity type colours (same palette as FilterSearchView) ────────────────────

const ENTITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  party:           { bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-400/40" },
  claim:           { bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400", border: "border-amber-400/40" },
  obligation:      { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-400/40" },
  event:           { bg: "bg-emerald-500/10",text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-400/40" },
  evidence:        { bg: "bg-rose-500/10",   text: "text-rose-600 dark:text-rose-400",   border: "border-rose-400/40" },
  legal_authority: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-400/40" },
  amount:          { bg: "bg-teal-500/10",   text: "text-teal-600 dark:text-teal-400",   border: "border-teal-400/40" },
  condition:       { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-400/40" },
}

// ── Entity text annotation ────────────────────────────────────────────────────

type Segment =
  | { type: "text"; value: string }
  | { type: "entity"; value: string; entity: KGNodeGrouped }

/**
 * Splits plain text into segments, annotating spans that match entity labels.
 * Longest labels matched first to avoid partial overlaps.
 */
function annotateText(text: string, entities: KGNodeGrouped[]): Segment[] {
  if (!entities.length) return [{ type: "text", value: text }]

  // Build sorted label list (longest first, minimum 4 chars to avoid noise)
  const candidates = entities
    .map((e) => ({ label: e.node_label, entity: e }))
    .filter((c) => c.label.length >= 4)
    .sort((a, b) => b.label.length - a.label.length)

  const segments: Segment[] = []
  let remaining = text

  while (remaining.length > 0) {
    let matched = false

    for (const { label, entity } of candidates) {
      const idx = remaining.toLowerCase().indexOf(label.toLowerCase())
      if (idx === -1) continue

      // Text before the match
      if (idx > 0) segments.push({ type: "text", value: remaining.slice(0, idx) })
      // The matched entity span
      segments.push({ type: "entity", value: remaining.slice(idx, idx + label.length), entity })
      remaining = remaining.slice(idx + label.length)
      matched = true
      break
    }

    if (!matched) {
      segments.push({ type: "text", value: remaining })
      break
    }
  }

  return segments
}

interface AnnotatedTextProps {
  text: string
  entities: KGNodeGrouped[]
  onEntityHover?: (entity: KGNodeGrouped | null) => void
}

function AnnotatedText({ text, entities, onEntityHover }: AnnotatedTextProps) {
  const segments = useMemo(() => annotateText(text, entities), [text, entities])

  if (segments.every((s) => s.type === "text")) {
    return <span>{text}</span>
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>

        const colors = ENTITY_COLORS[seg.entity.node_type] ?? ENTITY_COLORS.party
        return (
          <span
            key={i}
            className={cn(
              "relative inline-block cursor-pointer rounded border px-0.5 transition-all",
              "group/entity",
              colors.bg,
              colors.text,
              colors.border,
            )}
            onMouseEnter={() => onEntityHover?.(seg.entity)}
            onMouseLeave={() => onEntityHover?.(null)}
          >
            {seg.value}
            {/* Tooltip */}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-md opacity-0 transition-opacity group-hover/entity:opacity-100 border border-border/40">
              {seg.entity.node_type.replace("_", " ")}
            </span>
          </span>
        )
      })}
    </>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserMessageProps {
  content: string
}

interface AssistantMessageProps {
  response: AgentResponse
  isSummary?: boolean
  entities?: KGNodeGrouped[]
  /** Whether this is the most-recent non-summary message (sets TOC highlights) */
  isLatest?: boolean
  onPinToCase?: (r: AgentResponse) => void
  onAddToTimeline?: (r: AgentResponse) => void
}

// ── UserMessage ───────────────────────────────────────────────────────────────

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="glass max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">
        {content}
      </div>
    </div>
  )
}

// ── AssistantMessage ──────────────────────────────────────────────────────────

export function AssistantMessage({
  response,
  isSummary,
  entities = [],
  isLatest = false,
  onPinToCase,
  onAddToTimeline,
}: AssistantMessageProps) {
  const glow = confidenceToGlow(response.confidence)
  const { navigateToSection, navigateToDocument, setHighlightedSections, setEntityHoverTarget, slots } = useWorkspace()

  // When this is the latest message, push its cited sections to the TOC glow
  useEffect(() => {
    if (!isLatest) return
    const ids = (response.provenance_links ?? [])
      .map((l) => l.section_id)
      .filter(Boolean) as string[]
    setHighlightedSections(ids)
    // Clear highlights when a new message takes over (cleanup handled by next isLatest)
  }, [isLatest, response.provenance_links, setHighlightedSections])

  const hasDocView = slots.some((s) => s.viewId === "document")

  function handleSourceClick(link: { section_id: string; document_id?: string | null }) {
    if (!hasDocView) {
      navigateToSection(link.section_id)
      return
    }
    if (link.document_id) {
      navigateToDocument(link.document_id, link.section_id)
    } else {
      navigateToSection(link.section_id)
    }
  }

  function handleEntityHover(entity: KGNodeGrouped | null) {
    if (!entity) {
      setEntityHoverTarget(null)
      return
    }
    setEntityHoverTarget({ id: entity.id, label: entity.node_label, nodeType: entity.node_type })
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "glass rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm",
          isSummary ? "max-w-full" : "max-w-[92%]",
          `glow-${glow}`,
        )}
      >
        {isSummary ? (
          <div className="summary-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response.answer}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="leading-relaxed">
            <AnnotatedText
              text={response.answer}
              entities={entities}
              onEntityHover={handleEntityHover}
            />
          </p>
        )}

        {/* Provenance sources */}
        {response.provenance_links?.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-border/30 pt-2">
            {response.provenance_links.map((link, i) => (
              <li key={i} className="relative group/src">
                <button
                  type="button"
                  onClick={() => handleSourceClick(link)}
                  className={cn(
                    "flex w-full items-center gap-1.5 text-[10px] text-muted-foreground rounded px-1 py-0.5 transition-colors text-left",
                    hasDocView
                      ? "cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-500"
                      : "cursor-default",
                  )}
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" />
                  {formatProvenance(link)}
                  {hasDocView && (
                    <span className="ml-auto shrink-0 opacity-0 group-hover/src:opacity-60 transition-opacity text-[9px]">
                      ↗
                    </span>
                  )}
                </button>

                {/* Quote preview on hover */}
                {link.quote_snippet && (
                  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden group-hover/src:block w-64 rounded-md border border-border/40 bg-popover px-3 py-2 shadow-lg">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">
                      {link.file_name}
                      {link.page_range && <span className="ml-1 opacity-60">pp. {link.page_range}</span>}
                    </p>
                    <p className="text-[11px] text-popover-foreground leading-relaxed line-clamp-4 italic">
                      "{link.quote_snippet}"
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <WhyToggle steps={response.reasoning_steps} />
      </div>

      <ChatActions
        response={response}
        onPinToCase={onPinToCase}
        onAddToTimeline={onAddToTimeline}
      />
    </div>
  )
}
