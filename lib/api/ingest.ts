export interface PipelineEvent {
  phase?: number
  status?: "start" | "done" | "error"
  label?: string
  done?: boolean
  document_id?: string
  case_id?: string
}

/**
 * Upload a document and stream pipeline phase events as they arrive.
 * @param onEvent - called for each SSE event (phase updates + final done)
 */
export async function uploadDocument(
  caseId: string,
  file: File,
  onEvent: (event: PipelineEvent) => void,
): Promise<{ document_id: string }> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("case_id", caseId)

  const res = await fetch("/api/ingest", { method: "POST", body: formData })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Ingest error ${res.status}: ${error}`)
  }
  if (!res.body) throw new Error("No response body")

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const event: PipelineEvent = JSON.parse(line.slice(6))
      onEvent(event)
      if (event.done) return { document_id: event.document_id ?? "" }
    }
  }

  throw new Error("Pipeline stream closed without a completion event")
}
