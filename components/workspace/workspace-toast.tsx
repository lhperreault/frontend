"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Info, X } from "lucide-react"
import { useWorkspace } from "@/providers/workspace-provider"

/**
 * Floating toast that renders inside the workspace viewport.
 * Driven by WorkspaceProvider.toast — auto-dismisses after 3s.
 * Used to surface guidance like "Open a Document view to navigate there."
 */
export function WorkspaceToast() {
  const { toast, clearToast } = useWorkspace()

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key="workspace-toast"
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute bottom-12 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-xs font-medium text-foreground/80">{toast}</span>
            <button
              type="button"
              onClick={clearToast}
              className="ml-1 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
