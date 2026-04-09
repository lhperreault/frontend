"use client"

import {
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import type {
  AgentResponseRow,
  AffirmativeDefenseRow,
  CountView,
  ClaimRow,
  ElementView,
  ElementStatus,
} from "@/lib/types/case-board"

export const DRAG_MIME = "application/x-board-allegation"

interface CountCardProps {
  claim: ClaimRow | null
  countView: CountView | null
  agentResponses: AgentResponseRow[]
  onAttachAllegation: (allegationId: string, elementId: string) => void
}

function statusIcon(status: ElementStatus) {
  switch (status) {
    case "proven":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "partial":
      return <Circle className="h-4 w-4 text-amber-500" />
    case "gap":
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    case "disputed":
      return <XCircle className="h-4 w-4 text-red-500" />
  }
}

function strengthBar(strength: number) {
  const pct = Math.round(strength * 100)
  const color =
    strength >= 0.7
      ? "bg-emerald-500"
      : strength >= 0.4
        ? "bg-amber-500"
        : "bg-orange-500"
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function CountCard({
  claim,
  countView,
  agentResponses,
  onAttachAllegation,
}: CountCardProps) {
  const [expandedElementId, setExpandedElementId] = useState<string | null>(null)
  const [expandedDefenseId, setExpandedDefenseId] = useState<string | null>(null)

  if (!countView || !claim) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Select a count from the left rail to begin.
      </div>
    )
  }

  const { count, elements, allegations, defenses, overallStrength, gapCount } =
    countView

  const countTitle = count.count_number
    ? `Count ${count.count_number} — ${count.count_label}`
    : count.count_label

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      {/* Header strip */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              {claim.claim_label || claim.claim_type || "Claim"}
            </div>
            <h2 className="mt-0.5 text-lg font-semibold text-zinc-100">
              {countTitle}
            </h2>
            {count.count_type && (
              <div className="mt-1 text-xs text-zinc-400">
                Cause of action:{" "}
                <span className="text-zinc-300">{count.count_type}</span>
              </div>
            )}
            <div className="mt-1 text-xs text-zinc-500">
              {claim.plaintiff ?? "—"}{" "}
              <span className="text-zinc-600">v.</span>{" "}
              {claim.defendant ?? "—"}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Strength
            </div>
            {strengthBar(overallStrength)}
            <div className="text-[10px] text-zinc-400">
              {Math.round(overallStrength * 100)}% ·{" "}
              {gapCount > 0 ? `${gapCount} gap${gapCount > 1 ? "s" : ""}` : "complete"}
            </div>
          </div>
        </div>
        {count.summary && (
          <p className="mt-3 border-t border-zinc-800 pt-3 text-xs leading-relaxed text-zinc-400">
            {count.summary}
          </p>
        )}
      </div>

      {/* Elements checklist */}
      <div className="glass rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">
            Legal Elements
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            {elements.length} element{elements.length !== 1 ? "s" : ""}
          </span>
        </div>
        {elements.length === 0 ? (
          <div className="text-xs text-zinc-500">
            No elements on file for this count.
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {elements.map((el) => (
              <ElementRow
                key={el.id}
                element={el}
                expanded={expandedElementId === el.id}
                onToggle={() =>
                  setExpandedElementId(
                    expandedElementId === el.id ? null : el.id,
                  )
                }
                onDropAllegation={(allegationId) =>
                  onAttachAllegation(allegationId, el.id)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Affirmative defenses */}
      <div className="glass rounded-xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">
            Affirmative Defenses
          </h3>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-500">
            {defenses.length} defense{defenses.length !== 1 ? "s" : ""}
          </span>
        </div>
        {defenses.length === 0 ? (
          <div className="text-xs text-zinc-500">
            No affirmative defenses identified for this cause of action.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {defenses.map((d) => (
              <DefenseRow
                key={d.id}
                defense={d}
                expanded={expandedDefenseId === d.id}
                onToggle={() =>
                  setExpandedDefenseId(
                    expandedDefenseId === d.id ? null : d.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Allegations map (when no element links) */}
      {allegations.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">
            Allegations ({allegations.length})
          </h3>
          <div className="flex flex-col gap-1">
            {allegations.slice(0, 20).map((al) => (
              <div
                key={al.id}
                className="rounded-md border border-zinc-800/60 px-3 py-1.5 text-[11px] text-zinc-300"
              >
                {al.allegation_number !== null && (
                  <span className="mr-2 text-zinc-500">
                    ¶{al.allegation_number}
                  </span>
                )}
                {al.allegation_text}
              </div>
            ))}
            {allegations.length > 20 && (
              <div className="mt-1 text-[10px] text-zinc-500">
                {allegations.length - 20} more…
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI reasoning trace */}
      <ReasoningTrace responses={agentResponses} />
    </div>
  )
}

function ReasoningTrace({ responses }: { responses: AgentResponseRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <div className="glass rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-zinc-200">AI Reasoning</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-500">
          {responses.length} trace{responses.length !== 1 ? "s" : ""}
        </span>
      </div>
      {responses.length === 0 ? (
        <div className="text-xs text-zinc-500">
          No agent runs for this count yet. Future agent calls tagged with this
          count_id will appear here with reasoning steps and provenance.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {responses.slice(0, 10).map((r) => {
            const open = openId === r.id
            const steps = Array.isArray(r.reasoning_steps)
              ? (r.reasoning_steps as unknown[])
              : []
            const prov = Array.isArray(r.provenance_links)
              ? (r.provenance_links as unknown[])
              : []
            return (
              <div
                key={r.id}
                className="rounded-md border border-zinc-800 bg-zinc-900/40"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left"
                >
                  {open ? (
                    <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-violet-300">
                        {r.agent_name ?? "agent"}
                      </span>
                      {r.confidence !== null && (
                        <span className="text-[10px] text-zinc-500">
                          {Math.round(r.confidence * 100)}%
                        </span>
                      )}
                      {r.needs_review && (
                        <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-amber-400">
                          review
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-300">
                      {r.query ?? r.answer ?? "(no content)"}
                    </div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-zinc-800 px-3 py-2">
                    {r.answer && (
                      <div className="mb-2 whitespace-pre-wrap text-[11px] text-zinc-300">
                        {r.answer}
                      </div>
                    )}
                    {steps.length > 0 && (
                      <div className="mb-2">
                        <div className="mb-1 text-[9px] uppercase tracking-wider text-zinc-500">
                          Reasoning steps
                        </div>
                        <ol className="list-decimal pl-4 text-[11px] text-zinc-400">
                          {steps.map((s, i) => (
                            <li key={i}>
                              {typeof s === "string" ? s : JSON.stringify(s)}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {prov.length > 0 && (
                      <div>
                        <div className="mb-1 text-[9px] uppercase tracking-wider text-zinc-500">
                          Provenance
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prov.map((p, i) => (
                            <span
                              key={i}
                              className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                            >
                              {typeof p === "string" ? p : JSON.stringify(p)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DefenseRow({
  defense,
  expanded,
  onToggle,
}: {
  defense: AffirmativeDefenseRow
  expanded: boolean
  onToggle: () => void
}) {
  const hasElements = defense.elements && defense.elements.length > 0
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        {hasElements ? (
          expanded ? (
            <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          )
        ) : (
          <span className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <div className="mt-0.5 text-[10px] text-zinc-500">
          {defense.defense_number ?? "•"}
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-zinc-200">
            {defense.defense_label}
          </div>
          {defense.defense_text && (
            <div className="mt-0.5 text-[11px] text-zinc-400">
              {defense.defense_text}
            </div>
          )}
          {defense.defense_source === "inferred_from_schema" && (
            <div className="mt-1 text-[10px] text-zinc-600">
              from standard schema
            </div>
          )}
        </div>
      </button>
      {expanded && hasElements && (
        <div className="border-t border-zinc-800 px-3 py-2">
          <div className="mb-1 text-[9px] uppercase tracking-wider text-zinc-500">
            Proof elements defendant would need
          </div>
          <ul className="list-disc pl-4 text-[11px] text-zinc-400">
            {defense.elements!.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ElementRow({
  element,
  expanded,
  onToggle,
  onDropAllegation,
}: {
  element: ElementView
  expanded: boolean
  onToggle: () => void
  onDropAllegation: (allegationId: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const srcBadge =
    element.element_source === "inferred_from_schema"
      ? "schema"
      : element.element_source === "extracted"
        ? "extracted"
        : "needs review"
  return (
    <div
      className={`rounded-md transition ${
        dragOver
          ? "bg-violet-500/10 ring-1 ring-violet-500/40"
          : "hover:bg-zinc-900/40"
      }`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault()
          e.dataTransfer.dropEffect = "link"
          if (!dragOver) setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DRAG_MIME)
        setDragOver(false)
        if (id) {
          e.preventDefault()
          onDropAllegation(id)
        }
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-2 py-2 text-left"
      >
        {statusIcon(element.status)}
        <span className="flex-1 text-xs text-zinc-200">
          {element.element_number !== null && (
            <span className="mr-1 text-zinc-500">
              ({element.element_number})
            </span>
          )}
          {element.element_text}
        </span>
        {strengthBar(element.strength)}
        <span className="w-12 text-right text-[10px] text-zinc-500">
          {element.supportingAllegations.length} cite
          {element.supportingAllegations.length !== 1 ? "s" : ""}
        </span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
          {srcBadge}
        </span>
      </button>
      {expanded && (
        <div className="ml-7 mb-2 border-l border-zinc-800 pl-3">
          {element.supportingAllegations.length === 0 ? (
            <div className="py-1 text-[11px] text-orange-400">
              GAP — no allegations cite this element. Suggested: attach
              supporting evidence from the locker.
            </div>
          ) : (
            element.supportingAllegations.map((al) => (
              <div
                key={al.id}
                className="py-1 text-[11px] text-zinc-400"
              >
                {al.allegation_number !== null && (
                  <span className="mr-1 text-zinc-600">
                    ¶{al.allegation_number}
                  </span>
                )}
                {al.allegation_text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
