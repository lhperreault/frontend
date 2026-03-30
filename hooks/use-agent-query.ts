// @ts-nocheck
"use client"

import { useState, useCallback } from "react"
import { queryAgent } from "@/lib/api/query"
import type { AgentResponse } from "@/lib/types/agent-response"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function useAgentQuery(caseId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Message[]>([])

  const send = useCallback(async (question: string): Promise<AgentResponse | null> => {
    setIsLoading(true)
    setError(null)
    const userMsg: Message = { role: "user", content: question }
    setHistory(prev => [...prev, userMsg])

    try {
      const response = await queryAgent({ question, caseId, conversationHistory: history })
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

  const clearHistory = useCallback(() => setHistory([]), [])

  return { send, isLoading, error, history, clearHistory }
}
