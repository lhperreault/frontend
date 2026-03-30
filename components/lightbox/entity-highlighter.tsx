"use client"

import { useEffect } from "react"
import type { KGNode, KGNodeType } from "@/lib/types/kg"
import { ENTITY_TYPE_CONFIG } from "@/lib/constants/entity-types"

interface EntityHighlighterProps {
  entities: KGNode[]
  containerRef: React.RefObject<HTMLDivElement | null>
}

/** Semi-transparent highlight color per entity type */
const MARK_BG: Record<KGNodeType, string> = {
  party:            "rgba(96,165,250,0.15)",
  claim:            "rgba(248,113,113,0.15)",
  event:            "rgba(52,211,153,0.15)",
  procedural_event: "rgba(192,132,252,0.15)",
  evidence:         "rgba(251,191,36,0.15)",
  legal_authority:  "rgba(34,211,238,0.15)",
  amount:           "rgba(74,222,128,0.15)",
  obligation:       "rgba(251,146,60,0.15)",
  condition:        "rgba(244,114,182,0.15)",
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Text-level entity highlighting.
 *
 * Walks the document container's text nodes and wraps any occurrence of an
 * entity name (or alias) in a styled <mark> element.  On hover, a floating
 * tooltip shows the entity type and confidence.
 *
 * This is additive and does NOT interfere with DocumentHighlighter, which
 * applies box-shadow / background-color on section-level elements.
 *
 * Cleanup: on unmount or when deps change, all injected marks are replaced
 * with plain text nodes and the parent is normalized.
 */
export function EntityHighlighter({ entities, containerRef }: EntityHighlighterProps) {
  useEffect(() => {
    const container = containerRef.current
    if (!container || entities.length === 0) return

    // ── Build term list ──────────────────────────────────────────────────────
    type Term = {
      pattern: string
      type: KGNodeType
      label: string
      confidence: number
    }
    const terms: Term[] = []

    for (const entity of entities) {
      const names: string[] = [entity.node_label]
      if (Array.isArray(entity.properties?.aliases)) {
        names.push(...(entity.properties.aliases as string[]))
      }
      for (const name of names) {
        const trimmed = name.trim()
        if (trimmed.length < 3) continue // skip initials / very short tokens
        terms.push({
          pattern: escapeRegex(trimmed),
          type: entity.node_type,
          label: entity.node_label,
          confidence: (entity.properties?.confidence as number) ?? 1,
        })
      }
    }

    if (terms.length === 0) return

    // Longer patterns first — prevents short names from stealing long matches
    terms.sort((a, b) => b.pattern.length - a.pattern.length)

    // ── Walk text nodes ──────────────────────────────────────────────────────
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let p = node.parentElement
        while (p && p !== container) {
          const tag = p.tagName?.toLowerCase()
          // Skip nodes already inside a <mark> or invisible elements
          if (tag === "mark" || tag === "script" || tag === "style") {
            return NodeFilter.FILTER_REJECT
          }
          p = p.parentElement
        }
        return NodeFilter.FILTER_ACCEPT
      },
    })

    const textNodes: Text[] = []
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

    const insertedMarks: HTMLElement[] = []

    for (const textNode of textNodes) {
      const text = textNode.textContent ?? ""
      if (!text.trim()) continue

      // Find all matches across all terms
      const matches: Array<{ start: number; end: number; termIdx: number }> = []
      for (let ti = 0; ti < terms.length; ti++) {
        const regex = new RegExp(`\\b${terms[ti].pattern}\\b`, "gi")
        let m: RegExpExecArray | null
        while ((m = regex.exec(text)) !== null) {
          matches.push({ start: m.index, end: m.index + m[0].length, termIdx: ti })
        }
      }

      if (matches.length === 0) continue

      // Sort by position; drop overlapping matches (keep first / longest)
      matches.sort((a, b) => a.start - b.start)
      const kept: typeof matches = []
      let lastEnd = 0
      for (const m of matches) {
        if (m.start >= lastEnd) {
          kept.push(m)
          lastEnd = m.end
        }
      }

      const parent = textNode.parentNode
      if (!parent) continue

      // Rebuild the text node as a mix of plain text + mark elements
      const frag = document.createDocumentFragment()
      let pos = 0
      for (const m of kept) {
        if (m.start > pos) {
          frag.appendChild(document.createTextNode(text.slice(pos, m.start)))
        }
        const term = terms[m.termIdx]
        const mark = document.createElement("mark")
        mark.style.cssText = [
          `background-color:${MARK_BG[term.type] ?? MARK_BG.party}`,
          "border-radius:2px",
          "padding:0 2px",
          "cursor:default",
        ].join(";")
        mark.setAttribute("data-entity-label", term.label)
        mark.setAttribute(
          "data-entity-type",
          ENTITY_TYPE_CONFIG[term.type]?.label ?? term.type,
        )
        mark.setAttribute(
          "data-entity-conf",
          String((term.confidence * 100).toFixed(0)),
        )
        mark.textContent = text.slice(m.start, m.end)
        frag.appendChild(mark)
        insertedMarks.push(mark)
        pos = m.end
      }
      if (pos < text.length) {
        frag.appendChild(document.createTextNode(text.slice(pos)))
      }
      parent.replaceChild(frag, textNode)
    }

    // ── Floating tooltip via event delegation ────────────────────────────────
    const tooltip = document.createElement("div")
    tooltip.style.cssText = [
      "position:fixed",
      "z-index:9999",
      "pointer-events:none",
      "background:rgba(15,23,42,0.92)",
      "color:#e2e8f0",
      "border:1px solid rgba(255,255,255,0.1)",
      "border-radius:6px",
      "padding:6px 10px",
      "font-size:11px",
      "line-height:1.5",
      "max-width:240px",
      "display:none",
      "backdrop-filter:blur(4px)",
    ].join(";")
    document.body.appendChild(tooltip)

    const handleOver = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName?.toLowerCase() !== "mark") return
      const label = target.getAttribute("data-entity-label") ?? ""
      const type  = target.getAttribute("data-entity-type") ?? ""
      const conf  = target.getAttribute("data-entity-conf") ?? ""
      tooltip.innerHTML = `<strong style="display:block;margin-bottom:2px">${label}</strong>${type} · ${conf}% confidence`
      const rect = target.getBoundingClientRect()
      tooltip.style.top  = `${rect.bottom + 6}px`
      tooltip.style.left = `${Math.min(rect.left, window.innerWidth - 256)}px`
      tooltip.style.display = "block"
    }

    const handleOut = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName?.toLowerCase() !== "mark") return
      tooltip.style.display = "none"
    }

    container.addEventListener("mouseover", handleOver)
    container.addEventListener("mouseout", handleOut)

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      container.removeEventListener("mouseover", handleOver)
      container.removeEventListener("mouseout", handleOut)
      tooltip.remove()
      for (const mark of insertedMarks) {
        const p = mark.parentNode
        if (!p) continue
        p.replaceChild(document.createTextNode(mark.textContent ?? ""), mark)
        // Merge adjacent text nodes left by the replacement
        ;(p as Element | DocumentFragment).normalize?.()
      }
    }
  }, [entities, containerRef])

  return null
}
