"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ── Constants ────────────────────────────────────────────────────────────────

const PARTY_ROLES = [
  {
    value: "plaintiff",
    label: "Plaintiff",
    desc: "We filed the lawsuit",
    emoji: "⚔️",
  },
  {
    value: "defendant",
    label: "Defendant",
    desc: "We are defending against the lawsuit",
    emoji: "🛡️",
  },
  {
    value: "appellant",
    label: "Appellant",
    desc: "We are appealing a decision",
    emoji: "📋",
  },
  {
    value: "appellee",
    label: "Appellee",
    desc: "We are responding to an appeal",
    emoji: "⚖️",
  },
] as const

const CASE_STAGES = [
  {
    value: "filing",
    label: "Filing",
    desc: "Complaint or initial pleading just filed",
    color: "bg-blue-400",
  },
  {
    value: "discovery",
    label: "Discovery",
    desc: "Document requests, depositions, interrogatories",
    color: "bg-amber-400",
  },
  {
    value: "motions",
    label: "Motions",
    desc: "Pre-trial motions, summary judgment",
    color: "bg-purple-400",
  },
  {
    value: "trial",
    label: "Trial",
    desc: "Active trial proceedings",
    color: "bg-red-400",
  },
  {
    value: "appeal",
    label: "Appeal",
    desc: "Appellate court proceedings",
    color: "bg-orange-400",
  },
] as const

type Step = "name" | "role" | "stage"
const STEPS: Step[] = ["name", "role", "stage"]

// ── Props ─────────────────────────────────────────────────────────────────────

interface NewCaseModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /**
   * When provided, called with the new case_id instead of navigating.
   * Useful when creating a case as part of a file upload flow.
   */
  onCreated?: (caseId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewCaseModal({ open, onOpenChange, onCreated }: NewCaseModalProps) {
  const router = useRouter()

  const [step, setStep]           = useState<Step>("name")
  const [caseName, setCaseName]   = useState("")
  const [partyRole, setPartyRole] = useState("")
  const [caseStage, setCaseStage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const reset = () => {
    setStep("name")
    setCaseName("")
    setPartyRole("")
    setCaseStage("")
    setError(null)
    setIsSubmitting(false)
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const { data, error: err } = await createClient()
        .from("cases")
        .insert({
          case_name:  caseName.trim() || "New Case",
          party_role: partyRole,
          case_stage: caseStage,
        })
        .select("id")
        .single()

      if (err || !data) throw new Error(err?.message ?? "Failed to create case")

      handleOpenChange(false)
      if (onCreated) {
        onCreated(data.id)
      } else {
        router.push(`/case/${data.id}/workspace`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepIdx = STEPS.indexOf(step)
  const progress = ((stepIdx + 1) / STEPS.length) * 100

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        {/* Progress bar */}
        <div className="h-1 bg-muted/60">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b border-border/20 px-6 py-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                  i < stepIdx
                    ? "bg-primary text-primary-foreground"
                    : i === stepIdx
                    ? "border border-primary text-primary"
                    : "border border-border/40 text-muted-foreground/50",
                )}
              >
                {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs capitalize",
                  i === stepIdx ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {s === "name" ? "Case name" : s === "role" ? "Your side" : "Stage"}
              </span>
              {i < STEPS.length - 1 && (
                <div className="mx-1 h-px w-6 bg-border/30" />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-5">

          {/* ── Step 1: Case name ── */}
          {step === "name" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">New case</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  What's the case called?
                </p>
              </div>

              <input
                type="text"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && caseName.trim() && setStep("role")}
                placeholder="e.g. Smith v. Acme Corp"
                className="glass w-full rounded-lg border border-border/50 bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep("role")}
                  disabled={!caseName.trim()}
                >
                  Next <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Party role ── */}
          {step === "role" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Which side are you?</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Who are you representing in{" "}
                  <span className="font-medium text-foreground">{caseName}</span>?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PARTY_ROLES.map(({ value, label, desc, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPartyRole(value)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      partyRole === value
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/40 hover:border-border hover:bg-muted/10",
                    )}
                  >
                    <span className="text-xl">{emoji}</span>
                    <p className="mt-2 text-sm font-medium">{label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep("name")}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                </Button>
                <Button onClick={() => setStep("stage")} disabled={!partyRole}>
                  Next <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Case stage ── */}
          {step === "stage" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Where is the case?</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  What stage is the litigation at right now?
                </p>
              </div>

              <div className="space-y-2">
                {CASE_STAGES.map(({ value, label, desc, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCaseStage(value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                      caseStage === value
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/40 hover:border-border hover:bg-muted/10",
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                    {caseStage === value && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep("role")}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!caseStage || isSubmitting}
                >
                  {isSubmitting ? "Creating…" : "Create case"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
