"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { ROADMAP_LABEL_CELL, ROADMAP_ROW_GRID } from "./roadmap-layout"

export type RoadmapRowGroupProps = {
  /** Left cell content (title, chips, meta). */
  label: React.ReactNode
  /** Right cell content (bars on the time track). */
  track: React.ReactNode
  /** Rows shown when the group is open. */
  children: React.ReactNode
  /** What the toggle opens, for screen readers, e.g. "epics of Careers site". */
  toggleLabel: string
  defaultOpen?: boolean
  className?: string
}

/** Timeline row with a toggle that shows or hides the rows under it. */
export function RoadmapRowGroup({
  label,
  track,
  children,
  toggleLabel,
  defaultOpen = false,
  className,
}: RoadmapRowGroupProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const id = React.useId()
  return (
    <div>
      <div className={cn(ROADMAP_ROW_GRID, className)}>
        <div className={cn(ROADMAP_LABEL_CELL, "items-stretch")}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            aria-label={`${open ? "Hide" : "Show"} ${toggleLabel}`}
            onClick={() => setOpen((v) => !v)}
            className="grid w-9 shrink-0 cursor-pointer place-items-center text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:w-10"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-90")}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2 pr-3">{label}</div>
        </div>
        <div className="relative" aria-hidden="true">
          {track}
        </div>
      </div>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </div>
  )
}
