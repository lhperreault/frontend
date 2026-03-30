"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface CaseNavBarProps {
  caseId: string
}

const TABS = [
  { label: "Workspace", segment: "workspace" },
  { label: "Documents", segment: "documents" },
  { label: "Briefing",  segment: "briefing"  },
  { label: "Board",     segment: "board"     },
  { label: "Map",       segment: "map"       },
  { label: "Timeline",  segment: "timeline"  },
  { label: "Review",    segment: "review"    },
] as const

export function CaseNavBar({ caseId }: CaseNavBarProps) {
  const pathname = usePathname()

  return (
    <nav
      className="flex shrink-0 items-center overflow-x-auto border-b border-border/30 bg-background/60 px-2 backdrop-blur-sm"
      aria-label="Case views"
    >
      {TABS.map(({ label, segment }) => {
        const href = `/case/${caseId}/${segment}`
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={segment}
            href={href}
            className={cn(
              "shrink-0 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
