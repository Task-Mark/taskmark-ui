"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { formatMinutes, type ActivityFacet } from "../../lib/board-model/activity"

export type ActivityTimelineItem = {
  key: string
  /** Person who ran the session or logged the event ("" when unknown). */
  person: string
  requestIds: string[]
  /** Session length, or null for events and sessions with no end. */
  minutes: number | null
  isSession: boolean
  node: React.ReactNode
}

export type ActivityTimelineDay = {
  day: string
  heading: string
  dateLabel: string
  items: ActivityTimelineItem[]
}

const ALL = ""

/**
 * Day groups with a rail of filters (person, request). Rows render on the
 * server; this only hides the ones that do not match.
 */
export function ActivityTimeline({
  days,
  totalSessions,
  people,
  requests,
  footer,
}: {
  days: ActivityTimelineDay[]
  /** Sessions in the period, shown on the "all" buttons. */
  totalSessions: number
  people: ActivityFacet[]
  requests: ActivityFacet[]
  footer?: React.ReactNode
}) {
  const [person, setPerson] = React.useState(ALL)
  const [request, setRequest] = React.useState(ALL)

  const matches = (item: ActivityTimelineItem) =>
    (person === ALL || item.person === person) &&
    (request === ALL || item.requestIds.includes(request))

  const visibleDays = days
    .map((d) => ({ ...d, items: d.items.filter(matches) }))
    .filter((d) => d.items.length > 0)
  const filtered = person !== ALL || request !== ALL

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        aria-label="Filters"
        className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-4"
      >
        {people.length > 1 ? (
          <FilterGroup
            label="Person"
            all="Everyone"
            options={people}
            value={person}
            onChange={setPerson}
            total={totalSessions}
          />
        ) : null}
        {requests.length > 1 ? (
          <FilterGroup
            label="Request"
            all="All requests"
            options={requests}
            value={request}
            onChange={setRequest}
            total={totalSessions}
            collapseAfter={6}
          />
        ) : null}
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setPerson(ALL)
              setRequest(ALL)
            }}
            className="min-h-11 self-start text-sm font-bold underline underline-offset-4"
          >
            Clear filters
          </button>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-col gap-7">
        {visibleDays.length > 0 ? (
          visibleDays.map((d) => <DayGroup key={d.day} day={d} />)
        ) : (
          <p className="border-2 border-dashed border-muted-foreground/40 px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing matches these filters in this period.
          </p>
        )}
        {footer}
      </div>
    </div>
  )
}

function DayGroup({ day }: { day: ActivityTimelineDay }) {
  const sessions = day.items.filter((i) => i.isSession)
  const minutes = sessions.reduce((sum, i) => sum + (i.minutes ?? 0), 0)
  const events = day.items.length - sessions.length
  const meta = [
    sessions.length > 0
      ? `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`
      : "",
    minutes > 0 ? formatMinutes(minutes) : "",
    events > 0 ? `${events} ${events === 1 ? "log entry" : "log entries"}` : "",
  ]
    .filter(Boolean)
    .join(" · ")
  const headingId = `activity-day-${day.day}`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-border pb-1.5">
        <h3 id={headingId} className="font-head text-lg leading-tight">
          {day.heading}
          <span className="ml-2 font-sans text-sm font-semibold text-muted-foreground">
            {day.dateLabel}
          </span>
        </h3>
        <span className="font-mono text-xs text-muted-foreground">{meta}</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {day.items.map((item) => (
          <React.Fragment key={item.key}>{item.node}</React.Fragment>
        ))}
      </ul>
    </section>
  )
}

function FilterGroup({
  label,
  all,
  options,
  value,
  onChange,
  collapseAfter,
  total,
}: {
  total: number
  label: string
  all: string
  options: ActivityFacet[]
  value: string
  onChange: (value: string) => void
  collapseAfter?: number
}) {
  const [expanded, setExpanded] = React.useState(false)
  const limit = collapseAfter && !expanded ? collapseAfter : options.length
  // Keep the chosen option visible even when the list is collapsed.
  const shown = options.filter((o, i) => i < limit || o.id === value)
  const hidden = options.length - shown.length

  return (
    <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 lg:flex-col">
        <FilterButton active={value === ALL} onClick={() => onChange(ALL)} count={total}>
          {all}
        </FilterButton>
        {shown.map((o) => (
          <FilterButton
            key={o.id}
            active={value === o.id}
            onClick={() => onChange(value === o.id ? ALL : o.id)}
            count={o.count}
            title={o.label}
          >
            {o.label}
          </FilterButton>
        ))}
        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-h-11 px-1 text-left text-xs font-bold underline underline-offset-4"
          >
            {hidden} more
          </button>
        ) : null}
        {collapseAfter && expanded && options.length > collapseAfter ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="min-h-11 px-1 text-left text-xs font-bold underline underline-offset-4"
          >
            Show fewer
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  count,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        "flex min-h-11 max-w-full items-center justify-between gap-2 border-2 border-black px-2.5 text-left text-xs font-bold transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-[2px_2px_0_0_#000]"
          : "bg-background text-foreground hover:bg-muted"
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <span className="shrink-0 font-mono font-semibold opacity-70">{count}</span>
    </button>
  )
}
