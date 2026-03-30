"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface WhyToggleProps {
  steps: string[]
}

/** Expandable reasoning chain for any AI suggestion */
export function WhyToggle({ steps }: WhyToggleProps) {
  const [open, setOpen] = useState(false)

  if (!steps.length) return null

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className={cn("transition-transform", open ? "rotate-90" : "")}>▶</span>
        Why?
      </button>
      {open && (
        <ol className="mt-1.5 space-y-0.5 pl-4 text-[10px] text-foreground/70">
          {steps.map((step, i) => (
            <li key={i} className="list-decimal">{step}</li>
          ))}
        </ol>
      )}
    </div>
  )
}
