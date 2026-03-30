"use client"

import type { AgentResponse } from "@/lib/types/agent-response"

interface ChatActionsProps {
  response: AgentResponse
  onPinToCase?: (response: AgentResponse) => void
  onAddToTimeline?: (response: AgentResponse) => void
}

export function ChatActions({ response, onPinToCase, onAddToTimeline }: ChatActionsProps) {
  return (
    <div className="mt-1.5 flex gap-2">
      {onPinToCase && (
        <button
          type="button"
          onClick={() => onPinToCase(response)}
          className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          Pin to case
        </button>
      )}
      {onAddToTimeline && (
        <button
          type="button"
          onClick={() => onAddToTimeline(response)}
          className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          Add to timeline
        </button>
      )}
    </div>
  )
}
