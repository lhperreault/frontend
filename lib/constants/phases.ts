export const PHASES = ["triage", "discovery", "trial_prep"] as const
export type Phase = (typeof PHASES)[number]

// Controls which panels are expanded/emphasized per phase
export const PHASE_WEIGHTS: Record<
  Phase,
  {
    knowledgeShelf: "expanded" | "collapsed" | "default"
    lightbox: "expanded" | "collapsed" | "default"
    legalPad: "expanded" | "collapsed" | "default"
    chronology: "expanded" | "collapsed" | "default"
  }
> = {
  triage: {
    knowledgeShelf: "expanded",
    lightbox: "default",
    legalPad: "default",
    chronology: "collapsed",
  },
  discovery: {
    knowledgeShelf: "default",
    lightbox: "expanded",
    legalPad: "default",
    chronology: "default",
  },
  trial_prep: {
    knowledgeShelf: "default",
    lightbox: "default",
    legalPad: "expanded",
    chronology: "expanded",
  },
}

export const DEFAULT_PHASE: Phase = "triage"
