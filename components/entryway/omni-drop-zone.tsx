"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { uploadDocument, type PipelineEvent } from "@/lib/api/ingest"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Case } from "@/lib/types/case"

// ── Types ──────────────────────────────────────────────────────────────────────

interface PhaseState {
  label: string
  status: "pending" | "running" | "done" | "error"
}

interface StepRow {
  step_name:     string
  display_label: string
  status:        "pending" | "running" | "done" | "error"
  error_message?: string | null
}

interface UploadItem {
  file:        File
  status:      "queued" | "uploading" | "done" | "error"
  error?:      string
  phases:      PhaseState[]
  documentId?: string
  steps:       StepRow[]
  expanded:    boolean
}

// Canonical display order for checklist steps
const STEP_ORDER: string[] = [
  "text_extraction",
  "doc_classification",
  "toc_split",
  "saved_to_db",
  "embeddings",
  "section_refine",
  "ast_tree",
  "semantic_labeling",
  "entity_extraction",
  "legal_structure",
  "kg_build",
  "initial_summary",
  "enriched_summary",
]

function sortSteps(steps: StepRow[]): StepRow[] {
  return [...steps].sort((a, b) => {
    const ai = STEP_ORDER.indexOf(a.step_name)
    const bi = STEP_ORDER.indexOf(b.step_name)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

// ── Style maps ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<UploadItem["status"], { label: string; cls: string }> = {
  queued:    { label: "Queued",      cls: "text-muted-foreground" },
  uploading: { label: "Processing…", cls: "text-amber-400" },
  done:      { label: "Ready",       cls: "text-emerald-400" },
  error:     { label: "Error",       cls: "text-red-400" },
}

const PHASE_STATUS_CLS: Record<PhaseState["status"], string> = {
  pending: "text-muted-foreground",
  running: "text-amber-400",
  done:    "text-emerald-400",
  error:   "text-red-400",
}

const PHASE_DOT_CLS: Record<PhaseState["status"], string> = {
  pending: "bg-muted-foreground/30",
  running: "bg-amber-400 animate-pulse",
  done:    "bg-emerald-400",
  error:   "bg-red-400",
}

// ── Component ──────────────────────────────────────────────────────────────────

export function OmniDropZone({
  initialCaseId,
  onUploadComplete,
}: {
  initialCaseId?: string
  onUploadComplete?: () => void
} = {}) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [newCaseName, setNewCaseName] = useState("")
  const [newPartyRole, setNewPartyRole] = useState("")
  const [newCaseStage, setNewCaseStage] = useState("")
  const [selectedCaseId, setSelectedCaseId] = useState<string>("")
  const [cases, setCases] = useState<Case[]>([])
  const [casesLoading, setCasesLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateFiles, setDuplicateFiles] = useState<string[]>([])

  // Upload progress state
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [uploadPriority, setUploadPriority] = useState<string>("soon")
  const [uploadProcessingMode, setUploadProcessingMode] = useState<string>("balanced")

  // Track active Realtime channel names so we can clean them up on unmount
  const channelNamesRef = useRef<string[]>([])

  // Pre-select case when initialCaseId is provided
  useEffect(() => {
    if (initialCaseId) {
      setMode("existing")
      setSelectedCaseId(initialCaseId)
    }
  }, [initialCaseId])

  // Fetch existing cases when dialog opens
  useEffect(() => {
    if (!dialogOpen) return
    setCasesLoading(true)
    createClient()
      .from("cases")
      .select("id, case_name, party_role")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error("[OmniDropZone] failed to fetch cases:", error)
          setMode("new")
          setCasesLoading(false)
          return
        }
        console.log("[OmniDropZone] cases fetched:", data?.length ?? 0, data)
        setCases((data ?? []) as Case[])
        if (data?.length) {
          setMode("existing")
          setSelectedCaseId(data[0].id)
        } else {
          setMode("new")
        }
        setCasesLoading(false)
      })
  }, [dialogOpen])

  // Unsubscribe all Realtime channels on unmount
  useEffect(() => {
    const supabase = createClient()
    return () => {
      for (const name of channelNamesRef.current) {
        supabase.channel(name).unsubscribe()
      }
    }
  }, [])

  // Subscribe to document_processing_steps for a given documentId
  const subscribeToSteps = useCallback((documentId: string, file: File) => {
    const supabase    = createClient()
    const channelName = `steps-${documentId}`
    channelNamesRef.current.push(channelName)

    supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "document_processing_steps",
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as StepRow | undefined
          if (!row?.step_name) return

          setUploads((prev) =>
            prev.map((u) => {
              if (u.file !== file) return u
              const existing = u.steps.findIndex((s) => s.step_name === row.step_name)
              let next: StepRow[]
              if (existing >= 0) {
                next = u.steps.map((s, i) => (i === existing ? { ...s, ...row } : s))
              } else {
                next = [...u.steps, row]
              }
              return { ...u, steps: sortSteps(next) }
            }),
          )
        },
      )
      .subscribe()
  }, [])

  const openDialog = useCallback((files: File[]) => {
    if (!files.length) return
    setPendingFiles(files)
    setNewCaseName("")
    setDuplicateFiles([])
    setDialogOpen(true)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    openDialog(Array.from(e.dataTransfer.files))
  }, [openDialog])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) openDialog(Array.from(e.target.files))
    e.target.value = ""
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      let caseId = selectedCaseId

      // Check for duplicate documents in existing case (only on first attempt)
      if (mode === "existing" && selectedCaseId && duplicateFiles.length === 0) {
        const { data: existingDocs } = await createClient()
          .from("documents")
          .select("file_name")
          .eq("case_id", selectedCaseId)
        const existingNames = new Set((existingDocs ?? []).map((d) => d.file_name as string))
        const dupes = pendingFiles.filter((f) => existingNames.has(f.name)).map((f) => f.name)
        if (dupes.length > 0) {
          setDuplicateFiles(dupes)
          setIsSubmitting(false)
          return
        }
      }

      // Create new case if needed
      if (mode === "new") {
        const payload: Record<string, string> = {
          case_name: newCaseName.trim() || "New Case",
        }
        if (newPartyRole) payload.party_role = newPartyRole
        if (newCaseStage) payload.case_stage = newCaseStage
        const { data, error } = await createClient()
          .from("cases")
          .insert(payload)
          .select("id")
          .single()
        if (error || !data) throw new Error(error?.message ?? "Failed to create case")
        caseId = data.id
      }

      setDialogOpen(false)

      const PHASES: PhaseState[] = [
        { label: "Extracting & classifying", status: "pending" },
      ]

      // Init upload items
      setUploads(pendingFiles.map((file) => ({
        file,
        status:   "queued",
        phases:   PHASES.map((p) => ({ ...p })),
        steps:    [],
        expanded: false,
      })))

      // Upload files sequentially
      for (const file of pendingFiles) {
        setUploads((prev) =>
          prev.map((u) => (u.file === file ? { ...u, status: "uploading" } : u)),
        )
        try {
          const { document_id: documentId } = await uploadDocument(caseId, file, (event: PipelineEvent) => {
            if (event.phase != null && event.status) {
              const idx = event.phase - 1
              setUploads((prev) =>
                prev.map((u) => {
                  if (u.file !== file) return u
                  const phases = u.phases.map((p, i) =>
                    i === idx ? { ...p, status: event.status as PhaseState["status"] } : p,
                  )
                  return { ...u, phases }
                }),
              )
            }
          })

          // SSE done — store documentId and subscribe to live step updates
          if (documentId) {
            setUploads((prev) =>
              prev.map((u) =>
                u.file === file
                  ? { ...u, status: "done", documentId, expanded: true }
                  : u,
              ),
            )
            subscribeToSteps(documentId, file)
          } else {
            setUploads((prev) =>
              prev.map((u) => (u.file === file ? { ...u, status: "done" } : u)),
            )
          }
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file
                ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
                : u,
            ),
          )
        }
      }
      onUploadComplete?.()
    } catch (err) {
      console.error("[OmniDropZone] confirm error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        className={cn(
          "glass flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-border",
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Drop documents here</p>
          <p className="mt-0.5 text-xs text-muted-foreground">PDF, DOCX, HTML — or click to browse</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.docx,.doc,.html,.htm,.xhtml"
          onChange={handleFileChange}
        />
      </div>

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((u, i) => {
            const { label, cls } = STATUS_LABEL[u.status]
            const allDone = u.steps.length > 0 && u.steps.every((s) => s.status === "done")
            const hasRunning = u.steps.some((s) => s.status === "running")

            return (
              <li key={i} className="glass rounded-lg px-3 py-2 text-xs space-y-2">
                {/* Header row — click to expand/collapse checklist */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() =>
                    setUploads((prev) =>
                      prev.map((item, idx) =>
                        idx === i ? { ...item, expanded: !item.expanded } : item,
                      ),
                    )
                  }
                >
                  <span className="truncate text-foreground/80">{u.file.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cls}>{label}</span>
                    {u.steps.length > 0 && (
                      <span className="text-muted-foreground">
                        {u.expanded ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </button>

                {/* SSE phase indicator (shown while Phase 1 is in progress) */}
                {(u.status === "uploading") && (
                  <ul className="space-y-1 pl-1">
                    {u.phases.map((phase, pi) => (
                      <li key={pi} className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", PHASE_DOT_CLS[phase.status])} />
                        <span className={cn("truncate", PHASE_STATUS_CLS[phase.status])}>
                          {phase.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Expandable Realtime checklist */}
                {u.expanded && u.steps.length > 0 && (
                  <ul className="space-y-1 border-t border-border/30 pt-2 pl-1">
                    {sortSteps(u.steps).map((step) => (
                      <li key={step.step_name} className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            step.status === "done"    ? "bg-emerald-400"
                            : step.status === "running" ? "bg-amber-400 animate-pulse"
                            : step.status === "error"   ? "bg-red-400"
                            : "bg-muted-foreground/30",
                          )}
                        />
                        <div className="min-w-0">
                          <span
                            className={cn(
                              "truncate",
                              step.status === "done"    ? "text-emerald-400"
                              : step.status === "running" ? "text-amber-400"
                              : step.status === "error"   ? "text-red-400"
                              : "text-muted-foreground",
                            )}
                          >
                            {step.display_label}
                          </span>
                          {step.status === "error" && step.error_message && (
                            <p className="text-red-400/80 text-[10px] mt-0.5 truncate">
                              {step.error_message}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}

                    {/* Summary line at the bottom */}
                    {(hasRunning || !allDone) && (
                      <li className="pt-1 text-[10px] text-muted-foreground">
                        {hasRunning
                          ? "Enrichment running in background…"
                          : "Waiting for background processing…"}
                      </li>
                    )}
                    {allDone && (
                      <li className="pt-1 text-[10px] text-emerald-400/70">
                        All processing complete
                      </li>
                    )}
                  </ul>
                )}

                {u.status === "error" && (
                  <p className="text-red-400">{u.error}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Case selection dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to case</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {pendingFiles.length === 1
                ? `"${pendingFiles[0]?.name}"`
                : `${pendingFiles.length} files selected`}
            </p>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                  mode === "existing"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80",
                )}
                disabled={casesLoading || !cases.length}
              >
                {casesLoading ? "Loading…" : "Existing case"}
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                  mode === "new"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80",
                )}
              >
                New case
              </button>
            </div>

            {mode === "existing" && cases.length > 0 && (
              <Select value={selectedCaseId} onValueChange={(v) => { setSelectedCaseId(v); setDuplicateFiles([]) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case…" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_name}
                      {c.party_role ? ` — ${c.party_role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "new" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="Case name (e.g. Smith v. Acme Corp)"
                  className="glass w-full rounded-lg border border-border/50 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Select value={newPartyRole} onValueChange={setNewPartyRole}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue placeholder="Your side…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plaintiff">Plaintiff</SelectItem>
                      <SelectItem value="defendant">Defendant</SelectItem>
                      <SelectItem value="appellant">Appellant</SelectItem>
                      <SelectItem value="appellee">Appellee</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newCaseStage} onValueChange={setNewCaseStage}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue placeholder="Stage…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filing">Filing</SelectItem>
                      <SelectItem value="discovery">Discovery</SelectItem>
                      <SelectItem value="motions">Motions</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="appeal">Appeal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Processing options */}
          <div className="grid grid-cols-2 gap-3 px-1">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select value={uploadPriority} onValueChange={setUploadPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Process now</SelectItem>
                  <SelectItem value="soon">Soon (15-30 min)</SelectItem>
                  <SelectItem value="overnight">Overnight (best accuracy)</SelectItem>
                  <SelectItem value="manual">Manual trigger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Processing mode</label>
              <Select value={uploadProcessingMode} onValueChange={setUploadProcessingMode}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast (quick models)</SelectItem>
                  <SelectItem value="balanced">Balanced (default)</SelectItem>
                  <SelectItem value="accuracy">Accuracy (multi-pass)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {duplicateFiles.length > 0 && (
            <p className="text-sm text-amber-400 px-1">
              {duplicateFiles.length === 1
                ? `"${duplicateFiles[0]}" is already in this case. Are you sure you want to upload it? This is a copy.`
                : `${duplicateFiles.length} files are already in this case. Are you sure you want to upload them? These are copies.`}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || (mode === "existing" && !selectedCaseId)}
            >
              {isSubmitting ? "Processing…" : duplicateFiles.length > 0 ? "Upload anyway" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
