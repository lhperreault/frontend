// @ts-nocheck
"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { WhyToggle } from "./why-toggle"
import { ChatActions } from "./chat-actions"
import { formatProvenance } from "@/lib/utils/provenance"
import { confidenceToGlow } from "@/lib/constants/glow-colors"
import type { AgentResponse } from "@/lib/types/agent-response"
import { cn } from "@/lib/utils"

interface UserMessageProps {
  content: string
}

interface AssistantMessageProps {
  response: AgentResponse
  isSummary?: boolean
  onPinToCase?: (r: AgentResponse) => void
  onAddToTimeline?: (r: AgentResponse) => void
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="glass max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">
        {content}
      </div>
    </div>
  )
}

export function AssistantMessage({
  response,
  isSummary,
  onPinToCase,
  onAddToTimeline,
}: AssistantMessageProps) {
  const glow = confidenceToGlow(response.confidence)

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "glass rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm",
          isSummary ? "max-w-full" : "max-w-[92%]",
          `glow-${glow}`,
        )}
      >
        {isSummary ? (
          <div className="summary-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response.answer}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="leading-relaxed">{response.answer}</p>
        )}

        {response.provenance_links?.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-border/30 pt-2">
            {response.provenance_links.map((link, i) => (
              <li key={i} className="text-[10px] text-muted-foreground">
                {formatProvenance(link)}
              </li>
            ))}
          </ul>
        )}

        <WhyToggle steps={response.reasoning_steps} />
      </div>

      <ChatActions
        response={response}
        onPinToCase={onPinToCase}
        onAddToTimeline={onAddToTimeline}
      />
    </div>
  )
}
