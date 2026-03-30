import type { KGNodeType } from "@/lib/types/kg"

export const ENTITY_CONFIG: Record<
  KGNodeType,
  { label: string; icon: string; color: string; dotColor: string }
> = {
  party:            { label: "Party",           icon: "User",          color: "text-blue-400",   dotColor: "#60a5fa" },
  claim:            { label: "Claim",           icon: "Scale",         color: "text-red-400",    dotColor: "#f87171" },
  event:            { label: "Event",           icon: "Calendar",      color: "text-emerald-400",dotColor: "#34d399" },
  procedural_event: { label: "Filing",          icon: "Gavel",         color: "text-purple-400", dotColor: "#c084fc" },
  evidence:         { label: "Evidence",        icon: "FileCheck",     color: "text-amber-400",  dotColor: "#fbbf24" },
  legal_authority:  { label: "Legal Authority", icon: "BookOpen",      color: "text-cyan-400",   dotColor: "#22d3ee" },
  amount:           { label: "Amount",          icon: "DollarSign",    color: "text-green-400",  dotColor: "#4ade80" },
  obligation:       { label: "Obligation",      icon: "ClipboardList", color: "text-orange-400", dotColor: "#fb923c" },
  condition:        { label: "Condition",       icon: "GitBranch",     color: "text-pink-400",   dotColor: "#f472b6" },
}

/** Alias for backwards-compatibility with components using the old name. */
export const ENTITY_TYPE_CONFIG = ENTITY_CONFIG
