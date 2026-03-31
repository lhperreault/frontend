"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, SkipForward, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// ─── Conversation script ──────────────────────────────────────────────────────

type InputType = "text" | "chips" | "date"

interface Chip {
  value: string
  label: string
  desc?: string
  icon?: string
}

interface Step {
  field: keyof CaseFields
  botMessage: string
  inputType: InputType
  chips?: Chip[]
  placeholder?: string
  required: boolean
}

interface CaseFields {
  case_name: string
  party_role: string
  case_stage: string
  court_name: string
  judge_name: string
  next_deadline: string
  opposing_party: string
}

const STEPS: Step[] = [
  {
    field: "case_name",
    botMessage: "Let's get started. What's the case called?",
    inputType: "text",
    placeholder: "e.g. Smith v. Acme Corp",
    required: true,
  },
  {
    field: "party_role",
    botMessage: "Got it. Which side are you representing?",
    inputType: "chips",
    chips: [
      { value: "plaintiff",  label: "Plaintiff",  desc: "We filed the lawsuit",           icon: "⚔️" },
      { value: "defendant",  label: "Defendant",  desc: "We are defending",                icon: "🛡️" },
      { value: "appellant",  label: "Appellant",  desc: "We are appealing a decision",    icon: "📋" },
      { value: "appellee",   label: "Appellee",   desc: "Responding to an appeal",        icon: "⚖️" },
    ],
    required: true,
  },
  {
    field: "case_stage",
    botMessage: "What stage is the litigation at right now?",
    inputType: "chips",
    chips: [
      { value: "filing",    label: "Filing",    desc: "Initial pleading just filed",               icon: "📄" },
      { value: "discovery", label: "Discovery", desc: "Document requests, depositions",            icon: "🔍" },
      { value: "motions",   label: "Motions",   desc: "Pre-trial motions, summary judgment",       icon: "⚡" },
      { value: "trial",     label: "Trial",     desc: "Active trial proceedings",                  icon: "🏛️" },
      { value: "appeal",    label: "Appeal",    desc: "Appellate court proceedings",               icon: "📜" },
    ],
    required: true,
  },
  {
    field: "court_name",
    botMessage: "Which court or jurisdiction? (you can skip this)",
    inputType: "text",
    placeholder: "e.g. S.D.N.Y., Northern District of California",
    required: false,
  },
  {
    field: "judge_name",
    botMessage: "Who is the judge? (skip if unknown)",
    inputType: "text",
    placeholder: "e.g. Hon. Jane Smith",
    required: false,
  },
  {
    field: "next_deadline",
    botMessage: "What's the next key deadline? (skip if none yet)",
    inputType: "date",
    required: false,
  },
  {
    field: "opposing_party",
    botMessage: "Who is the opposing party or their counsel? (skip if unknown)",
    inputType: "text",
    placeholder: "e.g. Acme Corp / Jones & Partners LLP",
    required: false,
  },
]

const EMPTY_FIELDS: CaseFields = {
  case_name: "",
  party_role: "",
  case_stage: "",
  court_name: "",
  judge_name: "",
  next_deadline: "",
  opposing_party: "",
}

// ─── Message types ────────────────────────────────────────────────────────────

type Message =
  | { from: "bot";  text: string }
  | { from: "user"; text: string }

// ─── Bubble components ────────────────────────────────────────────────────────

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px]">
        ⚖
      </span>
      <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-muted/50 px-3.5 py-2.5 text-sm leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {text}
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2">
      <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px]">
        ⚖
      </span>
      <div className="rounded-2xl rounded-bl-sm bg-muted/50 px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CaseOnboardingChatbot ────────────────────────────────────────────────────

interface CaseOnboardingChatbotProps {
  onCreated?: (caseId: string) => void
  onCancel: () => void
}

export function CaseOnboardingChatbot({ onCreated, onCancel }: CaseOnboardingChatbotProps) {
  const router = useRouter()

  const [stepIndex, setStepIndex]   = useState(0)
  const [fields, setFields]         = useState<CaseFields>(EMPTY_FIELDS)
  const [messages, setMessages]     = useState<Message[]>([
    { from: "bot", text: STEPS[0].botMessage },
  ])
  const [textInput, setTextInput]   = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  // Focus text input when step changes
  useEffect(() => {
    if (STEPS[stepIndex]?.inputType === "text" || STEPS[stepIndex]?.inputType === "date") {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [stepIndex])

  const currentStep = STEPS[stepIndex]
  const isDone = stepIndex >= STEPS.length

  // ── Advance to next step ───────────────────────────────────────────────────

  const advance = (value: string, displayText: string) => {
    const updated = { ...fields, [currentStep.field]: value }
    setFields(updated)

    // Add user bubble
    const userMsg: Message = { from: "user", text: displayText }
    const nextIdx = stepIndex + 1

    if (nextIdx >= STEPS.length) {
      // All done — show thinking then create
      setMessages((prev) => [...prev, userMsg])
      setTextInput("")
      setIsThinking(true)
      setTimeout(() => {
        setIsThinking(false)
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: "Perfect! Creating your case now…" },
        ])
        handleCreate(updated)
      }, 700)
    } else {
      // Next question
      setIsThinking(true)
      setMessages((prev) => [...prev, userMsg])
      setTextInput("")
      setTimeout(() => {
        setIsThinking(false)
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: STEPS[nextIdx].botMessage },
        ])
        setStepIndex(nextIdx)
      }, 500)
    }
  }

  const skip = () => {
    advance("", "— skipped —")
  }

  // ── Create case ────────────────────────────────────────────────────────────

  const handleCreate = async (finalFields: CaseFields) => {
    setIsCreating(true)
    setError(null)
    try {
      const { data, error: err } = await createClient()
        .from("cases")
        .insert({
          case_name:       finalFields.case_name.trim() || "New Case",
          party_role:      finalFields.party_role      || null,
          case_stage:      finalFields.case_stage      || null,
          court_name:      finalFields.court_name.trim()  || null,
          judge_name:      finalFields.judge_name.trim()  || null,
          next_deadline:   finalFields.next_deadline       || null,
          opposing_party:  finalFields.opposing_party.trim() || null,
        })
        .select("id")
        .single()

      if (err || !data) throw new Error(err?.message ?? "Failed to create case")

      if (onCreated) {
        onCreated(data.id)
      } else {
        router.push(`/case/${data.id}/workspace`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setIsCreating(false)
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Hmm, something went wrong. Try again?" },
      ])
    }
  }

  // ── Text submit ───────────────────────────────────────────────────────────

  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const val = textInput.trim()
    if (!val && currentStep.required) return
    if (!val) { skip(); return }
    advance(val, val)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Message history */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 scrollbar-none">
        {messages.map((msg, i) =>
          msg.from === "bot"
            ? <BotBubble key={i} text={msg.text} />
            : <UserBubble key={i} text={msg.text} />
        )}
        {isThinking && <ThinkingBubble />}
        {isCreating && !error && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Setting up your workspace…</span>
          </div>
        )}
        {error && (
          <p className="text-center text-xs text-red-400">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — hidden once all steps done or creating */}
      {!isDone && !isThinking && !isCreating && currentStep && (
        <div className="shrink-0 border-t border-border/20 px-4 pb-4 pt-3">

          {/* Chip options */}
          {currentStep.inputType === "chips" && currentStep.chips && (
            <div className="grid grid-cols-2 gap-2">
              {currentStep.chips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => advance(chip.value, `${chip.icon ?? ""} ${chip.label}`.trim())}
                  className="flex items-start gap-2 rounded-xl border border-border/40 px-3 py-2.5 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  {chip.icon && <span className="text-base leading-none">{chip.icon}</span>}
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{chip.label}</p>
                    {chip.desc && (
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                        {chip.desc}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Text / date input */}
          {(currentStep.inputType === "text" || currentStep.inputType === "date") && (
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type={currentStep.inputType === "date" ? "date" : "text"}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={currentStep.placeholder ?? ""}
                className={cn(
                  "glass flex-1 rounded-xl border border-border/50 bg-transparent px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary",
                )}
              />
              {!currentStep.required && (
                <button
                  type="button"
                  onClick={skip}
                  title="Skip"
                  className="shrink-0 rounded-lg border border-border/40 p-2 text-muted-foreground/60 transition-colors hover:border-border hover:text-foreground"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={currentStep.required && !textInput.trim()}
                className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Step counter */}
          <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
            {stepIndex + 1} of {STEPS.length}
            {!currentStep.required && " · optional"}
          </p>
        </div>
      )}
    </div>
  )
}
