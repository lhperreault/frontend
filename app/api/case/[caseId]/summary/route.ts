import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("agent_responses")
    .select("*")
    .eq("case_id", caseId)
    .eq("session_id", "document_summary")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ status: "pending" }, { status: 404 })
  }

  return NextResponse.json(data)
}
