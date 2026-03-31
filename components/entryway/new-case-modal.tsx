"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CaseOnboardingChatbot } from "./case-onboarding-chatbot"

interface NewCaseModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /**
   * When provided, called with the new case_id instead of navigating.
   * Useful when creating a case as part of a file upload flow.
   */
  onCreated?: (caseId: string) => void
}

export function NewCaseModal({ open, onOpenChange, onCreated }: NewCaseModalProps) {
  const handleOpenChange = (v: boolean) => {
    onOpenChange(v)
  }

  const handleCreated = (caseId: string) => {
    onOpenChange(false)
    onCreated?.(caseId)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[560px] flex-col overflow-hidden p-0 sm:max-w-lg">
        {/* Header */}
        <div className="shrink-0 border-b border-border/20 px-5 py-3.5">
          <h2 className="text-sm font-semibold">New Case</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Answer a few quick questions to set up your case.
          </p>
        </div>

        {/* Chatbot fills remaining height */}
        <div className="min-h-0 flex-1">
          {open && (
            <CaseOnboardingChatbot
              onCreated={handleCreated}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
