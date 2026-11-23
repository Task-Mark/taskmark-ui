import type * as React from "react"
import Link from "next/link"

import { cn } from "../../lib/utils"
import type { RequestBoardData } from "../../lib/board-model/request-types"
import { boardViewHref } from "../../lib/board-model/request-nav"
import {
  DEFAULT_STATUS_PERIOD,
  STATUS_PERIODS,
  STATUS_PERIOD_LABELS,
  type StatusPeriod,
} from "../../lib/board-model/client-status"
import {
  ACTIVITY_MAX_DAYS,
  buildActivity,
  dayHeading,
  formatHours,
  formatMinutes,
  timeOf,
  type Activity,
  type ActivityEvent,
  type ActivityLogKind,
  type ActivitySession,
  type ActivitySessionTask,
} from "../../lib/board-model/activity"
import {
  ActivityTimeline,
  type ActivityTimelineDay,
  type ActivityTimelineItem,
} from "./activity-timeline"
import {
  Chip,
  EmptyNote,
  KindMark,
  MonoLabel,
  Panel,
  PersonBadge,
  ScreenHeader,
  StageChip,
  formatDay,
  plural,
} from "./request-ui"

export type ActivityPanelProps = {
  data: RequestBoardData
  projectName: string
  /** `?period=`: `4w`, `12w` (default), `all`. */
  period: string | null
}

/** Tasks listed inside one session before the rest are summed up. */
const MAX_TASKS_PER_SESSION = 4

const EVENT_LABELS: Record<ActivityLogKind, string> = {
  merge: "Merge",
  promote: "Promote",
  release: "Release",
  decision: "Decision",
}

const EVENT_CLASS: Record<ActivityLogKind, string> = {
  merge: "bg-primary text-primary-foreground",
  promote: "bg-chart-3 text-black",
  release: "bg-shipped text-black",
  decision: "bg-chart-2 text-black",
}

function periodParam(period: StatusPeriod): string | null {
  return period === DEFAULT_STATUS_PERIOD ? null : period
}

function taskHref(id: string, period: StatusPeriod): string {
  return boardViewHref({
    view: "activity",
    item: id,
    period: periodParam(period),
    hasRequestBoard: true,
  })
}

function requestHref(id: string): string {
  return boardViewHref({ view: "request", request: id, hasRequestBoard: true })
}

export function ActivityPanel({ data, projectName, period }: ActivityPanelProps) {
  const activity = buildActivity(data, period)
  const { today } = activity

  const header = (
    <ScreenHeader
      eyebrow={`${projectName} · as of ${formatDay(today)}`}
      title="Activity"
      description="Every working session logged on a task, newest first, with the stage that task has reached now. Only work on main counts as shipped. Times are in UTC."
      actions={activity.hasWorkLog ? <PeriodPicker current={activity.period} /> : null}
    />
  )

  if (!activity.hasWorkLog) {
    return (
      <div className="flex w-full flex-col gap-8">
        {header}
        <EmptyNote>
          No work log yet. Sessions show up here once someone, or an agent, adds rows to the
          Work log table of a task.
        </EmptyNote>
      </div>
    )
  }

  const timelineDays: ActivityTimelineDay[] = activity.days.map((d) => ({
    day: d.day,
    heading: dayHeading(d.day, today),
    dateLabel: formatDay(d.day, today),
    items: d.entries.map(
      (entry): ActivityTimelineItem =>
        entry.type === "session"
          ? {
              key: entry.key,
              person: entry.actor,
              requestIds: [...new Set(entry.tasks.map((t) => t.requestId))],
              minutes: entry.minutes,
              isSession: true,
              node: <SessionRow session={entry} period={activity.period} />,
            }
          : {
              key: entry.key,
              person: entry.person,
              requestIds: [entry.requestId],
              minutes: null,
              isSession: false,
              node: <EventRow event={entry} />,
            }
    ),
  }))

  return (
    <div className="flex w-full flex-col gap-8">
      {header}

      <KpiRow activity={activity} />

      {activity.running.length > 0 ? (
        <RunningNow sessions={activity.running} period={activity.period} />
      ) : null}

      <section className="flex flex-col gap-4" aria-labelledby="activity-sessions">
        <h2 id="activity-sessions" className="font-head text-2xl leading-tight">
          Sessions by day
        </h2>
        {timelineDays.length > 0 ? (
          <ActivityTimeline
            days={timelineDays}
            totalSessions={activity.stats.sessions}
            people={activity.people}
            requests={activity.requests}
            footer={<TimelineFooter activity={activity} />}
          />
        ) : (
          <EmptyNote>
            No sessions in this period.{" "}
            <Link
              href={boardViewHref({ view: "activity", period: "all", hasRequestBoard: true })}
              className="inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4"
            >
              See all time
            </Link>
          </EmptyNote>
        )}
      </section>
    </div>
  )
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
            href={boardViewHref({ view: "activity", period: p, hasRequestBoard: true })}
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

function periodPhrase(activity: Activity): string {
  return activity.start ? `since ${formatDay(activity.start, activity.today)}` : "all time"
}

function Kpi({
  title,
  value,
  detail,
  accent,
  highlight,
}: {
  title: React.ReactNode
  value: React.ReactNode
  detail: React.ReactNode
  accent: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-h-36 flex-col gap-4 border-2 border-black p-5 shadow-[4px_4px_0_0_var(--shadow-color)]",
        highlight ? "bg-chart-2 text-black" : "bg-card text-card-foreground"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-[15px] leading-snug", highlight ? "font-bold" : "font-semibold")}>
          {title}
        </span>
        <span
          aria-hidden
          className={cn("size-4 shrink-0 border-2 border-black shadow-[2px_2px_0_0_#000]", accent)}
        />
      </div>
      <div className="mt-auto">
        <div className="font-head text-4xl leading-none tabular-nums sm:text-[44px]">{value}</div>
        <div
          className={cn("mt-2 text-[13px]", highlight ? "font-semibold" : "text-muted-foreground")}
        >
          {detail}
        </div>
      </div>
    </div>
  )
}

function KpiRow({ activity }: { activity: Activity }) {
  const { stats } = activity
  const phrase = periodPhrase(activity)
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
      <Kpi
        title="Sessions"
        value={stats.sessions}
        detail={`${plural(stats.people, "person", "people")}, ${phrase}`}
        accent="bg-primary"
        highlight
      />
      <Kpi
        title="Hours worked"
        value={formatHours(stats.minutes)}
        detail={
          stats.openSessions > 0
            ? `${plural(stats.openSessions, "session")} with no end not counted`
            : "From start and end times"
        }
        accent="bg-chart-3"
      />
      <Kpi
        title="Tasks touched"
        value={stats.tasks}
        detail="With at least one session"
        accent="bg-backlog"
      />
      <Kpi
        title="Commits"
        value={stats.commits}
        detail={`Linked to tasks, ${phrase}`}
        accent="bg-shipped"
      />
    </div>
  )
}

function RunningNow({ sessions, period }: { sessions: ActivitySession[]; period: StatusPeriod }) {
  return (
    <Panel aria-labelledby="activity-running">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black bg-chart-3 px-4 py-3 text-black">
        <h2 id="activity-running" className="flex items-center gap-2 font-head text-lg leading-tight">
          <span aria-hidden className="size-2.5 animate-pulse border-2 border-black bg-shipped" />
          Running now
        </h2>
        <span className="font-mono text-xs font-semibold">
          {plural(sessions.length, "open session")}
        </span>
      </div>
      <ul className="divide-y-2 divide-border">
        {sessions.map((s) => {
          const task = s.tasks[0]
          return (
            <li key={s.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
              <PersonBadge name={s.actor || "?"} />
              <span className="text-sm font-bold">{s.actor || "Unknown"}</span>
              <span className="font-mono text-xs text-muted-foreground">
                since {timeOf(s.started)}
              </span>
              {task ? (
                <Link
                  href={taskHref(task.id, period)}
                  className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm underline-offset-4 hover:underline"
                >
                  <span className="shrink-0 font-mono text-xs font-semibold">{task.id}</span>
                  <span className="truncate">{task.title}</span>
                </Link>
              ) : null}
              {s.tasks.length > 1 ? (
                <span className="text-xs text-muted-foreground">
                  and {plural(s.tasks.length - 1, "more task")}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function timeRange(session: ActivitySession): string {
  const from = timeOf(session.started)
  if (!session.ended) return session.running ? `${from}, still running` : `${from}, no end time`
  const endDay = session.ended.slice(0, 10)
  const to = timeOf(session.ended)
  return endDay === session.day ? `${from} to ${to}` : `${from} to ${formatDay(endDay)} ${to}`
}

function SessionRow({ session, period }: { session: ActivitySession; period: StatusPeriod }) {
  const shown = session.tasks.slice(0, MAX_TASKS_PER_SESSION)
  const extra = session.tasks.length - shown.length
  const summaries = new Set(session.tasks.map((t) => t.summary).filter(Boolean))
  // One summary for the whole batch when every task logged the same text.
  const shared = session.tasks.length > 1 && summaries.size === 1 ? [...summaries][0] : ""

  return (
    <li>
      <article
        className={cn(
          "flex gap-3 border-2 border-black bg-card p-3 text-card-foreground shadow-[3px_3px_0_0_var(--shadow-color)] sm:p-4",
          session.running && "border-l-[6px]"
        )}
      >
        <PersonBadge name={session.actor || "?"} className="mt-0.5 hidden sm:inline-grid" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-sm font-bold">{session.actor || "Unknown"}</span>
            <span className="font-mono text-xs text-muted-foreground">{timeRange(session)}</span>
            {session.minutes !== null ? (
              <Chip className="ml-auto bg-background">{formatMinutes(session.minutes)}</Chip>
            ) : session.running ? (
              <Chip className="ml-auto bg-chart-3 text-black">Running</Chip>
            ) : null}
          </div>
          <ul className="flex flex-col gap-1.5">
            {shown.map((task) => (
              <SessionTask
                key={`${task.id}|${task.summary}`}
                task={task}
                period={period}
                showSummary={!shared}
              />
            ))}
          </ul>
          {extra > 0 ? (
            <p className="text-xs text-muted-foreground">
              and {plural(extra, "more task")} in the same session
            </p>
          ) : null}
          {shared ? <p className="text-sm leading-relaxed">{shared}</p> : null}
        </div>
      </article>
    </li>
  )
}

function SessionTask({
  task,
  period,
  showSummary,
}: {
  task: ActivitySessionTask
  period: StatusPeriod
  showSummary: boolean
}) {
  return (
    <li className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5">
        <Link
          href={taskHref(task.id, period)}
          className="inline-flex min-h-11 min-w-0 items-center gap-2 font-semibold underline-offset-4 hover:underline"
        >
          <KindMark kind={task.kind} />
          <span className="shrink-0 font-mono text-xs">{task.id}</span>
          <span className="min-w-0 truncate">{task.title}</span>
        </Link>
        <StageChip stage={task.stage} />
        <Link
          href={requestHref(task.requestId)}
          className="inline-flex min-h-11 min-w-0 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          <span className="truncate">{task.requestTitle}</span>
        </Link>
      </div>
      {showSummary && task.summary ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{task.summary}</p>
      ) : null}
    </li>
  )
}

function EventRow({ event }: { event: ActivityEvent }) {
  return (
    <li>
      <article className="flex flex-col gap-1.5 border-2 border-dashed border-muted-foreground/60 bg-muted/40 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Chip className={EVENT_CLASS[event.kind]}>{EVENT_LABELS[event.kind]}</Chip>
          <span className="min-w-0 text-sm font-bold">{event.title || EVENT_LABELS[event.kind]}</span>
          {event.fromBranch || event.toBranch ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              {event.fromBranch ? <Chip className="bg-background">{event.fromBranch}</Chip> : null}
              {event.fromBranch && event.toBranch ? <span aria-label="to">→</span> : null}
              {event.toBranch ? <Chip className="bg-background">{event.toBranch}</Chip> : null}
            </span>
          ) : null}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {timeOf(event.at)}
            {event.person ? ` · ${event.person}` : ""}
          </span>
        </div>
        {event.summary ? <p className="text-sm leading-relaxed">{event.summary}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3">
          <Link
            href={requestHref(event.requestId)}
            className="inline-flex min-h-11 min-w-0 items-center text-xs font-semibold underline underline-offset-4"
          >
            <span className="truncate">{event.requestTitle}</span>
          </Link>
          {event.targets.length > 0 ? (
            <MonoLabel>
              {plural(event.targets.length, "item")}{" "}
              {event.kind === "decision" ? "affected" : "moved"}
            </MonoLabel>
          ) : null}
        </div>
      </article>
    </li>
  )
}

function TimelineFooter({ activity }: { activity: Activity }) {
  if (activity.hiddenDays <= 0) return null
  return (
    <p className="text-sm text-muted-foreground">
      Showing the latest {ACTIVITY_MAX_DAYS} days with activity, back to{" "}
      {formatDay(activity.oldestShownDay, activity.today)}.{" "}
      {plural(activity.hiddenDays, "older day")} not shown.
    </p>
  )
}
