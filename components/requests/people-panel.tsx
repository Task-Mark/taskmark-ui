import Link from "next/link"

import { cn } from "../../lib/utils"
import type { RequestBoardData } from "../../lib/board-model/request-types"
import { boardViewHref } from "../../lib/board-model/request-nav"
import {
  STATUS_PERIODS,
  STATUS_PERIOD_LABELS,
  type StatusPeriod,
} from "../../lib/board-model/client-status"
import {
  buildPeople,
  formatPoints,
  personKey,
  type PeopleSummary,
} from "../../lib/board-model/people"
import { AgentSessionsCard, PersonCard } from "./people-card"
import { UNASSIGNED_COLOR, personColor, type PersonColor } from "./people-colors"
import { PeopleWeekTable, type WeekColumn } from "./people-week-table"
import {
  EmptyNote,
  Panel,
  PanelHeader,
  ScreenHeader,
  formatDay,
  plural,
} from "./request-ui"

export type PeoplePanelProps = {
  data: RequestBoardData
  projectName: string
  /** `?period=`: `4w`, `12w` (default), `all`. */
  period: string | null
}

type ShareSlice = {
  key: string
  name: string
  points: number
  tasks: number
  share: number
  color: PersonColor
}

export function PeoplePanel({ data, projectName, period }: PeoplePanelProps) {
  const summary = buildPeople(data, period)
  const { people, today, weeks } = summary

  const colors = new Map(people.map((p, i) => [p.key, personColor(i)]))
  const slices: ShareSlice[] = people
    .filter((p) => p.shippedPoints > 0 || p.shippedTasks > 0)
    .map((p) => ({
      key: p.key,
      name: p.name,
      points: p.shippedPoints,
      tasks: p.shippedTasks,
      share: p.share,
      color: colors.get(p.key) ?? personColor(0),
    }))
  if (summary.unassigned) {
    slices.push({
      key: "__unassigned",
      name: "Unassigned",
      points: summary.unassigned.shippedPoints,
      tasks: summary.unassigned.shippedTasks,
      share: summary.unassigned.share,
      color: UNASSIGNED_COLOR,
    })
  }

  const owned = new Map<string, number>()
  for (const request of data.requests) {
    for (const owner of request.owners) {
      const key = personKey(owner.name)
      owned.set(key, (owned.get(key) ?? 0) + 1)
    }
  }

  const sparkMax = Math.max(0, ...people.flatMap((p) => p.weekly))
  const columns: WeekColumn[] = slices.map((s) => ({
    key: s.key,
    name: s.key === "__unassigned" ? "Unassigned" : firstName(s.name, slices),
    color: s.color,
    weekly:
      s.key === "__unassigned"
        ? (summary.unassigned?.weekly ?? [])
        : (people.find((p) => p.key === s.key)?.weekly ?? []),
  }))

  const since = `since ${formatDay(summary.start, today)}`
  const eyebrow = [
    projectName,
    people.length > 0 ? plural(people.length, "person", "people") : "",
    `as of ${formatDay(today)}`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex w-full min-w-0 flex-col gap-8">
      <ScreenHeader
        eyebrow={eyebrow}
        title="People"
        description="Who shipped what. Points count once a task reaches main and go to the people who resolved it. Sessions and hours come from each task's work log."
        actions={<PeriodPicker current={summary.period} />}
      />

      <SharePanel summary={summary} slices={slices} since={since} />

      {people.length > 0 || summary.agent.sessions > 0 ? (
        <div className="grid items-stretch gap-5 grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))]">
          {people.map((p) => (
            <PersonCard
              key={p.key}
              person={p}
              color={colors.get(p.key) ?? personColor(0)}
              weeks={weeks}
              sparkMax={sparkMax}
              today={today}
              ownedRequests={owned.get(p.key) ?? 0}
            />
          ))}
          <AgentSessionsCard
            agent={summary.agent}
            activityHref={boardViewHref({ view: "activity", hasRequestBoard: true })}
          />
        </div>
      ) : (
        <EmptyNote>
          No one shipped, committed or logged a session {since}. Try a longer period.
        </EmptyNote>
      )}

      {columns.length > 0 ? (
        <Panel aria-labelledby="people-weeks">
          <PanelHeader
            title={<span id="people-weeks">Week by week</span>}
            hint={`Pts shipped · ${plural(weeks.length, "week")}`}
          />
          <div className="p-4">
            <PeopleWeekTable weeks={weeks} columns={columns} today={today} />
          </div>
        </Panel>
      ) : null}

      {data.legacyLeafCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {plural(data.legacyLeafCount, "task")} still sit outside any request and are not
          counted here.
        </p>
      ) : null}
    </div>
  )
}

/** First name, unless two people share it. */
function firstName(name: string, slices: ShareSlice[]): string {
  const first = name.split(" ")[0] ?? name
  const clash = slices.filter((s) => (s.name.split(" ")[0] ?? s.name) === first).length > 1
  return clash ? name : first
}

function PeriodPicker({ current }: { current: StatusPeriod }) {
  return (
    <nav
      aria-label="Period"
      className="flex flex-wrap gap-1 border-2 border-black bg-card p-1 shadow-[3px_3px_0_0_var(--shadow-color)]"
    >
      {STATUS_PERIODS.map((p) => {
        const active = p === current
        return (
          <Link
            key={p}
            href={boardViewHref({ view: "people", period: p, hasRequestBoard: true })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center border-2 px-3.5 text-sm font-semibold",
              active
                ? "border-black bg-primary text-primary-foreground shadow-[2px_2px_0_0_#000]"
                : "border-transparent hover:border-black"
            )}
          >
            {STATUS_PERIOD_LABELS[p]}
          </Link>
        )
      })}
    </nav>
  )
}

const FOOTNOTE =
  "Points go to the people who resolved each task, split evenly when there are several. Nothing counts until it reaches main."

function SharePanel({
  summary,
  slices,
  since,
}: {
  summary: PeopleSummary
  slices: ShareSlice[]
  since: string
}) {
  const total = formatPoints(summary.shippedPoints)
  return (
    <Panel className="flex flex-col gap-4 p-4 sm:p-6" aria-labelledby="people-share">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="people-share" className="font-head text-2xl leading-tight">
          Share of shipped work
        </h2>
        <span className="font-mono text-[13px] text-muted-foreground">
          {total} pts · {plural(summary.shippedTasks, "task")} {since}
        </span>
      </div>

      {slices.length === 0 ? (
        <EmptyNote>Nothing reached main {since}.</EmptyNote>
      ) : slices.length === 1 ? (
        <SoloShare slice={slices[0]} since={since} />
      ) : (
        <>
          <div
            role="img"
            aria-label={slices
              .map((s) => `${s.name} ${Math.round(s.share * 100)} percent, ${formatPoints(s.points)} points`)
              .join("; ")}
            className="flex h-11 overflow-hidden border-2 border-black shadow-[3px_3px_0_0_#000]"
          >
            {slices.map((s) => (
              <div
                key={s.key}
                className={cn(
                  "flex min-w-0 items-center justify-center overflow-hidden border-r-2 border-black px-2 text-sm font-bold whitespace-nowrap text-black last:border-r-0",
                  s.color.bg
                )}
                style={{ width: `${Math.max(s.share * 100, 1)}%` }}
                title={`${s.name}: ${formatPoints(s.points)} pts`}
              >
                {s.share >= 0.12 ? (
                  <span className="truncate">{Math.round(s.share * 100)}%</span>
                ) : null}
              </div>
            ))}
          </div>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {slices.map((s) => (
              <li key={s.key} className="flex min-w-0 items-center gap-2.5 text-sm">
                <span aria-hidden className={cn("size-3.5 shrink-0 border-2 border-black", s.color.bg)} />
                <span className="truncate font-semibold">{s.name}</span>
                <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {formatPoints(s.points)} pts · {Math.round(s.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {slices.length > 0 ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">{FOOTNOTE}</p>
      ) : null}
    </Panel>
  )
}

function SoloShare({ slice, since }: { slice: ShareSlice; since: string }) {
  const amount = (
    <>
      <span className="font-mono font-semibold">{formatPoints(slice.points)} pts</span> across{" "}
      {plural(slice.tasks, "task")}
    </>
  )
  return (
    <div className="flex items-center gap-4 border-2 border-black bg-background p-4">
      <span aria-hidden className={cn("h-11 w-2.5 shrink-0 border-2 border-black", slice.color.bg)} />
      {slice.key === "__unassigned" ? (
        <p className="text-base">
          Everything shipped {since} has no resolver: {amount}.
        </p>
      ) : (
        <p className="text-base">
          <span className="font-semibold">Only {slice.name}</span> shipped work {since}: {amount}.
        </p>
      )}
    </div>
  )
}

