import { createClient } from "./client"
import type { RealtimeChannel } from "@supabase/supabase-js"

type ChangeCallback = (payload: unknown) => void

/**
 * Subscribe to INSERT/UPDATE/DELETE on a single table with an optional eq filter.
 * Returns an unsubscribe function.
 */
export function subscribeToTable(
  tableName: string,
  filter: { column: string; value: string } | null,
  callback: ChangeCallback,
): () => void {
  const supabase = createClient()
  const channelName = filter
    ? `${tableName}:${filter.column}=eq.${filter.value}`
    : tableName

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      "postgres_changes" as Parameters<RealtimeChannel["on"]>[0],
      {
        event: "*",
        schema: "public",
        table: tableName,
        ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
      },
      callback,
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to changes on multiple tables filtered by case_id.
 * Returns an unsubscribe function that cleans up all channels.
 */
export function subscribeToCase(
  caseId: string,
  tables: string[] = ["documents", "extractions", "kg_nodes", "agent_responses"],
  callback: ChangeCallback,
): () => void {
  const unsubscribers = tables.map((table) =>
    subscribeToTable(table, { column: "case_id", value: caseId }, callback),
  )

  return () => {
    unsubscribers.forEach((unsub) => unsub())
  }
}
