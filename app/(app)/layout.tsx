import { CasePulse } from "@/components/shell/case-pulse"
import { PhaseSlider } from "@/components/shell/phase-slider"
import { CommandBar } from "@/components/shell/command-bar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top bar: always visible */}
      <CasePulse />

      {/* Phase toggle: immediately below Case Pulse */}
      <PhaseSlider />

      {/* Main workspace area */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Global command bar (rendered as overlay, activated via ⌘K) */}
      <CommandBar />
    </div>
  )
}
