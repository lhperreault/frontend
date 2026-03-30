"use client"

interface TimeTravelFilterProps {
  value: Date | null
  onChange: (date: Date | null) => void
}

export function TimeTravelFilter({ value, onChange }: TimeTravelFilterProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value ? new Date(e.target.value) : null)
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">View as of</span>
      <input
        type="date"
        value={value ? value.toISOString().split("T")[0] : ""}
        onChange={handleChange}
        className="glass rounded px-2 py-1 text-xs border border-border/50 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  )
}
