"use client"

import { createContext, useContext, useState } from "react"

interface HoverSyncContextValue {
  hoveredSectionId: string | null
  hoveredAnchorId: string | null
  setHoverTarget: (sectionId: string, anchorId?: string) => void
  clearHoverTarget: () => void
}

const HoverSyncContext = createContext<HoverSyncContextValue>({
  hoveredSectionId: null,
  hoveredAnchorId: null,
  setHoverTarget: () => {},
  clearHoverTarget: () => {},
})

/**
 * HoverSyncProvider — shared hover state between Legal Pad and Light-Box Viewer.
 *
 * When the lawyer hovers over a provenance link in the Legal Pad, this context
 * propagates the target (sectionId + optional anchorId) to the LightBox, which
 * scrolls and highlights the corresponding source paragraph.
 */
export function HoverSyncProvider({ children }: { children: React.ReactNode }) {
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)
  const [hoveredAnchorId, setHoveredAnchorId] = useState<string | null>(null)

  const setHoverTarget = (sectionId: string, anchorId?: string) => {
    setHoveredSectionId(sectionId)
    setHoveredAnchorId(anchorId ?? null)
  }

  const clearHoverTarget = () => {
    setHoveredSectionId(null)
    setHoveredAnchorId(null)
  }

  return (
    <HoverSyncContext.Provider
      value={{ hoveredSectionId, hoveredAnchorId, setHoverTarget, clearHoverTarget }}
    >
      {children}
    </HoverSyncContext.Provider>
  )
}

export function useHoverSync() {
  return useContext(HoverSyncContext)
}
