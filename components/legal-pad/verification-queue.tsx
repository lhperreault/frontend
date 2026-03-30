"use client"

import { useReviewQueue } from "@/hooks/use-review-queue"
import { VerificationCard } from "./verification-card"

interface VerificationQueueProps {
  caseId: string
}

export function VerificationQueue({ caseId }: VerificationQueueProps) {
  const { items, isLoading, error, review } = useReviewQueue(caseId)

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Needs Review
        </p>
        {!isLoading && (
          <span className="text-[10px] text-muted-foreground">{items.length}</span>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass h-20 animate-pulse rounded-lg" />
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!isLoading && !error && items.length === 0 && (
          <p className="text-xs text-muted-foreground">No items pending review.</p>
        )}
        {items.map(item => (
          <VerificationCard key={item.id} item={item} onReview={review} />
        ))}
      </div>
    </div>
  )
}
