"use client"

import { cn } from "@/lib/utils"
import { useWorkspace } from "@/providers/workspace-provider"

export function SlotCountToggle() {
  const { slots, setSlotCount } = useWorkspace()
  const count = slots.length as 1 | 2 | 3

  return (
    <div className="flex items-center gap-0.5 rounded border border-border/30 bg-muted/20 p-0.5">
      {([1, 2, 3] as const).map((n) => (
        <button
          key={n}
          onClick={() => setSlotCount(n)}
          title={`${n} panel${n > 1 ? "s" : ""}`}
          className={cn(
            "flex h-5 w-6 items-center justify-center rounded text-xs transition-colors",
            count === n
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {n === 1 && <span className="font-mono">▌</span>}
          {n === 2 && <span className="font-mono">▌▌</span>}
          {n === 3 && <span className="font-mono text-[9px]">▌▌▌</span>}
        </button>
      ))}
    </div>
  )
}
