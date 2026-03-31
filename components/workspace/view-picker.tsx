"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ViewId, VIEW_LABELS } from "@/lib/types/workspace"

const ALL_VIEWS: ViewId[] = [
  "document",
  "ai-chat",
  "filter-search",
  "summary",
  "all-documents",
  "timeline",
  "claims-counts",
]

interface ViewPickerProps {
  current: ViewId
  onSelect: (viewId: ViewId) => void
}

export function ViewPicker({ current, onSelect }: ViewPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors",
          "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )}
      >
        {VIEW_LABELS[current]}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-border/40 bg-background shadow-lg">
          {ALL_VIEWS.map((viewId) => (
            <button
              key={viewId}
              onClick={() => {
                onSelect(viewId)
                setOpen(false)
              }}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-xs transition-colors",
                viewId === current
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {VIEW_LABELS[viewId]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
