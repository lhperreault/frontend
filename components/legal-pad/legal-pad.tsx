"use client"

import { useState } from "react"
import { Maximize2 } from "lucide-react"
import { ChatPane } from "./chat-pane"
import { VerificationQueue } from "./verification-queue"
import { useChatMessages } from "@/hooks/use-chat-messages"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface LegalPadProps {
  caseId: string
}

type Tab = "chat" | "review"

export function LegalPad({ caseId }: LegalPadProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat")
  const [isExpanded, setIsExpanded] = useState(false)
  const chatProps = useChatMessages(caseId)

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

        {/* Expand button — only shown on chat tab */}
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

      {/* Panel content */}
      <div className="flex-1 overflow-hidden p-3">
        {activeTab === "chat" ? (
          <ChatPane {...chatProps} />
        ) : (
          <VerificationQueue caseId={caseId} />
        )}
      </div>

      {/* Expanded Sheet — same chatProps, so conversation state is preserved */}
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
