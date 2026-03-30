/**
 * Builds a workspace URL that opens a specific document and optionally
 * scrolls to a specific section.
 *
 * Used consistently across: search results, entity cards, board cards,
 * timeline dots, and any other "jump to source" navigation.
 */
export function buildSectionUrl(
  caseId: string,
  documentId: string,
  sectionId?: string | null,
): string {
  const params = new URLSearchParams({ doc: documentId })
  if (sectionId) params.set("section", sectionId)
  return `/case/${caseId}/workspace?${params.toString()}`
}
