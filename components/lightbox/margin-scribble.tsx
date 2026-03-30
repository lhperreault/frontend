"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface MarginScribbleProps {
  sectionId: string
  reasoningSteps: string[]
  anchorId?: string
}

/**
 * AI sticky note in the document right margin.
 * Shows a condensed reasoning chain — first step visible, expand on click.
 * Framer Motion: fade in with slight slide from right.
 */
export function MarginScribble({ sectionId, reasoningSteps, anchorId }: MarginScribbleProps) {
  const [expanded, setExpanded] = useState(false)

  if (reasoningSteps.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "w-56 rounded-lg border-l-2 border-amber-400",
        "bg-slate-100 dark:bg-slate-800 shadow-sm",
        "p-2.5 text-xs",
      )}
      data-section-id={sectionId}
      data-anchor={anchorId}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-1 font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <span className="truncate text-[10px] uppercase tracking-wide">AI Reasoning</span>
        <span className="text-[10px] shrink-0 text-slate-400">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Preview of first step (collapsed) */}
      {!expanded && (
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {reasoningSteps[0]}
        </p>
      )}

      {/* Full reasoning chain (expanded) */}
      <AnimatePresence>
        {expanded && (
          <motion.ol
            key="steps"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-2 space-y-1.5 pl-3 text-[10px] text-slate-600 dark:text-slate-300 overflow-hidden"
          >
            {reasoningSteps.map((step, i) => (
              <li key={i} className="list-decimal leading-relaxed">
                {step}
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
