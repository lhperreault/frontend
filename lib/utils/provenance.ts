import type { ProvenanceLink } from "@/lib/types/agent-response"
import type { SearchProvenance } from "@/lib/types/search-result"

/** Build a display string for a provenance link */
export function formatProvenance(link: ProvenanceLink): string {
  const parts = [link.file_name]
  if (link.page_range) parts.push(`pp. ${link.page_range}`)
  if (link.document_type) parts.push(`(${link.document_type})`)
  return parts.join(", ")
}

/** Build an anchor href for deep-linking into the LightBox viewer */
export function provenanceHref(
  caseId: string,
  sectionId: string,
  anchorId?: string | null,
): string {
  const base = `/case/${caseId}/workspace?section=${sectionId}`
  return anchorId ? `${base}#${anchorId}` : base
}
