"use client"

import type { LucideIcon } from "lucide-react"
import { BoardCard, type BoardCardData } from "./board-card"

interface BoardColumnProps {
  title:     string
  Icon?:     LucideIcon
  cards:     BoardCardData[]
  emptyNote?: string
}

export function BoardColumn({ title, Icon, cards, emptyNote }: BoardColumnProps) {
  return (
    <div className="glass flex h-full min-w-[13rem] max-w-[15rem] flex-col gap-2 rounded-xl p-3">
      {/* Column header */}
      <div className="flex shrink-0 items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
        <p className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground">
          {cards.length}
        </span>
      </div>

      {/* Card list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {cards.length === 0 && emptyNote && (
          <p className="px-1 py-8 text-center text-[10px] italic text-muted-foreground/50">
            {emptyNote}
          </p>
        )}
        {cards.map((card) => (
          <BoardCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
