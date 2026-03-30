"use client"

import { useRef, useEffect, useState } from "react"
import { UserMessage, AssistantMessage } from "./chat-message"
import type { ChatState } from "@/hooks/use-chat-messages"
import { cn } from "@/lib/utils"

const THINKING_MESSAGES = [
  "Searching documents...",
  "Reading relevant sections...",
  "Checking the knowledge graph...",
  "Analyzing evidence chains...",
  "Preparing response...",
]

function ThinkingIndicator() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % THINKING_MESSAGES.length),
      2500,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex max-w-[80%] items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="pl-1 text-xs text-slate-400">{THINKING_MESSAGES[idx]}</p>
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

interface ChatPaneProps extends ChatState {
  /** When true, renders in expanded Sheet mode (wider input, more breathing room) */
  expanded?: boolean
}

export function ChatPane({
  messages,
  input,
  setInput,
  isLoading,
  isSummaryLoading,
  handleSubmit,
  expanded,
}: ChatPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

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
            />
          ),
        )}

        {isLoading && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className={cn("border-t border-border/30", expanded ? "p-4" : "p-3")}
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
