"use client"

import { useEffect, useRef } from "react"
import { useHoverSync } from "@/hooks/use-hover-sync"

interface HoverSyncHandlerProps {
  containerRef: React.RefObject<HTMLElement | null>
}

/**
 * Connects the HoverSyncContext to the Light-Box scroll behavior.
 *
 * When hoveredSectionId or hoveredAnchorId is set (by the Legal Pad's why-toggle):
 * 1. Finds the target element (by anchor ID for XHTML, by data-section-id for text)
 * 2. Scrolls to it smoothly
 * 3. Applies a pulsing blue ring for 2 seconds, then removes it
 */
export function HoverSyncHandler({ containerRef }: HoverSyncHandlerProps) {
  const { hoveredSectionId, hoveredAnchorId } = useHoverSync()
  const activeElRef = useRef<HTMLElement | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Remove previous pulse
    if (activeElRef.current) {
      activeElRef.current.classList.remove("ring-2", "ring-blue-400", "animate-pulse")
      activeElRef.current = null
    }
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current)
      pulseTimerRef.current = null
    }

    if (!hoveredSectionId && !hoveredAnchorId) return

    // Find element — prefer anchor ID (precise, XHTML mode), fall back to section ID
    let el: HTMLElement | null = null
    if (hoveredAnchorId) {
      el = container.querySelector(`#${hoveredAnchorId}`) as HTMLElement | null
    }
    if (!el && hoveredSectionId) {
      el = container.querySelector(
        `[data-section-id="${hoveredSectionId}"]`,
      ) as HTMLElement | null
    }

    if (!el) return

    el.scrollIntoView({ behavior: "smooth", block: "center" })
    el.classList.add("ring-2", "ring-blue-400", "animate-pulse")
    activeElRef.current = el

    // Auto-remove pulse after 2 seconds
    pulseTimerRef.current = setTimeout(() => {
      el?.classList.remove("ring-2", "ring-blue-400", "animate-pulse")
      activeElRef.current = null
      pulseTimerRef.current = null
    }, 2000)
  }, [hoveredSectionId, hoveredAnchorId, containerRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
      if (activeElRef.current) {
        activeElRef.current.classList.remove("ring-2", "ring-blue-400", "animate-pulse")
      }
    }
  }, [])

  return null
}
