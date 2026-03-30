import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type { TimelineEvent } from "@/lib/types/timeline-event"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const partyFilter = request.nextUrl.searchParams.get("party_filter")
  const supabase = createServerClient()

  // 1. Fetch event/procedural_event nodes for this case
  const { data: nodes, error: nodesErr } = await supabase
    .from("kg_nodes")
    .select("*")
    .eq("case_id", caseId)
    .in("node_type", ["event", "procedural_event"])

  if (nodesErr) {
    return NextResponse.json({ error: nodesErr.message }, { status: 500 })
  }

  const nodeIds = (nodes ?? []).map((n) => n.id as string)

  // 2. Fetch involved_in edges to get party associations
  const { data: edges } = nodeIds.length
    ? await supabase
        .from("kg_edges")
        .select("*")
        .in("source_node_id", nodeIds)
        .eq("edge_type", "involved_in")
    : { data: [] }

  // 3. Build party lookup: nodeId → [party labels]
  const partyMap = new Map<string, string[]>()
  for (const edge of edges ?? []) {
    const list = partyMap.get(edge.source_node_id) ?? []
    if (edge.properties?.party_label) {
      list.push(edge.properties.party_label as string)
    }
    partyMap.set(edge.source_node_id, list)
  }

  // 4. Shape into TimelineEvent[]
  let events: TimelineEvent[] = (nodes ?? []).map((n) => {
    const props = (n.properties ?? {}) as Record<string, unknown>
    return {
      date_value: String(props.date_value ?? props.date ?? ""),
      date_sort_key: String(props.date_sort_key ?? props.date_value ?? props.date ?? ""),
      event_label: String(n.node_label),
      event_type: n.node_type as "event" | "procedural_event",
      node_id: n.id as string,
      involved_parties: partyMap.get(n.id as string) ?? [],
      source_section_id: (n.source_section_id as string) ?? null,
      source_document_id: (n.document_id as string) ?? null,
      confidence: (props.confidence as number) ?? 1,
      is_relative: Boolean(props.is_relative),
      reference_event: (props.reference_event as string) ?? null,
      properties: props,
    }
  })

  // 5. Optional party filter
  if (partyFilter) {
    events = events.filter((e) =>
      e.involved_parties.some((p) =>
        p.toLowerCase().includes(partyFilter.toLowerCase()),
      ),
    )
  }

  // 6. Sort by date_sort_key
  events.sort((a, b) => a.date_sort_key.localeCompare(b.date_sort_key))

  return NextResponse.json(events)
}
