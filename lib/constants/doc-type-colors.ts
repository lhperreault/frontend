// Color mapping for document type categories (timeline dots, board cards, badges)
// Keyed by the prefix before " - " in document_type strings
export const DOC_TYPE_COLORS: Record<string, string> = {
  Contract:      "bg-blue-500",
  Pleading:      "bg-red-500",
  Communication: "bg-green-500",
  Financial:     "bg-amber-500",
  Corporate:     "bg-purple-500",
  Evidence:      "bg-cyan-500",
  Regulatory:    "bg-pink-500",
  Court:         "bg-indigo-500",
  Discovery:     "bg-orange-500",
}

export function getDocTypeColor(documentType: string | null): string {
  if (!documentType) return "bg-slate-500"
  const prefix = documentType.split(" - ")[0]
  return DOC_TYPE_COLORS[prefix] ?? "bg-slate-500"
}
