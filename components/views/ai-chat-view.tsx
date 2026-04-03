"use client"

import { useState } from "react"
import { Maximize2, X, Tag, PanelLeft, Plus, MessageSquare, Brain } from "lucide-react"
import { ChatPane } from "@/components/legal-pad/chat-pane"
import { VerificationQueue } from "@/components/legal-pad/verification-queue"
import { MemoryPanel } from "@/components/shell/memory-panel"
import { useChatMessages } from "@/hooks/use-chat-messages"
import type { ChatMessage } from "@/hooks/use-chat-messages"
import { useEntities } from "@/hooks/use-entities"
import { useWorkspace } from "@/providers/workspace-provider"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type Tab = "chat" | "review" | "memory"

type SavedChat = {
  id: string
  title: string
  messages: ChatMessage[]
  savedAt: Date
}

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
  const [showSidebar, setShowSidebar] = useState(false)
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [viewingChat, setViewingChat] = useState<SavedChat | null>(null)

  const chatProps = useChatMessages(caseId)
  const { entities } = useEntities(caseId)
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

  // Save current conversation to history and start a fresh chat
  const handleNewChat = () => {
    const userMsgs = chatProps.messages.filter((m) => m.type === "user")
    if (userMsgs.length > 0) {
      const firstUser = userMsgs[0] as { type: "user"; content: string }
      setSavedChats((prev) => [
        {
          id: crypto.randomUUID(),
          title: firstUser.content.slice(0, 50),
          messages: chatProps.messages,
          savedAt: new Date(),
        },
        ...prev,
      ])
    }
    setViewingChat(null)
    chatProps.resetChat()
  }

  // Show a saved chat in read-only mode (without resetting the active chat)
  const handleSelectSaved = (chat: SavedChat) => {
    setViewingChat(chat)
  }

  // Return to the live active chat
  const handleBackToActive = () => {
    setViewingChat(null)
  }

  // Which messages and props to show in ChatPane
  const displayProps = viewingChat
    ? { ...chatProps, messages: viewingChat.messages }
    : chatProps

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-border/30">
        {/* Sidebar toggle */}
        <button
          type="button"
          onClick={() => setShowSidebar((v) => !v)}
          title={showSidebar ? "Hide chat history" : "Show chat history"}
          className={cn(
            "shrink-0 px-2 py-2 transition-colors",
            showSidebar ? "text-primary" : "text-muted-foreground/50 hover:text-foreground",
          )}
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </button>

        {(["chat", "review", "memory"] as Tab[]).map((tab) => (
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
            {tab === "chat" ? "Chat" : tab === "review" ? "Review" : (
              <span className="flex items-center justify-center gap-1">
                <Brain className="h-3 w-3" />
                Memory
              </span>
            )}
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

      {/* Main body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat history sidebar */}
        {showSidebar && (
          <div className="flex w-36 shrink-0 flex-col border-r border-border/30 bg-muted/10 overflow-hidden">
            {/* New Chat button */}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-1.5 border-b border-border/20 px-3 py-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3 shrink-0" />
              New Chat
            </button>

            {/* Active chat entry */}
            <button
              type="button"
              onClick={handleBackToActive}
              className={cn(
                "flex items-start gap-1.5 px-3 py-2 text-left transition-colors",
                !viewingChat
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/20 hover:text-foreground",
              )}
            >
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="text-[10px] leading-snug line-clamp-2">Current chat</span>
            </button>

            {/* Saved chats list */}
            <ul className="flex-1 overflow-y-auto">
              {savedChats.length === 0 && (
                <li className="px-3 py-3 text-[10px] text-muted-foreground/40 italic">
                  No past chats
                </li>
              )}
              {savedChats.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectSaved(chat)}
                    className={cn(
                      "flex w-full items-start gap-1.5 px-3 py-2 text-left transition-colors",
                      viewingChat?.id === chat.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/20 hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                    <div className="min-w-0">
                      <p className="text-[10px] leading-snug line-clamp-2">{chat.title}</p>
                      <p className="text-[9px] opacity-40 mt-0.5">
                        {chat.savedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Panel content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Entity context chip — shown when an entity is selected in Filter & Search */}
          {activeTab === "chat" && entityHoverTarget && !viewingChat && (
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

          <div className="flex-1 overflow-hidden p-3">
            {activeTab === "chat" ? (
              <ChatPane
                {...displayProps}
                entities={entities}
                readOnly={!!viewingChat}
              />
            ) : activeTab === "review" ? (
              <VerificationQueue caseId={caseId} />
            ) : (
              <div className="h-full overflow-y-auto">
                <MemoryPanel
                  caseId={caseId}
                  activeSessionId={chatProps.sessionId}
                  onSessionCleared={(sid) => {
                    // If the active session was cleared, start a fresh one
                    if (sid === chatProps.sessionId) {
                      chatProps.resetChat()
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
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
            <ChatPane {...chatProps} entities={entities} expanded />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
