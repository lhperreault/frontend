// @ts-nocheck
"use client"

import type { NodeType } from "@/lib/types/kg"
import { ENTITY_TYPE_CONFIG } from "@/lib/constants/entity-types"
import { cn } from "@/lib/utils"

interface EntityFilterProps {
  activeTypes: Set<NodeType>
  onToggle: (type: NodeType) => void
  search: string
  onSearchChange: (value: string) => void
  showLowConf: boolean
  onToggleLowConf: () => void
}

export function EntityFilter({
  activeTypes,
  onToggle,
  search,
  onSearchChange,
  showLowConf,
  onToggleLowConf,
}: EntityFilterProps) {
  const types = Object.entries(ENTITY_TYPE_CONFIG) as [NodeType, typeof ENTITY_TYPE_CONFIG[NodeType]][]

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Filter entities..."
        className="glass w-full rounded-lg border border-border/50 bg-transparent px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex flex-wrap gap-1">
        {types.map(([type, config]) => {
          const active = activeTypes.size === 0 || activeTypes.has(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggle(type)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                active ? "opacity-100" : "opacity-40 hover:opacity-70",
              )}
              style={{
                color: config.dotColor,
                backgroundColor: `${config.dotColor}1a`,
              }}
            >
              {config.label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onToggleLowConf}
        className={cn(
          "text-[10px] transition-colors",
          showLowConf ? "text-muted-foreground" : "text-muted-foreground/40",
        )}
      >
        {showLowConf ? "✓" : "○"} Show low confidence
      </button>
    </div>
  )
}
