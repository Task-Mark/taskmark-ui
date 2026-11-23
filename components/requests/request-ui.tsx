import type * as React from "react"

import { cn } from "../../lib/utils"
import type { RequestStatus } from "../../lib/board-model/request-types"
import type { Stage } from "../../lib/board-model/stage"

/**
 * Small pieces shared by the request screens (Work, Requests, Request,
 * Roadmap, Client status). Retro style: 2px black borders, hard offset
 * shadows, Archivo Black headings, JetBrains Mono labels.
 */

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  proposed: "Proposed",
  ready: "Backlog",
  building: "Building",
  shipped: "Shipped",
  shelved: "Shelved",
  cancelled: "Cancelled",
}

const REQUEST_STATUS_CLASS: Record<RequestStatus, string> = {
  proposed: "bg-accent text-accent-foreground",
  ready: "bg-backlog text-black",
  building: "bg-chart-3 text-black",
  shipped: "bg-shipped text-black",
  shelved: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
}

export const STAGE_LABELS: Record<Stage, string> = {
  development: "Development",
  testing: "Testing",
  production: "Production",
}

/** Short branch names the stages are read from. */
export const STAGE_BRANCH: Record<Stage, string> = {
  development: "develop",
  testing: "quality",
  production: "main",
}

const STAGE_CLASS: Record<Stage, string> = {
  development: "bg-primary text-primary-foreground",
  testing: "bg-chart-3 text-black",
  production: "bg-shipped text-black",
}

export const STAGE_FILL: Record<Stage | "none", string> = {
  none: "bg-muted",
  development: "bg-primary",
  testing: "bg-chart-3",
  production: "bg-shipped",
}

export function MonoLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

export function Chip({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border-2 border-black px-1.5 py-px font-mono text-[11px] leading-4 font-semibold whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

export function RequestStatusChip({
  status,
  className,
}: {
  status: RequestStatus
  className?: string
}) {
  return (
    <Chip className={cn(REQUEST_STATUS_CLASS[status], className)}>
      {REQUEST_STATUS_LABELS[status]}
    </Chip>
  )
}

export function StageChip({
  stage,
  className,
}: {
  stage: Stage | null
  className?: string
}) {
  if (!stage) {
    return (
      <Chip className={cn("bg-muted text-muted-foreground", className)}>
        No commits
      </Chip>
    )
  }
  return (
    <Chip
      className={cn(STAGE_CLASS[stage], className)}
      title={`Commits reached ${STAGE_BRANCH[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </Chip>
  )
}

/** E / S / T / B square used in request trees. */
export function KindMark({
  kind,
  className,
}: {
  kind: "epic" | "story" | "task" | "bug"
  className?: string
}) {
  const letter = kind === "epic" ? "E" : kind === "story" ? "S" : kind === "bug" ? "B" : "T"
  const color =
    kind === "epic"
      ? "bg-chart-2 text-black"
      : kind === "story"
        ? "bg-primary text-primary-foreground"
        : kind === "bug"
          ? "bg-destructive text-destructive-foreground"
          : "bg-shipped text-black"
  return (
    <span
      aria-label={kind}
      className={cn(
        "inline-grid size-5 shrink-0 place-items-center border-2 border-black font-mono text-[10px] font-bold",
        color,
        className
      )}
    >
      {letter}
    </span>
  )
}

/** Card with a 2px black border and a hard shadow. */
export function Panel({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "border-2 border-black bg-card text-card-foreground shadow-[4px_4px_0_0_var(--shadow-color)]",
        className
      )}
      {...props}
    />
  )
}

export function PanelHeader({
  title,
  hint,
  action,
  className,
}: {
  title: React.ReactNode
  hint?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black px-4 py-3",
        className
      )}
    >
      <h2 className="font-head text-lg leading-tight">{title}</h2>
      {hint ? <MonoLabel>{hint}</MonoLabel> : null}
      {action}
    </div>
  )
}

/** Page title block used at the top of every request screen. */
export function ScreenHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? <MonoLabel>{eyebrow}</MonoLabel> : null}
        <h1 className="font-head text-3xl leading-none tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

/**
 * Horizontal bar split by stage: shipped (main), testing (quality),
 * development, and not started.
 */
export function StageBar({
  counts,
  className,
  label,
}: {
  counts: Record<Stage | "none", number>
  className?: string
  label?: string
}) {
  const total =
    counts.none + counts.development + counts.testing + counts.production
  const order: (Stage | "none")[] = ["production", "testing", "development", "none"]
  return (
    <div
      role="img"
      aria-label={
        label ??
        `${counts.production} of ${total} in production, ${counts.testing} in testing, ${counts.development} in development`
      }
      className={cn("flex h-3 w-full overflow-hidden border-2 border-black bg-muted", className)}
    >
      {total > 0
        ? order.map((key) =>
            counts[key] > 0 ? (
              <span
                key={key}
                className={cn("h-full border-r-2 border-black last:border-r-0", STAGE_FILL[key])}
                style={{ width: `${(counts[key] / total) * 100}%` }}
              />
            ) : null
          )
        : null}
    </div>
  )
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `2026-12-18` → `Dec 18` (adds the year when it differs from `asOf`). */
export function formatDay(day: string, asOf?: string): string {
  if (!day) return ""
  const [y, m, d] = day.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return day
  const label = `${MONTHS[m - 1]} ${d}`
  if (asOf && Number(asOf.slice(0, 4)) !== y) return `${label}, ${y}`
  return label
}

/** `2026-11-23T18:41:00Z` → `Nov 23, 18:41` (UTC). */
export function formatDateTime(iso: string): string {
  if (!iso) return ""
  const day = formatDay(iso)
  const time = iso.length >= 16 ? iso.slice(11, 16) : ""
  return time ? `${day}, ${time}` : day
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function PersonBadge({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <span
      title={name}
      className={cn(
        "inline-grid size-7 shrink-0 place-items-center border-2 border-black bg-chart-4 text-[10px] font-bold text-black",
        className
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

export function EmptyNote({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-2 border-dashed border-muted-foreground/40 px-4 py-6 text-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
