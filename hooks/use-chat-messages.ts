"use client"

import { useState, useCallback, useEffect } from "react"
import { useAgentQuery } from "@/hooks/use-agent-query"
import type { AgentResponse } from "@/lib/types/agent-response"

export type ChatMessage =
  | { type: "user"; content: string }
  | { type: "assistant"; response: AgentResponse; isSummary?: boolean }

export interface ChatState {
  messages: ChatMessage[]
  input: string
  setInput: (v: string) => void
  isLoading: boolean
  isSummaryLoading: boolean
  handleSubmit: (e: React.FormEvent) => void
}

/**
 * Encapsulates chat message state so it can be shared between
 * the panel view and the expanded Sheet view without losing history.
 *
 * On mount, fetches the AI-generated case summary from Supabase and
 * injects it as the first assistant message so the legal pad opens
 * pre-populated with a professional case briefing.
 */
export function useChatMessages(caseId: string): ChatState {
  const { send, isLoading } = useAgentQuery(caseId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)

  // Load the document summary as the opening message
  useEffect(() => {
    let cancelled = false
    setIsSummaryLoading(true)

    fetch(`/api/case/${caseId}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.answer) {
          setMessages([{ type: "assistant", response: data, isSummary: true }])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsSummaryLoading(false)
      })

    return () => { cancelled = true }
  }, [caseId])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const q = input.trim()
      if (!q || isLoading) return
      setInput("")
      setMessages((prev) => [...prev, { type: "user", content: q }])
      const response = await send(q)
      if (response) {
        setMessages((prev) => [...prev, { type: "assistant", response }])
      }
    },
    [input, isLoading, send],
  )

  return { messages, input, setInput, isLoading, isSummaryLoading, handleSubmit }
}
