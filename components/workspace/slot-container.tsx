"use client"

import { useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { type ViewId } from "@/lib/types/workspace"
import { ViewPicker } from "./view-picker"
import { useWorkspace } from "@/providers/workspace-provider"

interface SlotContainerProps {
  slotIndex: number
  viewId: ViewId
  isOnly: boolean // true when this is the sole slot (no close button)
  children: React.ReactNode
}

export function SlotContainer({
  slotIndex,
  viewId,
  isOnly,
  children,
}: SlotContainerProps) {
  const { slots, setSlotView, setSlotCount, setSlotWidth } = useWorkspace()
  const slot = slots[slotIndex]

  // Drag-resize logic
  const dragStartX = useRef<number | null>(null)
  const dragStartWidthPct = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragStartX.current = e.clientX
      dragStartWidthPct.current = slot.widthPct

      const onMove = (ev: MouseEvent) => {
        if (
          dragStartX.current === null ||
          dragStartWidthPct.current === null ||
          !containerRef.current
        )
          return
        const parentWidth =
          containerRef.current.parentElement?.offsetWidth ?? window.innerWidth
        const deltaPx = ev.clientX - dragStartX.current
        const deltaPct = (deltaPx / parentWidth) * 100
        setSlotWidth(slotIndex, dragStartWidthPct.current + deltaPct)
      }

      const onUp = () => {
        dragStartX.current = null
        dragStartWidthPct.current = null
        window.removeEventListener("mousemove", onMove)
        window.removeEventListener("mouseup", onUp)
      }

      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
    },
    [slotIndex, slot.widthPct, setSlotWidth]
  )

  const handleClose = () => {
    setSlotCount((slots.length - 1) as 1 | 2 | 3)
  }

  const isLast = slotIndex === slots.length - 1

  return (
    <motion.div
      ref={containerRef}
      layout
      style={{ flexBasis: `${slot.widthPct}%`, flexShrink: 0 }}
      className={cn(
        "relative flex flex-col h-full overflow-hidden",
        !isLast && "border-r border-border/30"
      )}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Slot header */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border/20 bg-muted/10 px-2">
        <ViewPicker
          current={viewId}
          onSelect={(v) => setSlotView(slotIndex, v)}
        />
        {!isOnly && (
          <button
            onClick={handleClose}
            className="ml-auto rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-muted/40 hover:text-muted-foreground"
            title="Close panel"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* View content */}
      <div className="flex-1 overflow-auto scrollbar-none">
        {children}
      </div>

      {/* Resize handle — on the right edge, hidden for the last slot */}
      {!isLast && (
        <div
          onMouseDown={onResizeMouseDown}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
        />
      )}
    </motion.div>
  )
}
