"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, CheckCheck, FileDown } from "lucide-react"
import { useCaseBoard } from "@/lib/hooks/use-case-board"
import { ClaimsTree } from "./claims-tree"
import { CountCard } from "./count-card"
import { EvidenceRail } from "./evidence-rail"

interface CaseBoardProps {
  caseId: string
}

export function CaseBoard({ caseId }: CaseBoardProps) {
  const { data, isLoading, error, attachAllegationToElement } =
    useCaseBoard(caseId)
  const [activeCountId, setActiveCountId] = useState<string | null>(null)

  // Default-select first count when data arrives
  useEffect(() => {
    if (!activeCountId && data?.flatCounts.length) {
      setActiveCountId(data.flatCounts[0].count.id)
    }
  }, [data, activeCountId])

  const { activeIndex, activeClaim, activeCountView } = useMemo(() => {
    if (!data || !activeCountId) {
      return { activeIndex: -1, activeClaim: null, activeCountView: null }
    }
    const idx = data.flatCounts.findIndex(
      (f) => f.count.id === activeCountId,
    )
    if (idx < 0) {
      return { activeIndex: -1, activeClaim: null, activeCountView: null }
    }
    const entry = data.flatCounts[idx]
    const claimView = data.claims.find((c) => c.claim.id === entry.claim.id)
    const countView = claimView?.counts.find(
      (c) => c.count.id === activeCountId,
    )
    return {
      activeIndex: idx,
      activeClaim: entry.claim,
      activeCountView: countView ?? null,
    }
  }, [data, activeCountId])

  const total = data?.flatCounts.length ?? 0

  const go = useCallback(
    (direction: 1 | -1) => {
      if (!data || total === 0) return
      const next = (activeIndex + direction + total) % total
      setActiveCountId(data.flatCounts[next].count.id)
    },
    [data, activeIndex, total],
  )

  // Keyboard arrows for stepper
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignore when typing in an input
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) {
        return
      }
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [go])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
        Loading case board…
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-4 text-xs text-red-400">
        Failed to load board: {error}
      </div>
    )
  }
  if (!data || data.flatCounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <div className="text-sm text-zinc-300">No counts in this case yet.</div>
        <div className="max-w-sm text-xs text-zinc-500">
          Once a pleading has been uploaded and processed by the pipeline,
          claims, counts, and elements will appear here.
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[16rem_1fr_20rem] grid-rows-[1fr_auto]">
      {/* Left rail */}
      <aside className="row-span-1 min-h-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950/40">
        <div className="border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500">
          Claims ({data.claims.length})
        </div>
        <ClaimsTree
          claims={data.claims}
          activeCountId={activeCountId}
          onSelectCount={setActiveCountId}
        />
        {data.theories.length > 0 && (
          <div className="border-t border-zinc-800 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
              Theories ({data.theories.length})
            </div>
            <div className="flex flex-col gap-1">
              {data.theories.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-zinc-800/60 px-2 py-1 text-[11px] text-zinc-300"
                >
                  {t.theory_label}
                  <div className="text-[9px] text-zinc-600">
                    {t.count_ids.length} count
                    {t.count_ids.length !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Center pane */}
      <main className="row-span-1 min-h-0">
        <CountCard
          claim={activeClaim}
          countView={activeCountView}
          agentResponses={
            activeCountId
              ? (data.agentResponsesByCount[activeCountId] ?? [])
              : []
          }
          onAttachAllegation={(allegationId, elementId) => {
            void attachAllegationToElement(allegationId, elementId)
          }}
        />
      </main>

      {/* Right rail */}
      <aside className="row-span-1 min-h-0 border-l border-zinc-800 bg-zinc-950/40">
        <EvidenceRail
          caseId={caseId}
          countView={activeCountView}
          unlinkedAllegations={
            activeCountId ? (data.unlinkedByCount[activeCountId] ?? []) : []
          }
        />
      </aside>

      {/* Stepper (full width) */}
      <footer className="col-span-3 flex items-center gap-3 border-t border-zinc-800 bg-zinc-950/60 px-4 py-2">
        <button
          type="button"
          onClick={() => go(-1)}
          className="flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800/60"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <div className="text-xs text-zinc-400">
          Count{" "}
          <span className="text-zinc-100">
            {activeIndex >= 0 ? activeIndex + 1 : "—"}
          </span>{" "}
          of <span className="text-zinc-100">{total}</span>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          className="flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800/60"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled
            className="flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-500"
            title="Wires up in Phase E"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark reviewed
          </button>
          <button
            type="button"
            disabled
            className="flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-500"
            title="Wires up in Phase E"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export memo
          </button>
        </div>
      </footer>
    </div>
  )
}
