"use client"

import { ChevronDown, ChevronRight, AlertCircle, Scale } from "lucide-react"
import { useState } from "react"
import type { ClaimView, CountView } from "@/lib/types/case-board"

interface ClaimsTreeProps {
  claims: ClaimView[]
  activeCountId: string | null
  onSelectCount: (countId: string) => void
}

function strengthDotColor(strength: number): string {
  if (strength >= 0.7) return "bg-emerald-500"
  if (strength >= 0.4) return "bg-amber-500"
  if (strength > 0) return "bg-orange-500"
  return "bg-zinc-600"
}

export function ClaimsTree({
  claims,
  activeCountId,
  onSelectCount,
}: ClaimsTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (claimId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(claimId)) next.delete(claimId)
      else next.add(claimId)
      return next
    })
  }

  if (claims.length === 0) {
    return (
      <div className="p-4 text-xs text-zinc-500">
        No claims extracted for this case yet. Upload a pleading to populate.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {claims.map((cv) => {
        const isCollapsed = collapsed.has(cv.claim.id)
        const claimLabel =
          cv.claim.claim_label || cv.claim.claim_type || "Unlabeled claim"
        return (
          <div key={cv.claim.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggle(cv.claim.id)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800/60"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              )}
              <Scale className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">{claimLabel}</span>
              <span className="ml-auto shrink-0 text-[10px] text-zinc-500">
                {cv.counts.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-800 pl-2">
                {cv.counts.map((cnt) => (
                  <CountRow
                    key={cnt.count.id}
                    countView={cnt}
                    active={cnt.count.id === activeCountId}
                    onClick={() => onSelectCount(cnt.count.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CountRow({
  countView,
  active,
  onClick,
}: {
  countView: CountView
  active: boolean
  onClick: () => void
}) {
  const { count, gapCount, overallStrength } = countView
  const label =
    count.count_label ||
    (count.count_number ? `Count ${count.count_number}` : "Unlabeled count")
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] transition ${
        active
          ? "bg-zinc-700/80 text-zinc-50"
          : "text-zinc-300 hover:bg-zinc-800/60"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${strengthDotColor(
          overallStrength,
        )}`}
      />
      <span className="truncate">{label}</span>
      {gapCount > 0 && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-amber-400">
          <AlertCircle className="h-3 w-3" />
          {gapCount}
        </span>
      )}
    </button>
  )
}
