"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2 } from "lucide-react"
import { searchCase } from "@/lib/api/search"
import type { SearchResult } from "@/lib/types/search-result"
import { cn } from "@/lib/utils"

/**
 * Command Bar — global ⌘K / Ctrl+K overlay.
 *
 * - Debounced live search (300 ms) after 2+ characters
 * - Falls back to Supabase keyword search when the Python backend is down
 * - Quick-action shortcuts when the input is empty
 * - Keyboard nav: ↑ ↓ Enter to select, Esc to close
 */

const QUICK_ACTIONS = [
  { label: "Search parties…",     prefill: "parties" },
  { label: "Search obligations…", prefill: "obligations" },
  { label: "Search claims…",      prefill: "claims" },
  { label: "Show timeline",       nav: "timeline" },
  { label: "Go to documents",     nav: "documents" },
] as const

export function CommandBar() {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)

  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const params = useParams()
  const caseId = typeof params?.caseId === "string" ? params.caseId : null
  const router = useRouter()

  // ── Open / close ──────────────────────────────────────────────────────────

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults([])
    setActiveIdx(-1)
    setIsSearching(false)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // ── Debounced search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!caseId || trimmed.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchCase(caseId, trimmed, {}, 8)
        setResults(res.results)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, caseId])

  // ── Navigation helpers ────────────────────────────────────────────────────

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      if (!caseId) return
      const p = new URLSearchParams({ doc: result.document_id, section: result.section_id })
      router.push(`/case/${caseId}/workspace?${p.toString()}`)
      close()
    },
    [caseId, router, close],
  )

  const handleQuickAction = useCallback(
    (action: (typeof QUICK_ACTIONS)[number]) => {
      if ("nav" in action && action.nav && caseId) {
        router.push(`/case/${caseId}/${action.nav}`)
        close()
      } else if ("prefill" in action && action.prefill) {
        setQuery(action.prefill + " ")
        setActiveIdx(-1)
        inputRef.current?.focus()
      }
    },
    [caseId, router, close],
  )

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const showQuickActions = query.length === 0 && !!caseId
  const showResults      = results.length > 0
  const itemCount        = showResults
    ? results.length
    : showQuickActions
    ? QUICK_ACTIONS.length
    : 0

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, itemCount - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      if (activeIdx >= 0) {
        if (showResults) navigateToResult(results[activeIdx])
        else if (showQuickActions) handleQuickAction(QUICK_ACTIONS[activeIdx])
      }
    }
  }

  const showEmpty    = !isSearching && query.trim().length >= 2 && results.length === 0
  const showHintRow  = !showQuickActions && !showResults && !showEmpty && !isSearching

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-[20vh] z-50 w-full max-w-xl -translate-x-1/2"
          >
            <div className="glass overflow-hidden rounded-2xl shadow-2xl">
              {/* Input row */}
              <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActiveIdx(-1)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything, navigate, or search…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <kbd className="rounded border border-border/50 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  esc
                </kbd>
              </div>

              {/* ── Quick actions (empty query + inside a case) ── */}
              {showQuickActions && (
                <div className="py-1">
                  <p className="px-4 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    Quick actions
                  </p>
                  {QUICK_ACTIONS.map((action, i) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleQuickAction(action)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
                        activeIdx === i
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-muted/20",
                      )}
                    >
                      <span className="w-3 shrink-0 text-center text-muted-foreground/40">
                        {"nav" in action ? "→" : "/"}
                      </span>
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Live search results ── */}
              {showResults && (
                <div className="max-h-80 overflow-y-auto py-1">
                  <p className="px-4 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </p>
                  {results.map((result, i) => (
                    <button
                      key={result.section_id}
                      type="button"
                      onClick={() => navigateToResult(result)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors",
                        activeIdx === i
                          ? "bg-primary/10"
                          : "hover:bg-muted/20",
                      )}
                    >
                      {/* Title */}
                      <span className="truncate text-sm font-medium">
                        {result.section_title ?? "Untitled section"}
                      </span>
                      {/* Source */}
                      <span className="text-[10px] text-muted-foreground">
                        {result.file_name}
                        {result.page_range ? ` · pp. ${result.page_range}` : ""}
                        {result.document_type ? ` · ${result.document_type}` : ""}
                      </span>
                      {/* Snippet */}
                      {result.section_text && (
                        <span className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                          {result.section_text.slice(0, 120)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Empty state ── */}
              {showEmpty && (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  {!caseId && (
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      Open a case to enable document search.
                    </p>
                  )}
                </div>
              )}

              {/* ── Generic hint (no case open, empty query) ── */}
              {showHintRow && (
                <div className="flex gap-4 px-4 py-2.5 text-xs text-muted-foreground/50">
                  <span>Ask a question</span>
                  <span>·</span>
                  <span>Look up a party</span>
                  <span>·</span>
                  <span>Navigate to a section</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
