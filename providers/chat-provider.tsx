"use client"

import { createContext, useContext, useState, useCallback } from "react"
import type { AgentResponse } from "@/lib/types/agent-response"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  agentResponse?: AgentResponse
  timestamp: Date
}

interface ChatContextValue {
  messages: ChatMessage[]
  isStreaming: boolean
  sendMessage: (content: string, caseId: string) => Promise<void>
  clearHistory: () => void
}

const ChatContext = createContext<ChatContextValue>({
  messages: [],
  isStreaming: false,
  sendMessage: async () => {},
  clearHistory: () => {},
})

/**
 * ChatProvider — manages Legal Pad conversation history and streaming state.
 * Wired to the agent query handler in Phase 5.
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [isStreaming, setStreaming]  = useState(false)

  const sendMessage = useCallback(async (content: string, caseId: string) => {
    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)

    try {
      const res = await fetch("/api/query", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: content, case_id: caseId }),
      })
      if (!res.ok) throw new Error("Query failed")
      const data: AgentResponse = await res.json()

      const assistantMsg: ChatMessage = {
        id:            crypto.randomUUID(),
        role:          "assistant",
        content:       data.answer,
        agentResponse: data,
        timestamp:     new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errMsg: ChatMessage = {
        id:        crypto.randomUUID(),
        role:      "assistant",
        content:   "I encountered an error processing your query. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setStreaming(false)
    }
  }, [])

  const clearHistory = useCallback(() => setMessages([]), [])

  return (
    <ChatContext.Provider value={{ messages, isStreaming, sendMessage, clearHistory }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}
