"use client"

import * as React from "react"

import { cn } from "../../lib/utils"

export type RequestGroupSection = {
  key: string
  label: string
  count: number
  /** Counted under "Open" (building, ready, proposed). */
  open: boolean
  content: React.ReactNode
}

/**
 * Status filter for the Requests list. The sections are rendered on the
 * server; this only chooses which ones show.
 */
export function RequestGroupFilter({
  sections,
}: {
  sections: RequestGroupSection[]
}) {
  const present = sections.filter((s) => s.count > 0)
  const openCount = present.filter((s) => s.open).reduce((n, s) => n + s.count, 0)
  const total = present.reduce((n, s) => n + s.count, 0)
  const filters = [
    ...(openCount > 0 ? [{ key: "open", label: "Open", count: openCount }] : []),
    ...present.map((s) => ({ key: s.key, label: s.label, count: s.count })),
    { key: "all", label: "All", count: total },
  ]
  const [filter, setFilter] = React.useState(openCount > 0 ? "open" : "all")
  const shown = present.filter((s) =>
    filter === "all" ? true : filter === "open" ? s.open : s.key === filter
  )

  return (
    <div className="flex flex-col gap-8">
      <div
        role="group"
        aria-label="Filter by status"
        className="flex flex-wrap gap-1 self-start border-2 border-black bg-card p-1 shadow-[3px_3px_0_0_var(--shadow-color)]"
      >
        {filters.map((f) => {
          const active = f.key === filter
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 border-2 px-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-black bg-primary text-primary-foreground"
                  : "border-transparent text-foreground hover:border-black hover:bg-muted"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "border-2 border-black px-1 font-mono text-[11px] leading-4",
                  active ? "bg-black text-primary" : "bg-muted text-foreground"
                )}
              >
                {f.count}
              </span>
            </button>
          )
        })}
      </div>
      {shown.map((s) => (
        <React.Fragment key={s.key}>{s.content}</React.Fragment>
      ))}
    </div>
  )
}
