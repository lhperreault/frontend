"use client"

import { useMemo } from "react"
import type { Section } from "@/lib/types/section"
import { useHoverSync } from "@/hooks/use-hover-sync"

interface EntityMinimapProps {
  entityName: string
  aliases: string[]
  sections: Section[]
}

/**
 * VS Code-style minimap strip for an entity card.
 *
 * A narrow 6px-wide vertical bar representing the entire document.
 * Each green tick marks a section where the entity name (or alias) appears.
 * Clicking a tick scrolls the LightBox to that section via HoverSyncContext.
 */
export function EntityMinimap({ entityName, aliases, sections }: EntityMinimapProps) {
  const { setHoverTarget } = useHoverSync()

  const totalPages = useMemo(
    () => Math.max(...sections.map((s) => s.end_page ?? 0), 1),
    [sections],
  )

  const mentions = useMemo(() => {
    const names = [entityName, ...aliases].map((n) => n.toLowerCase().trim()).filter(Boolean)
    return sections.filter((s) => {
      const text = (s.section_text ?? "").toLowerCase()
      return names.some((name) => text.includes(name))
    })
  }, [entityName, aliases, sections])

  if (mentions.length === 0) {
    // Show a faint empty bar so the layout is stable
    return (
      <div className="relative h-10 w-1.5 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" />
    )
  }

  return (
    <div className="relative h-10 w-1.5 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      {mentions.map((section) => {
        const position = ((section.start_page ?? 0) / totalPages) * 100
        return (
          <button
            key={section.id}
            type="button"
            title={`p. ${section.page_range ?? "?"} — ${section.section_title ?? "section"}`}
            onClick={(e) => {
              e.stopPropagation()
              setHoverTarget(section.id, section.anchor_id ?? undefined)
            }}
            className="absolute w-full cursor-pointer rounded-full bg-emerald-400 hover:bg-emerald-300"
            style={{ top: `${Math.min(position, 94)}%`, height: "3px" }}
          />
        )
      })}
    </div>
  )
}
