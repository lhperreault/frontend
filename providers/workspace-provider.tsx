"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { type SlotConfig, type ViewId, DEFAULT_SLOTS } from "@/lib/types/workspace"

interface ScrollTarget {
  sectionId: string
  anchorId?: string
}

export interface EntityTarget {
  id: string
  label: string
  nodeType?: string
}

interface WorkspaceContextValue {
  // Slot management
  slots: SlotConfig[]
  setSlotView: (slotIndex: number, viewId: ViewId) => void
  setSlotCount: (n: 1 | 2 | 3) => void
  setSlotWidth: (slotIndex: number, widthPct: number) => void

  // Active document
  activeDocumentId: string | null
  navigateToDocument: (documentId: string, sectionId?: string) => void

  // Cross-panel scroll target (drives the Document view)
  scrollTarget: ScrollTarget | null
  navigateToSection: (sectionId: string, anchorId?: string) => void
  clearScrollTarget: () => void

  // Entity context (selected entity in Filter view → context chip in Chat)
  entityHoverTarget: EntityTarget | null
  setEntityHoverTarget: (entity: EntityTarget | null) => void

  // Toast notifications (e.g. "open a Document view first")
  toast: string | null
  clearToast: () => void

  caseId: string
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function getStorageKey(caseId: string) {
  return `workspace_slots_${caseId}`
}

function loadSlots(caseId: string): SlotConfig[] {
  if (typeof window === "undefined") return DEFAULT_SLOTS
  try {
    const raw = localStorage.getItem(getStorageKey(caseId))
    if (raw) return JSON.parse(raw) as SlotConfig[]
  } catch {
    // ignore
  }
  return DEFAULT_SLOTS
}

function saveSlots(caseId: string, slots: SlotConfig[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(getStorageKey(caseId), JSON.stringify(slots))
  } catch {
    // ignore
  }
}

function normaliseWidths(slots: SlotConfig[]): SlotConfig[] {
  const total = slots.reduce((s, sl) => s + sl.widthPct, 0)
  if (total === 0) return slots
  return slots.map((sl) => ({ ...sl, widthPct: (sl.widthPct / total) * 100 }))
}

export function WorkspaceProvider({
  caseId,
  initialDocumentId,
  children,
}: {
  caseId: string
  initialDocumentId: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [slots, setSlots] = useState<SlotConfig[]>(() => loadSlots(caseId))
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    searchParams.get("doc") ?? initialDocumentId
  )
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null)
  const [entityHoverTarget, setEntityHoverTarget] = useState<EntityTarget | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist slots to localStorage whenever they change
  useEffect(() => {
    saveSlots(caseId, slots)
  }, [caseId, slots])

  // Sync URL → activeDocumentId on browser back/forward
  useEffect(() => {
    const docParam = searchParams.get("doc")
    if (docParam && docParam !== activeDocumentId) {
      setActiveDocumentId(docParam)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast after 3s
  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const clearToast = useCallback(() => {
    setToast(null)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  const setSlotView = useCallback((slotIndex: number, viewId: ViewId) => {
    setSlots((prev) => {
      const next = [...prev]
      next[slotIndex] = { ...next[slotIndex], viewId }
      return next
    })
  }, [])

  const setSlotCount = useCallback((n: 1 | 2 | 3) => {
    setSlots((prev) => {
      if (n === prev.length) return prev
      if (n < prev.length) return normaliseWidths(prev.slice(0, n))
      const next = [...prev]
      const defaults: ViewId[] = ["filter-search", "timeline", "claims-counts"]
      while (next.length < n) {
        const viewId =
          defaults.find((v) => !next.some((s) => s.viewId === v)) ?? "filter-search"
        next.push({ viewId, widthPct: 100 / n })
      }
      return normaliseWidths(next)
    })
  }, [])

  const setSlotWidth = useCallback((slotIndex: number, widthPct: number) => {
    setSlots((prev) => {
      if (slotIndex < 0 || slotIndex >= prev.length) return prev
      const next = [...prev]
      const clamped = Math.max(15, Math.min(70, widthPct))
      const delta = clamped - next[slotIndex].widthPct
      const neighbour = slotIndex + 1 < next.length ? slotIndex + 1 : slotIndex - 1
      if (neighbour < 0 || neighbour >= next.length) return prev
      next[slotIndex] = { ...next[slotIndex], widthPct: clamped }
      next[neighbour] = {
        ...next[neighbour],
        widthPct: Math.max(15, next[neighbour].widthPct - delta),
      }
      return normaliseWidths(next)
    })
  }, [])

  const navigateToDocument = useCallback(
    (documentId: string, sectionId?: string) => {
      setActiveDocumentId(documentId)
      if (sectionId) setScrollTarget({ sectionId })
      const params = new URLSearchParams(searchParams.toString())
      params.set("doc", documentId)
      if (sectionId) params.set("section", sectionId)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const navigateToSection = useCallback(
    (sectionId: string, anchorId?: string) => {
      // Guard: if no Document view is open, show a toast instead of silently failing
      setSlots((prev) => {
        const hasDocView = prev.some((s) => s.viewId === "document")
        if (!hasDocView) {
          showToast("Open a Document view to navigate there")
        } else {
          setScrollTarget({ sectionId, anchorId })
        }
        return prev // no slot change
      })
    },
    [showToast]
  )

  const clearScrollTarget = useCallback(() => {
    setScrollTarget(null)
  }, [])

  return (
    <WorkspaceContext.Provider
      value={{
        slots,
        setSlotView,
        setSlotCount,
        setSlotWidth,
        activeDocumentId,
        navigateToDocument,
        scrollTarget,
        navigateToSection,
        clearScrollTarget,
        entityHoverTarget,
        setEntityHoverTarget,
        toast,
        clearToast,
        caseId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider")
  return ctx
}
