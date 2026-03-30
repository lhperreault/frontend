export type KGNodeType =
  | "party"
  | "claim"
  | "event"
  | "procedural_event"
  | "evidence"
  | "legal_authority"
  | "amount"
  | "obligation"
  | "condition"

/** Alias for backwards-compatibility with components using the old name. */
export type NodeType = KGNodeType

export interface KGNode {
  id: string
  document_id: string
  case_id: string
  node_type: KGNodeType
  node_label: string             // display name
  properties: Record<string, unknown> // date_value, confidence, aliases, etc.
  source_section_id: string | null
  source_extraction_id: string | null
  canonical_node_id: string | null // set by cross-doc merge (04B)
}

/**
 * A canonical KGNode enriched with its cross-document duplicates.
 * Produced by use-entities after grouping by canonical_node_id.
 */
export interface KGNodeGrouped extends KGNode {
  instances: KGNode[] // other nodes with canonical_node_id === this node's id
}

export interface KGEdge {
  id: string
  source_node_id: string
  target_node_id: string
  edge_type: string              // "alleged_by", "supported_by", "involved_in", "obligated_to", etc.
  edge_scope: "intra_document" | "cross_document"
  properties: Record<string, unknown>
  confidence: number
  source_section_id: string | null
  source_document_id: string | null
}
