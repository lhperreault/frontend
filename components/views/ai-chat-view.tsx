"use client"

import { useState } from "react"
import { Maximize2, X, Tag } from "lucide-react"
import { ChatPane } from "@/components/legal-pad/chat-pane"
import { VerificationQueue } from "@/components/legal-pad/verification-queue"
import { useChatMessages } from "@/hooks/use-chat-messages"
import { useWorkspace } from "@/providers/workspace-provider"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type Tab = "chat" | "review"

// Node-type colours matching the entity cards in FilterSearchView
const NODE_TYPE_COLORS: Record<string, string> = {
  party:            "bg-blue-500/10 text-blue-400 border-blue-500/20",
  claim:            "bg-amber-500/10 text-amber-400 border-amber-500/20",
  obligation:       "bg-purple-500/10 text-purple-400 border-purple-500/20",
  event:            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  evidence:         "bg-rose-500/10 text-rose-400 border-rose-500/20",
  legal_authority:  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  amount:           "bg-teal-500/10 text-teal-400 border-teal-500/20",
  condition:        "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

export function AiChatView({ caseId }: { caseId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("chat")
  const [isExpanded, setIsExpanded] = useState(false)
  const chatProps = useChatMessages(caseId)
  const { entityHoverTarget, setEntityHoverTarget } = useWorkspace()

  const colorClass =
    (entityHoverTarget?.nodeType && NODE_TYPE_COLORS[entityHoverTarget.nodeType]) ??
    "bg-muted/30 text-muted-foreground border-border/40"

  // Prepend entity label to the current chat input, then clear the chip
  const handleInclude = () => {
    if (!entityHoverTarget) return
    const prefix = `About ${entityHoverTarget.label}: `
    chatProps.setInput(prefix + chatProps.input)
    setEntityHoverTarget(null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-border/30">
        {(["chat", "review"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "chat" ? "Chat" : "Review"}
          </button>
        ))}

        {activeTab === "chat" && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            title="Expand chat"
            className="shrink-0 px-2 py-2 text-muted-foreground/50 transition-colors hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Entity context chip — shown when an entity is selected in Filter & Search */}
      {activeTab === "chat" && entityHoverTarget && (
        <div className="shrink-0 border-b border-border/20 bg-muted/5 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Tag className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground">Context:</span>
            <span
              className={cn(
                "flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium",
                colorClass,
              )}
            >
              {entityHoverTarget.label}
              {entityHoverTarget.nodeType && (
                <span className="opacity-60">· {entityHoverTarget.nodeType}</span>
              )}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleInclude}
                className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Include
              </button>
              <button
                type="button"
                onClick={() => setEntityHoverTarget(null)}
                className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel content */}
      <div className="flex-1 overflow-hidden p-3">
        {activeTab === "chat" ? (
          <ChatPane {...chatProps} />
        ) : (
          <VerificationQueue caseId={caseId} />
        )}
      </div>

      {/* Expanded Sheet — shares chatProps so conversation state is preserved */}
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetContent
          side="right"
          className="flex w-[70vw] max-w-none flex-col p-0 sm:max-w-none"
        >
          <SheetHeader className="shrink-0 border-b border-border/30 px-5 py-3">
            <SheetTitle className="text-sm font-semibold">Case Chat</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <ChatPane {...chatProps} expanded />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
