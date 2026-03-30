"use client"

import { useState, useCallback } from "react"

export type PanelId = "shelf" | "lightbox" | "pad"

interface PanelState {
  collapsed: boolean
  width: number
}

const DEFAULT_WIDTHS: Record<PanelId, number> = {
  shelf: 280,
  lightbox: 600,
  pad: 340,
}

export function usePanelLayout() {
  const [panels, setPanels] = useState<Record<PanelId, PanelState>>({
    shelf: { collapsed: false, width: DEFAULT_WIDTHS.shelf },
    lightbox: { collapsed: false, width: DEFAULT_WIDTHS.lightbox },
    pad: { collapsed: false, width: DEFAULT_WIDTHS.pad },
  })

  const toggle = useCallback((id: PanelId) => {
    setPanels(prev => ({
      ...prev,
      [id]: { ...prev[id], collapsed: !prev[id].collapsed },
    }))
  }, [])

  const setWidth = useCallback((id: PanelId, width: number) => {
    setPanels(prev => ({ ...prev, [id]: { ...prev[id], width } }))
  }, [])

  const reset = useCallback(() => {
    setPanels({
      shelf: { collapsed: false, width: DEFAULT_WIDTHS.shelf },
      lightbox: { collapsed: false, width: DEFAULT_WIDTHS.lightbox },
      pad: { collapsed: false, width: DEFAULT_WIDTHS.pad },
    })
  }, [])

  return { panels, toggle, setWidth, reset }
}
