import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { agent_response_id, review_action, correction_text, correction_notes } =
    await request.json()

  const { data, error } = await supabase
    .from("reviews")
    .insert({ agent_response_id, review_action, correction_text, correction_notes })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
