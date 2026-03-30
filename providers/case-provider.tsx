"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { Case } from "@/lib/types/case"
import type { Phase } from "@/lib/constants/phases"
import { DEFAULT_PHASE } from "@/lib/constants/phases"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

interface CaseContextValue extends Partial<Case> {
  caseId: string
  activePhase: Phase
  isLoading: boolean
}

interface PhaseContextValue {
  phase: Phase
  setPhase: (p: Phase) => void
}

const CaseContext  = createContext<CaseContextValue | null>(null)
const PhaseContext = createContext<PhaseContextValue | null>(null)

export function CaseProvider({
  caseId,
  children,
}: {
  caseId: string
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const urlPhase = (searchParams.get("phase") as Phase | null) ?? DEFAULT_PHASE
  const [phase, setPhaseState] = useState<Phase>(urlPhase)
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setPhase = useCallback((p: Phase) => {
    setPhaseState(p)
    const params = new URLSearchParams(searchParams.toString())
    params.set("phase", p)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  // Fetch case metadata
  useEffect(() => {
    if (!caseId || caseId === "undefined") return
    setIsLoading(true)
    fetch(`/api/case/${caseId}/metadata`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setCaseData(data) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [caseId])

  const caseCtx: CaseContextValue = {
    caseId,
    activePhase: phase,
    isLoading,
    ...(caseData ?? {}),
  }

  const phaseCtx: PhaseContextValue = { phase, setPhase }

  return (
    <CaseContext.Provider value={caseCtx}>
      <PhaseContext.Provider value={phaseCtx}>
        {children}
      </PhaseContext.Provider>
    </CaseContext.Provider>
  )
}

/** Access current case metadata. Available inside case/[caseId]/** routes. */
export function useCase() {
  return useContext(CaseContext)
}

/** Access and mutate the current phase. Synced to URL params. */
export function usePhase(): PhaseContextValue {
  const ctx = useContext(PhaseContext)
  if (!ctx) {
    // Graceful fallback when used outside CaseProvider (e.g. app shell on dashboard)
    return { phase: DEFAULT_PHASE, setPhase: () => {} }
  }
  return ctx
}
