export function formatTimelineDate(dateValue: string | null | undefined, isRelative?: boolean): string {
  if (!dateValue) return "Unknown date"
  if (isRelative) return dateValue // "30 days after execution"
  const d = new Date(dateValue)
  if (isNaN(d.getTime())) return dateValue // unparseable — show raw string
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
