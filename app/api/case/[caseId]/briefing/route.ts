import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const supabase = createServerClient()

  // Fetch the most recent checklist agent response for this case
  const { data, error } = await supabase
    .from("agent_responses")
    .select("*")
    .eq("case_id", caseId)
    .eq("agent_name", "checklist_agent")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No briefing yet — return pending state
    return NextResponse.json({ status: "pending", tasks: [] })
  }
  return NextResponse.json(data)
}
