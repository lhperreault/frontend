"use client"

import { useEffect } from "react"
import type { Extraction } from "@/lib/types/extraction"
import type { Section } from "@/lib/types/section"
import type { Review } from "@/lib/types/review"
import { GLOW, GLOW_BORDER } from "@/lib/constants/glow-colors"

interface DocumentHighlighterProps {
  extractions: Extraction[]
  sections?: Section[]
  reviews?: Review[]
  containerRef: React.RefObject<HTMLDivElement | null>
  isXhtml?: boolean
}

/**
 * Applies glow overlays to document elements based on extraction confidence.
 *
 * XHTML mode: targets elements by anchor_id (id attribute from ai-chunk-NNNNN),
 *   applies box-shadow using GLOW_BORDER colors.
 * Text mode: targets section blocks by data-section-id, applies background
 *   using GLOW colors.
 *
 * Color scheme:
 *   - confidence >= 0.85 → verified (green)
 *   - confidence >= 0.70 → unverified (amber)
 *   - confidence <  0.70 → lowConfidence (gray, faded)
 */
export function DocumentHighlighter({
  extractions,
  sections = [],
  reviews = [],
  containerRef,
  isXhtml = false,
}: DocumentHighlighterProps) {
  useEffect(() => {
    const container = containerRef.current
    if (!container || extractions.length === 0) return

    // Build section_id → anchor_id lookup for XHTML mode
    const sectionAnchorMap = new Map<string, string>(
      sections
        .filter((s) => s.anchor_id != null)
        .map((s) => [s.id, s.anchor_id!]),
    )

    const appliedEls: Array<{ el: HTMLElement; prev: Partial<CSSStyleDeclaration> }> = []

    // Deduplicate: one glow per section (take highest confidence)
    const bestBySection = new Map<string, Extraction>()
    for (const ext of extractions) {
      if (!ext.section_id) continue // skip extractions not linked to a section
      const key = ext.section_id
      const existing = bestBySection.get(key)
      if (!existing || ext.confidence > existing.confidence) {
        bestBySection.set(key, ext)
      }
    }

    let matched = 0
    let missed = 0

    for (const ext of bestBySection.values()) {
      let el: HTMLElement | null = null

      if (isXhtml) {
        const anchorId = sectionAnchorMap.get(ext.section_id)
        if (anchorId) {
          el = container.querySelector(`#${anchorId}`) as HTMLElement | null
        }
      } else {
        el = container.querySelector(
          `[data-section-id="${ext.section_id}"]`,
        ) as HTMLElement | null
      }

      if (!el) { missed++; continue }
      matched++

      // Determine glow level
      let key: keyof typeof GLOW
      if (ext.confidence >= 0.85) key = "verified"
      else if (ext.confidence >= 0.7) key = "unverified"
      else key = "lowConfidence"

      // Save previous styles for cleanup
      const prev: Partial<CSSStyleDeclaration> = {
        boxShadow: el.style.boxShadow,
        backgroundColor: el.style.backgroundColor,
        borderLeft: el.style.borderLeft,
        paddingLeft: el.style.paddingLeft,
        borderRadius: el.style.borderRadius,
        transition: el.style.transition,
      }
      appliedEls.push({ el, prev })

      if (isXhtml) {
        el.style.boxShadow = `0 0 0 2px ${GLOW_BORDER[key]}, 0 0 8px ${GLOW[key]}`
        el.style.borderRadius = "2px"
        el.style.transition = "box-shadow 0.2s"
      } else {
        el.style.backgroundColor = GLOW[key]
        el.style.borderLeft = `3px solid ${GLOW_BORDER[key]}`
        el.style.paddingLeft = "8px"
        el.style.borderRadius = "2px"
        el.style.transition = "background-color 0.2s"
      }
    }

    if (process.env.NODE_ENV !== "production") {
      if (missed > 0) {
        console.warn(
          `[DocumentHighlighter] ${matched} sections highlighted, ${missed} section_ids not found in DOM.`,
          `Mode: ${isXhtml ? "xhtml" : "text"}. First missing section_id:`,
          [...bestBySection.keys()].find(
            (sid) => !container.querySelector(`[data-section-id="${sid}"]`),
          ),
        )
      } else {
        console.info(`[DocumentHighlighter] Applied glows to ${matched} sections.`)
      }
    }

    return () => {
      for (const { el, prev } of appliedEls) {
        el.style.boxShadow = prev.boxShadow ?? ""
        el.style.backgroundColor = prev.backgroundColor ?? ""
        el.style.borderLeft = prev.borderLeft ?? ""
        el.style.paddingLeft = prev.paddingLeft ?? ""
        el.style.borderRadius = prev.borderRadius ?? ""
        el.style.transition = prev.transition ?? ""
      }
    }
  }, [extractions, sections, reviews, containerRef, isXhtml])

  return null
}
