"use client"

import { useState } from "react"
import { FileSearch, MessageSquare, Globe, NotebookPen, GripVertical } from "lucide-react"
import type { AllegationRow, CountView } from "@/lib/types/case-board"
import { DRAG_MIME } from "./count-card"

interface EvidenceRailProps {
  caseId: string
  countView: CountView | null
  unlinkedAllegations: AllegationRow[]
}

type TabId = "evidence" | "copilot" | "outside" | "notes"

const TABS: { id: TabId; label: string; Icon: typeof FileSearch }[] = [
  { id: "evidence", label: "Evidence", Icon: FileSearch },
  { id: "copilot", label: "Copilot", Icon: MessageSquare },
  { id: "outside", label: "Outside", Icon: Globe },
  { id: "notes", label: "Notes", Icon: NotebookPen },
]

export function EvidenceRail({
  caseId,
  countView,
  unlinkedAllegations,
}: EvidenceRailProps) {
  const [tab, setTab] = useState<TabId>("evidence")

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-zinc-800 px-2 pt-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-[11px] transition ${
                active
                  ? "bg-zinc-800/80 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "evidence" && (
          <EvidenceTab
            countView={countView}
            unlinkedAllegations={unlinkedAllegations}
          />
        )}
        {tab === "copilot" && <CopilotTab caseId={caseId} countView={countView} />}
        {tab === "outside" && <OutsideTab />}
        {tab === "notes" && <NotesTab countView={countView} />}
      </div>
    </div>
  )
}

function EvidenceTab({
  countView,
  unlinkedAllegations,
}: {
  countView: CountView | null
  unlinkedAllegations: AllegationRow[]
}) {
  if (!countView) {
    return (
      <p className="text-[11px] text-zinc-500">
        Select a count to see its evidence.
      </p>
    )
  }
  const { evidenceLinks } = countView
  return (
    <div className="flex flex-col gap-3">
      {/* Unlinked allegations — draggable onto elements */}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          Unlinked allegations ({unlinkedAllegations.length})
        </div>
        {unlinkedAllegations.length === 0 ? (
          <div className="text-[11px] text-zinc-600">
            Every allegation for this count is already tied to an element.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {unlinkedAllegations.map((al) => (
              <DraggableAllegation key={al.id} allegation={al} />
            ))}
          </div>
        )}
        <div className="mt-1 text-[9px] text-zinc-600">
          Drag onto an element in the center to attach.
        </div>
      </div>

      {/* Evidence references already on the count */}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          Cited in pleading ({evidenceLinks.length})
        </div>
        {evidenceLinks.length === 0 ? (
          <div className="text-[11px] text-zinc-600">
            No exhibit/declaration references extracted for this count.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {evidenceLinks.map((ev) => (
              <div
                key={ev.id}
                className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5"
              >
                <div className="text-[11px] text-zinc-200">
                  {ev.evidence_reference}
                </div>
                {ev.evidence_type && (
                  <div className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
                    {ev.evidence_type}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableAllegation({ allegation }: { allegation: AllegationRow }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "link"
        e.dataTransfer.setData(DRAG_MIME, allegation.id)
      }}
      className="group flex cursor-grab items-start gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 active:cursor-grabbing hover:border-violet-500/50"
    >
      <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600 group-hover:text-violet-400" />
      <div className="flex-1 text-[11px] text-zinc-200">
        {allegation.allegation_number !== null && (
          <span className="mr-1 text-zinc-500">
            ¶{allegation.allegation_number}
          </span>
        )}
        {allegation.allegation_text}
      </div>
    </div>
  )
}

function CopilotTab({
  caseId: _caseId,
  countView,
}: {
  caseId: string
  countView: CountView | null
}) {
  return (
    <div className="text-[11px] text-zinc-500">
      Scoped Copilot chat wires up in Phase D. It will be bounded to
      {countView ? ` count ${countView.count.count_label}` : " the selected count"}
      {" "}and will exclude privileged notes from context.
    </div>
  )
}

function OutsideTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Globe className="h-8 w-8 text-zinc-700" />
      <div className="text-xs text-zinc-400">No connectors configured yet</div>
      <div className="max-w-[14rem] text-[10px] text-zinc-600">
        Case law, PACER, public records, and expert databases will plug in here
        as connectors in Phase D.
      </div>
    </div>
  )
}

function NotesTab({ countView: _countView }: { countView: CountView | null }) {
  return (
    <div className="text-[11px] text-zinc-500">
      Privileged attorney notes editor wires up in Phase D. Notes are stored in
      <code className="mx-1 rounded bg-zinc-900 px-1 py-0.5 text-[10px]">
        case_notes_privileged
      </code>
      with RLS locked to the author and are never sent to external AI tools.
    </div>
  )
}
