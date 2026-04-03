"use client"

import { useRef, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { UserMessage, AssistantMessage } from "./chat-message"
import type { ChatState } from "@/hooks/use-chat-messages"
import type { KGNodeGrouped } from "@/lib/types/kg"
import { cn } from "@/lib/utils"

// ── Thinking indicator ────────────────────────────────────────────────────────

const THINKING_MESSAGES = [
  "Searching documents...",
  "Reading relevant sections...",
  "Checking the knowledge graph...",
  "Analysing evidence chains...",
  "Cross-referencing claims...",
  "Reviewing extractions...",
  "Preparing response...",
]

function ThinkingIndicator() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % THINKING_MESSAGES.length)
        setVisible(true)
      }, 200)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {/* Dots bubble */}
      <div className="flex max-w-[80%] items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      {/* Cycling verb label */}
      <div className="flex items-center gap-1.5 pl-1">
        <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
        <p
          className={cn(
            "text-xs text-muted-foreground transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          {THINKING_MESSAGES[idx]}
        </p>
      </div>
    </div>
  )
}

function SummaryLoadingIndicator() {
  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      <p className="mt-1 text-xs text-muted-foreground">Loading case summary...</p>
    </div>
  )
}

// ── ChatPane ──────────────────────────────────────────────────────────────────

interface ChatPaneProps extends ChatState {
  expanded?: boolean
  readOnly?: boolean
  entities?: KGNodeGrouped[]
}

export function ChatPane({
  messages,
  input,
  setInput,
  isLoading,
  isSummaryLoading,
  handleSubmit,
  expanded,
  readOnly,
  entities = [],
}: ChatPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Index of the last non-summary assistant message (gets entity highlights + TOC glow)
  const latestAssistantIdx = messages.reduceRight((found, msg, i) => {
    if (found !== -1) return found
    if (msg.type === "assistant" && !msg.isSummary) return i
    return -1
  }, -1)

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className={cn("flex-1 space-y-4 overflow-y-auto py-4", expanded ? "px-6" : "px-3")}>
        {isSummaryLoading && messages.length === 0 && <SummaryLoadingIndicator />}

        {!isSummaryLoading && messages.length === 0 && (
          <p className="pt-8 text-center text-xs text-muted-foreground">
            Ask about this case — parties, claims, obligations, timeline...
          </p>
        )}

        {messages.map((msg, i) =>
          msg.type === "user" ? (
            <UserMessage key={i} content={msg.content} />
          ) : (
            <AssistantMessage
              key={i}
              response={msg.response}
              isSummary={msg.isSummary}
              entities={msg.isSummary ? [] : entities}
              isLatest={i === latestAssistantIdx}
            />
          ),
        )}

        {isLoading && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input — hidden in read-only mode */}
      {readOnly && (
        <div className={cn("border-t border-border/30 py-2 text-center", expanded ? "px-4" : "px-3")}>
          <span className="text-[10px] text-muted-foreground/50 italic">Read-only history</span>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className={cn("border-t border-border/30", expanded ? "p-4" : "p-3", readOnly && "hidden")}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI..."
            disabled={isLoading}
            className={cn(
              "glass flex-1 rounded-lg border border-border/50 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50",
              expanded ? "py-3" : "py-2",
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "rounded-lg text-xs font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40",
              expanded ? "px-5 py-3" : "px-3 py-2",
            )}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
