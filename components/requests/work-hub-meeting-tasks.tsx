"use client"

import * as React from "react"

import { cn } from "../../lib/utils"

export type MeetingTaskRow = {
  key: string
  /** Still to do (not done, not in production, not cancelled). */
  open: boolean
  node: React.ReactNode
}

const FILTERS = [
  { value: "all", label: "All tasks" },
  { value: "open", label: "Not done yet" },
] as const

/** Meeting task list with an All / Not done yet filter. Rows render on the server. */
export function WorkHubMeetingTasks({ rows }: { rows: MeetingTaskRow[] }) {
  const [filter, setFilter] = React.useState<"all" | "open">("all")
  const openCount = rows.filter((r) => r.open).length
  const visible = filter === "open" ? rows.filter((r) => r.open) : rows

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Show tasks" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value
          const count = f.value === "open" ? openCount : rows.length
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                "min-h-11 border-2 border-black px-3 text-xs font-bold transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-[2px_2px_0_0_#000]"
                  : "bg-background text-foreground hover:bg-muted"
              )}
            >
              {f.label}
              <span className="ml-1.5 font-mono font-semibold opacity-70">{count}</span>
            </button>
          )
        })}
      </div>
      {visible.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visible.map((r) => (
            <React.Fragment key={r.key}>{r.node}</React.Fragment>
          ))}
        </ul>
      ) : (
        <p className="border-2 border-dashed border-muted-foreground/40 px-4 py-4 text-center text-sm text-muted-foreground">
          Every task from this meeting is done.
        </p>
      )}
    </div>
  )
}
