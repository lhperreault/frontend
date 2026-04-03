// @ts-nocheck
"use client"

import { useState, useCallback, useRef } from "react"
import { queryAgent } from "@/lib/api/query"
import type { AgentResponse } from "@/lib/types/agent-response"

interface Message {
  role: "user" | "assistant"
  content: string
}

/**
 * Manages agent queries for a single conversation session.
 *
 * A stable session_id is generated when the hook mounts (or when
 * newSession() is called). This ID is passed to every /api/query call
 * so the backend can tie them together in the same LangGraph thread,
 * enabling genuine multi-turn memory.
 */
export function useAgentQuery(caseId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Message[]>([])

  // Stable per-conversation session ID — persists across re-renders,
  // reset only when newSession() is called.
  const sessionIdRef = useRef<string>(crypto.randomUUID())

  const send = useCallback(async (question: string): Promise<AgentResponse | null> => {
    setIsLoading(true)
    setError(null)
    const userMsg: Message = { role: "user", content: question }
    setHistory(prev => [...prev, userMsg])

    try {
      const response = await queryAgent({
        question,
        caseId,
        sessionId: sessionIdRef.current,
        conversationHistory: history,
      })
      const assistantMsg: Message = { role: "assistant", content: response.answer }
      setHistory(prev => [...prev, assistantMsg])
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed")
      return null
    } finally {
      setIsLoading(false)
    }
  }, [caseId, history])

  /** Start a brand-new conversation thread (new session_id, cleared history). */
  const newSession = useCallback(() => {
    sessionIdRef.current = crypto.randomUUID()
    setHistory([])
    setError(null)
  }, [])

  /** @deprecated Use newSession() — kept for back-compat with resetChat callers. */
  const clearHistory = newSession

  return {
    send,
    isLoading,
    error,
    history,
    sessionId: sessionIdRef.current,
    newSession,
    clearHistory,
  }
}
