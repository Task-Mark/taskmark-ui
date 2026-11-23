"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import type { RequestStatus } from "../../lib/board-model/request-types"

export type RequestFilterRow = {
  key: string
  status: RequestStatus
  /** Keep this card visible whatever the filter (the selected request). */
  pinned?: boolean
  node: React.ReactNode
}

type FilterValue = "all" | "building" | "ready" | "shipped"

const FILTERS: { value: FilterValue; label: string; activeClass: string }[] = [
  { value: "all", label: "All", activeClass: "bg-primary text-primary-foreground" },
  { value: "building", label: "Building", activeClass: "bg-chart-3 text-black" },
  { value: "ready", label: "Backlog", activeClass: "bg-backlog text-black" },
  { value: "shipped", label: "Shipped", activeClass: "bg-shipped text-black" },
]

const STORAGE_KEY = "taskmark:work-request-filter"

const listeners = new Set<() => void>()
/** Fallback when sessionStorage is blocked. */
let memory: FilterValue = "all"

function readStored(): FilterValue {
  try {
    const v = window.sessionStorage.getItem(STORAGE_KEY)
    return FILTERS.some((f) => f.value === v) ? (v as FilterValue) : memory
  } catch {
    return memory
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function store(value: FilterValue): void {
  memory = value
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Blocked storage: the in-memory value still applies on this page.
  }
  for (const listener of listeners) listener()
}

/**
 * Request list on Work with an All / Building / Backlog / Shipped filter.
 * Cards render on the server; the choice survives picking another request.
 */
export function WorkHubRequestFilter({ rows }: { rows: RequestFilterRow[] }) {
  const filter = React.useSyncExternalStore(subscribe, readStored, () => "all" as FilterValue)
  const choose = store
  const count = (value: FilterValue) =>
    value === "all" ? rows.length : rows.filter((r) => r.status === value).length
  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter || r.pinned)

  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label="Show requests" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => choose(f.value)}
              className={cn(
                "min-h-11 border-2 border-black px-2.5 text-xs font-bold transition-colors",
                active
                  ? cn(f.activeClass, "shadow-[2px_2px_0_0_#000]")
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              {f.label}
              <span className="ml-1.5 font-mono font-semibold opacity-70">{count(f.value)}</span>
            </button>
          )
        })}
      </div>
      {visible.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {visible.map((r) => (
            <React.Fragment key={r.key}>{r.node}</React.Fragment>
          ))}
        </ul>
      ) : (
        <p className="border-2 border-dashed border-muted-foreground/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No requests with this status.
        </p>
      )}
    </div>
  )
}
