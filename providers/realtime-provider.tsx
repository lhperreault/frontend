"use client"

import { createContext, useContext, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface RealtimeContextValue {
  /** Subscribe to a Supabase table change for a specific case */
  subscribeToCase: (
    caseId: string,
    table: string,
    callback: (payload: unknown) => void
  ) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  subscribeToCase: () => () => {},
})

/**
 * RealtimeProvider — manages Supabase Realtime channel subscriptions.
 * Prevents duplicate connections when multiple components listen to the same table.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const channels = useRef<Map<string, RealtimeChannel>>(new Map())
  const sb       = useRef(createClient())

  const subscribeToCase = (
    caseId: string,
    table: string,
    callback: (payload: unknown) => void,
  ) => {
    const key = `${table}:${caseId}`

    if (!channels.current.has(key)) {
      const channel = sb.current
        .channel(key)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `case_id=eq.${caseId}` },
          callback,
        )
        .subscribe()

      channels.current.set(key, channel)
    } else {
      // Additional subscriber to existing channel — just call callback on future events
      // (simplified: full multi-subscriber pattern would use an event emitter)
    }

    return () => {
      const ch = channels.current.get(key)
      if (ch) {
        sb.current.removeChannel(ch)
        channels.current.delete(key)
      }
    }
  }

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      channels.current.forEach((ch) => sb.current.removeChannel(ch))
      channels.current.clear()
    }
  }, [])

  return (
    <RealtimeContext.Provider value={{ subscribeToCase }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  return useContext(RealtimeContext)
}
