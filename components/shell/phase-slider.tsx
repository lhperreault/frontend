// @ts-nocheck
"use client"

import { usePhase } from "@/providers/case-provider"
import { cn } from "@/lib/utils"
import { PHASES, type Phase } from "@/lib/constants/phases"

/**
 * Phase Slider — horizontal toggle immediately below Case Pulse.
 * Switches the UI emphasis between Triage / Discovery / Trial Prep.
 * Phase is stored in URL params (?phase=triage) so layouts are bookmarkable.
 */
export function PhaseSlider() {
  const { phase, setPhase } = usePhase()

  return (
    <div className="flex items-center justify-center gap-1 h-9 px-4 border-b border-border/30 shrink-0 bg-background/60 backdrop-blur-sm">
      {PHASES.map((p) => (
        <button
          key={p.id}
          onClick={() => setPhase(p.id)}
          className={cn(
            "px-4 py-1 text-xs font-medium rounded-full transition-all duration-150",
            phase === p.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
