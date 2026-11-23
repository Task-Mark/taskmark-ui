import type * as React from "react"
import Link from "next/link"

import { cn } from "../../lib/utils"
import { boardViewHref } from "../../lib/board-model/request-nav"
import { PACE_WEEKS, daysBetween } from "../../lib/board-model/request-forecast"
import type { RequestBoardData, RequestDetail } from "../../lib/board-model/request-types"
import type { Stage, StageCounts } from "../../lib/board-model/stage"
import {
  axisPercent,
  buildRoadmap,
  formatPoints,
  type RoadmapAxis,
  type RoadmapMeetingRow,
  type RoadmapMeetingTask,
  type RoadmapModel,
  type RoadmapRequestRow,
  type RoadmapTaskState,
  type RoadmapWorkRow,
} from "../../lib/board-model/roadmap"
import {
  Chip,
  EmptyNote,
  KindMark,
  MonoLabel,
  Panel,
  PanelHeader,
  PersonBadge,
  RequestStatusChip,
  ScreenHeader,
  STAGE_FILL,
  StageChip,
  formatDay,
  plural,
} from "./request-ui"
import {
  ROADMAP_LABEL_CELL,
  ROADMAP_MIN_WIDTH,
  ROADMAP_ROW_GRID,
  ROADMAP_TRACK_OFFSET,
} from "./roadmap-layout"
import { RoadmapRowGroup } from "./roadmap-row-group"

export type RoadmapPanelProps = {
  data: RequestBoardData
  projectName: string
}

const TASK_STATE_LABELS: Record<RoadmapTaskState, string> = {
  done: "Done",
  cancelled: "Cancelled",
  overdue: "Overdue",
  in_progress: "In progress",
  open: "Open",
}

const TASK_STATE_CLASS: Record<RoadmapTaskState, string> = {
  done: "bg-chart-4 text-black",
  cancelled: "bg-muted text-muted-foreground line-through",
  overdue: "bg-destructive text-black",
  in_progress: "bg-chart-3 text-black",
  open: "bg-muted text-foreground",
}

function requestHref(id: string): string {
  return boardViewHref({ view: "request", request: id, hasRequestBoard: true })
}

export function RoadmapPanel({ data, projectName }: RoadmapPanelProps) {
  const model = buildRoadmap(data)
  const { axis, asOf } = model
  const hasTimeline = model.open.length > 0 || model.shipped.length > 0 || model.meetings.length > 0

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        eyebrow={`${projectName} · ${formatDay(axis.start, asOf)} to ${formatDay(axis.end, asOf)}`}
        title="Roadmap"
        description="Requests and the tasks agreed in meetings, on one timeline. Progress comes from the branches: develop, then quality, then main. Work only counts as shipped once it is in main."
      />

      <RoadmapStats model={model} />

      <Panel>
        <PanelHeader
          title="Timeline"
          hint={
            model.pace.pointsPerWeek > 0
              ? `Pace ${formatPoints(model.pace.pointsPerWeek)} points/week from main`
              : "No pace yet"
          }
        />
        <div className="flex flex-col gap-3 p-4">
          <RoadmapLegend />
          <PaceNote model={model} />
          {hasTimeline ? (
            <>
              <p className="text-xs text-muted-foreground md:hidden">
                Scroll the chart sideways to see the whole timeline.
              </p>
              <Timeline model={model} />
              <RoadmapTables model={model} />
            </>
          ) : (
            <EmptyNote>
              Nothing to place on the timeline yet. Requests show up here once they have tasks, and
              meeting tasks once a meeting is written down.
            </EmptyNote>
          )}
        </div>
      </Panel>

      <IncomingPanel model={model} />
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Stats                                                                     */
/* ------------------------------------------------------------------------ */

function StatTile({
  label,
  value,
  detail,
  alert,
}: {
  label: string
  value: React.ReactNode
  detail: React.ReactNode
  alert?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 border-2 border-black bg-card p-4",
        alert
          ? "shadow-[4px_4px_0_0_var(--destructive)]"
          : "shadow-[4px_4px_0_0_var(--shadow-color)]",
      )}
    >
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-head text-2xl leading-tight break-words sm:text-[28px]",
          alert && "text-destructive",
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  )
}

function RoadmapStats({ model }: { model: RoadmapModel }) {
  const { asOf } = model
  const open = [...model.open.map((r) => r.request), ...model.incoming]
  const byStatus = (s: string) => open.filter((r) => r.status === s).length
  const building = byStatus("building")
  const others = [
    byStatus("ready") ? `${byStatus("ready")} ready` : "",
    byStatus("proposed") ? `${byStatus("proposed")} proposed` : "",
    model.shipped.length ? `${model.shipped.length} shipped recently` : "",
  ].filter(Boolean)

  const t = model.taskCounts
  const taskDetail = [
    t.in_progress ? `${t.in_progress} in progress` : "",
    t.open ? `${t.open} open` : "",
    t.cancelled ? `${t.cancelled} cancelled` : "",
  ].filter(Boolean)

  const next = model.open.find((r) => r.likely)
  const overdue = model.meetings.flatMap((m) => m.tasks.filter((x) => x.state === "overdue"))

  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Requests"
        value={`${building} building`}
        detail={others.length ? others.join(" · ") : "Nothing else open"}
      />
      <StatTile
        label="Tasks from meetings"
        value={t.total ? `${t.done} of ${t.total} done` : "None yet"}
        detail={
          taskDetail.length ? taskDetail.join(" · ") : t.total ? "All closed" : "No meeting tasks"
        }
      />
      <StatTile
        label="Next date"
        value={next ? formatDay(next.likely, asOf) : "No date"}
        detail={
          next
            ? `${next.request.title}${next.late && next.late !== next.likely ? `, as late as ${formatDay(next.late, asOf)}` : ""}`
            : model.open.length
              ? "Needs work reaching main to set a pace"
              : "No sized request open"
        }
      />
      <StatTile
        label="Overdue"
        value={overdue.length ? plural(overdue.length, "task") : "None"}
        detail={
          overdue.length
            ? overdue
                .slice(0, 2)
                .map((o) => (o.task.owner ? `${o.task.title}, ${o.task.owner}` : o.task.title))
                .join("; ")
            : "Every meeting task with a due date is on time"
        }
        alert={overdue.length > 0}
      />
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Legend and pace                                                           */
/* ------------------------------------------------------------------------ */

function LegendItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      {swatch}
      {children}
    </li>
  )
}

function RoadmapLegend() {
  const box = "inline-block h-3 w-4 border-2 border-black"
  return (
    <ul
      aria-label="Legend"
      className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
    >
      <LegendItem swatch={<span className={cn(box, STAGE_FILL.production)} />}>
        In main (shipped)
      </LegendItem>
      <LegendItem swatch={<span className={cn(box, STAGE_FILL.testing)} />}>
        In testing (quality)
      </LegendItem>
      <LegendItem swatch={<span className={cn(box, STAGE_FILL.development)} />}>
        In development
      </LegendItem>
      <LegendItem swatch={<span className={cn(box, STAGE_FILL.none)} />}>No commits yet</LegendItem>
      <LegendItem
        swatch={
          <span className="inline-block h-3 w-4 border-2 border-dashed border-primary bg-accent" />
        }
      >
        Forecast to likely date
      </LegendItem>
      <LegendItem
        swatch={<span className="inline-block h-3 w-4 border-2 border-dashed border-chart-2" />}
      >
        Early to late range
      </LegendItem>
      <LegendItem swatch={<span className="inline-block h-3.5 w-1 bg-foreground" />}>
        Committed date
      </LegendItem>
      <LegendItem
        swatch={<span className="inline-block h-3.5 w-0 border-l-2 border-dashed border-chart-3" />}
      >
        Today
      </LegendItem>
      <LegendItem
        swatch={
          <span className="inline-block size-2.5 rotate-45 border-2 border-black bg-chart-2" />
        }
      >
        Meeting
      </LegendItem>
      <LegendItem swatch={<span className={cn(box, "bg-destructive")} />}>Overdue</LegendItem>
    </ul>
  )
}

function PaceNote({ model }: { model: RoadmapModel }) {
  const { pace } = model
  if (pace.pointsPerWeek <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No points reached main in the last {PACE_WEEKS} full weeks, so open requests have no
        forecast date yet. Their bars show the work so far.
      </p>
    )
  }
  const range =
    pace.slowPointsPerWeek !== pace.fastPointsPerWeek
      ? ` (slow weeks ${formatPoints(pace.slowPointsPerWeek)}, fast weeks ${formatPoints(pace.fastPointsPerWeek)})`
      : ""
  return (
    <p className="text-sm text-muted-foreground">
      Dates use{" "}
      <strong className="font-semibold text-foreground">
        {formatPoints(pace.pointsPerWeek)} points per week
      </strong>
      , the median of what reached main in the last {PACE_WEEKS} full weeks
      {range}. Open requests queue up: building first, then ready, then proposed.
    </p>
  )
}

/* ------------------------------------------------------------------------ */
/* Timeline                                                                  */
/* ------------------------------------------------------------------------ */

function pos(axis: RoadmapAxis, day: string): number {
  return axisPercent(axis, day)
}

/** Absolute bar between two days on the track. */
function Span({
  axis,
  from,
  to,
  className,
  children,
  title,
}: {
  axis: RoadmapAxis
  from: string
  to: string
  className?: string
  children?: React.ReactNode
  title?: string
}) {
  const a = pos(axis, from)
  const b = Math.max(a, pos(axis, to))
  return (
    <span
      title={title}
      className={cn("absolute box-border min-w-1.5", className)}
      style={{ left: `${a}%`, width: `${b - a}%` }}
    >
      {children}
    </span>
  )
}

/** Dashed line at `asOf`, drawn inside each track under its bars. */
function TodayLine({ axis, asOf }: { axis: RoadmapAxis; asOf: string }) {
  return (
    <span
      className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-chart-3"
      style={{ left: `${pos(axis, asOf)}%` }}
    />
  )
}

/** Small mono label under a bar, kept inside the track. */
function TrackLabel({
  axis,
  from,
  to,
  className,
  children,
}: {
  axis: RoadmapAxis
  from: string
  to: string
  className?: string
  children: React.ReactNode
}) {
  const a = pos(axis, from)
  const b = Math.max(a, pos(axis, to))
  const style: React.CSSProperties = a <= 62 ? { left: `${a}%` } : { right: `${100 - b}%` }
  return (
    <span
      className={cn(
        "absolute z-[3] bg-background/85 font-mono text-[11px] whitespace-nowrap text-muted-foreground",
        a <= 62 ? "pl-0.5" : "pr-0.5 text-right",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  )
}

function Timeline({ model }: { model: RoadmapModel }) {
  const { axis, asOf } = model
  const today = pos(axis, asOf)
  return (
    <div className="max-w-full overflow-x-auto border-2 border-black bg-background">
      <div className={cn("relative", ROADMAP_MIN_WIDTH)}>
        {/* Month lines, drawn once behind every row. */}
        <div
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-y-0 right-0", ROADMAP_TRACK_OFFSET)}
        >
          {axis.months.map((m) => (
            <span
              key={m.day}
              className="absolute inset-y-0 border-l border-muted-foreground/20"
              style={{ left: `${pos(axis, m.day)}%` }}
            />
          ))}
        </div>

        {/* Axis header */}
        <div className={cn(ROADMAP_ROW_GRID, "border-b-2 border-black bg-muted")}>
          <div className={cn(ROADMAP_LABEL_CELL, "items-center bg-muted px-3 py-2.5 md:px-4")}>
            <MonoLabel>Work</MonoLabel>
          </div>
          <div className="relative h-10" aria-hidden="true">
            <TodayLine axis={axis} asOf={asOf} />
            {axis.months.map((m) => (
              <span
                key={m.day}
                className="absolute top-3 border-l border-muted-foreground/40 pl-1.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground"
                style={{ left: `${pos(axis, m.day)}%` }}
              >
                {m.label}
              </span>
            ))}
            <span
              className="absolute top-1.5 z-[3] -translate-x-1/2 border-2 border-black bg-chart-3 px-1.5 py-px font-mono text-[10px] font-semibold text-black"
              style={{ left: `${Math.min(96, Math.max(4, today))}%` }}
              title={`Data read on ${formatDay(asOf, asOf)}`}
            >
              TODAY
            </span>
          </div>
        </div>

        {model.open.length > 0 ? (
          <>
            <GroupHeader chip="Requests" chipClass="bg-chart-2 text-black">
              {plural(model.open.length, "request")} in flight, by likely date
            </GroupHeader>
            {model.open.map((row) => (
              <RequestRow key={row.request.id} row={row} axis={axis} asOf={asOf} />
            ))}
          </>
        ) : null}

        {model.shipped.length > 0 || model.shippedEarlierCount > 0 ? (
          <GroupHeader chip="Shipped" chipClass="bg-chart-4 text-black">
            In main in the last 6 months
            {model.shippedEarlierCount > 0 ? (
              <>
                {", "}
                <Link
                  href={boardViewHref({
                    view: "requests",
                    hasRequestBoard: true,
                  })}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {model.shippedEarlierCount} earlier in Requests
                </Link>
              </>
            ) : null}
          </GroupHeader>
        ) : null}
        {model.shipped.map((row) => (
          <RequestRow key={row.request.id} row={row} axis={axis} asOf={asOf} />
        ))}

        {model.meetings.length > 0 ? (
          <>
            <GroupHeader chip="From meetings" chipClass="bg-primary text-primary-foreground">
              Tasks agreed with the client, at their due date
            </GroupHeader>
            {model.meetings.map((m) => (
              <MeetingRow key={m.meeting.id} row={m} axis={axis} asOf={asOf} />
            ))}
          </>
        ) : null}
      </div>
    </div>
  )
}

function GroupHeader({
  chip,
  chipClass,
  children,
}: {
  chip: string
  chipClass: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(ROADMAP_ROW_GRID, "border-y-2 border-black bg-card first:border-t-0")}>
      <div className="sticky left-0 z-10 col-span-2 flex w-fit max-w-[100vw] flex-wrap items-center gap-2 px-3 py-2 md:px-4">
        <Chip className={cn("uppercase", chipClass)}>{chip}</Chip>
        <span className="text-xs text-muted-foreground">{children}</span>
      </div>
    </div>
  )
}

/* Requests ---------------------------------------------------------------- */

function StageSegments({ counts }: { counts: StageCounts }) {
  const order: (Stage | "none")[] = ["production", "testing", "development", "none"]
  const total = order.reduce((s, k) => s + counts[k], 0)
  if (total === 0) return <span className={cn("block h-full", STAGE_FILL.none)} />
  return (
    <span className="flex h-full overflow-hidden">
      {order.map((k) =>
        counts[k] > 0 ? (
          <span
            key={k}
            className={cn("h-full", STAGE_FILL[k])}
            style={{ width: `${(counts[k] / total) * 100}%` }}
          />
        ) : null,
      )}
    </span>
  )
}

function CommittedMark({ axis, day, late }: { axis: RoadmapAxis; day: string; late: boolean }) {
  return (
    <span
      className={cn(
        "absolute top-1.5 z-[3] h-8 w-1 -translate-x-1/2 border border-black",
        late ? "bg-destructive" : "bg-foreground",
      )}
      style={{ left: `${pos(axis, day)}%` }}
    />
  )
}

function requestTrackLabel(row: RoadmapRequestRow, asOf: string): string {
  if (row.state === "shipped") {
    const base = `In main ${formatDay(row.end, asOf)}`
    if (!row.committed) return base
    return row.committed >= row.end
      ? `${base}, committed ${formatDay(row.committed, asOf)}`
      : `${base}, ${plural(daysBetween(row.committed, row.end), "day")} after ${formatDay(row.committed, asOf)}`
  }
  if (!row.likely) return "No pace yet, so no date"
  const range =
    row.early && row.late && row.early !== row.late
      ? ` (${formatDay(row.early, asOf)} to ${formatDay(row.late, asOf)})`
      : ""
  return `Likely ${formatDay(row.likely, asOf)}${range}`
}

function RequestTrack({
  row,
  axis,
  asOf,
}: {
  row: RoadmapRequestRow
  axis: RoadmapAxis
  asOf: string
}) {
  const r = row.request
  const lateVsCommitted =
    !!row.committed &&
    (row.state === "shipped" ? row.end > row.committed : !!row.likely && row.likely > row.committed)
  const lastDay = row.state === "shipped" ? row.end : row.late || row.likely || asOf
  return (
    <div className="relative h-full min-h-[60px]">
      <TodayLine axis={axis} asOf={asOf} />
      {row.state === "open" && row.early && row.late ? (
        <Span
          axis={axis}
          from={row.early}
          to={row.late}
          className="top-2 h-7 border-2 border-dashed border-chart-2 bg-chart-2/10"
        />
      ) : null}
      {row.state === "open" && row.likely && row.likely > asOf ? (
        <Span
          axis={axis}
          from={asOf}
          to={row.likely}
          className="top-3 z-[1] h-5 border-2 border-dashed border-primary bg-accent"
        />
      ) : null}
      <Span
        axis={axis}
        from={row.start}
        to={row.end}
        className="top-3 z-[1] h-5 border-2 border-black shadow-[2px_2px_0_0_var(--shadow-color)]"
      >
        {row.state === "shipped" ? (
          <span className={cn("block h-full", STAGE_FILL.production)} />
        ) : (
          <StageSegments counts={r.stageCounts} />
        )}
      </Span>
      {row.committed ? (
        <CommittedMark axis={axis} day={row.committed} late={lateVsCommitted} />
      ) : null}
      <TrackLabel axis={axis} from={row.start} to={lastDay} className="top-[38px]">
        {requestTrackLabel(row, asOf)}
      </TrackLabel>
    </div>
  )
}

function RequestLabel({ row, asOf }: { row: RoadmapRequestRow; asOf: string }) {
  const r = row.request
  const meta =
    row.state === "shipped"
      ? `${plural(r.leafCount, "task")} · ${formatPoints(r.shippedPoints)} points`
      : `${r.shippedLeafCount} of ${plural(r.leafCount, "task")} in main · ${formatPoints(row.remainingPoints)} ${row.remainingPoints === 1 ? "point" : "points"} left`
  return (
    <>
      <span className="flex flex-wrap items-center gap-1.5">
        <RequestStatusChip status={r.status} className="text-[10px]" />
        {row.committed ? (
          <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
            committed {formatDay(row.committed, asOf)}
          </span>
        ) : null}
      </span>
      <Link
        href={requestHref(r.id)}
        className="line-clamp-2 text-sm leading-snug font-bold hover:underline hover:underline-offset-2"
      >
        {r.title}
      </Link>
      <span className="truncate text-[11px] text-muted-foreground">{meta}</span>
    </>
  )
}

function RequestRow({
  row,
  axis,
  asOf,
}: {
  row: RoadmapRequestRow
  axis: RoadmapAxis
  asOf: string
}) {
  const label = <RequestLabel row={row} asOf={asOf} />
  const track = <RequestTrack row={row} axis={axis} asOf={asOf} />
  if (row.epics.length === 0) {
    return (
      <div className={cn(ROADMAP_ROW_GRID, "border-b border-border/40 dark:border-white/10")}>
        <div
          className={cn(
            ROADMAP_LABEL_CELL,
            "flex-col justify-center gap-1 py-2 pr-3 pl-9 md:pl-10",
          )}
        >
          {label}
        </div>
        <div className="relative" aria-hidden="true">
          {track}
        </div>
      </div>
    )
  }
  return (
    <RoadmapRowGroup
      label={label}
      track={track}
      toggleLabel={`${plural(row.epics.length, "epic")} of ${row.request.title}`}
      className="border-b border-border/40 dark:border-white/10"
    >
      {row.epics.map((epic) => (
        <WorkRows key={epic.id} row={epic} axis={axis} asOf={asOf} />
      ))}
    </RoadmapRowGroup>
  )
}

function WorkRows({ row, axis, asOf }: { row: RoadmapWorkRow; axis: RoadmapAxis; asOf: string }) {
  const isEpic = row.kind === "epic"
  const progress = row.leafCount
    ? `${row.shippedCount} of ${plural(row.leafCount, "task")} in main`
    : "No tasks"
  return (
    <>
      <div
        className={cn(
          ROADMAP_ROW_GRID,
          "border-b border-border/40 bg-muted/30 dark:border-white/5",
        )}
      >
        <div
          className={cn(
            ROADMAP_LABEL_CELL,
            "items-center gap-2 py-1.5 pr-3",
            isEpic ? "pl-9 md:pl-10" : "pl-12 md:pl-16",
          )}
        >
          <KindMark kind={row.kind} className={isEpic ? undefined : "size-4 text-[9px]"} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                "truncate leading-snug",
                isEpic ? "text-[13px] font-semibold" : "text-xs",
              )}
            >
              {row.title}
            </span>
            <span className="flex items-center gap-1.5">
              {row.stage || row.stageCounts.none === row.leafCount ? (
                <StageChip
                  stage={row.stage}
                  className="hidden px-1 py-0 text-[10px] leading-3.5 md:inline-flex"
                />
              ) : null}
              <span className="truncate text-[11px] text-muted-foreground">{progress}</span>
            </span>
          </span>
        </div>
        <div className="relative min-h-10" aria-hidden="true">
          <TodayLine axis={axis} asOf={asOf} />
          {row.span ? (
            <Span
              axis={axis}
              from={row.span.start}
              to={row.span.end}
              className={cn(
                "top-1/2 z-[1] -translate-y-1/2 border-2 border-black",
                isEpic ? "h-3.5" : "h-2.5",
              )}
              title={`${formatDay(row.span.start, asOf)} to ${formatDay(row.span.end, asOf)}`}
            >
              <StageSegments counts={row.stageCounts} />
            </Span>
          ) : (
            <span
              className="absolute top-1/2 -translate-y-1/2 pl-2 font-mono text-[11px] text-muted-foreground italic"
              style={{ left: `${pos(axis, asOf)}%` }}
            >
              not started
            </span>
          )}
        </div>
      </div>
      {row.stories.map((story) => (
        <WorkRows key={story.id} row={story} axis={axis} asOf={asOf} />
      ))}
    </>
  )
}

/* Meetings ---------------------------------------------------------------- */

function taskTrackLabel(t: RoadmapMeetingTask, asOf: string): string {
  const due = t.task.due ? formatDay(t.task.due, asOf) : ""
  switch (t.state) {
    case "done":
      return due ? `Done, was due ${due}` : "Done"
    case "cancelled":
      return "Cancelled"
    case "overdue":
      return `Overdue since ${due}`
    case "in_progress":
      return due ? `In progress, due ${due}` : "In progress, no due date"
    default:
      return due ? `Due ${due}` : "No due date"
  }
}

function TaskTrack({
  t,
  meetingDay,
  axis,
  asOf,
}: {
  t: RoadmapMeetingTask
  meetingDay: string
  axis: RoadmapAxis
  asOf: string
}) {
  const due = t.task.due ? t.task.due.slice(0, 10) : ""
  const anchor = due || meetingDay
  let mark: React.ReactNode = null
  let from = anchor
  let to = anchor
  if (t.state === "done" || t.state === "cancelled") {
    mark = (
      <span
        className={cn(
          "absolute top-3 z-[1] size-3.5 -translate-x-1/2 border-2 border-black",
          t.state === "done" ? "bg-chart-4" : "bg-muted",
        )}
        style={{ left: `${pos(axis, anchor)}%` }}
      />
    )
  } else if (t.state === "overdue") {
    from = due
    to = asOf
    mark = (
      <Span
        axis={axis}
        from={due}
        to={asOf}
        className="top-2.5 z-[1] h-4 border-2 border-black bg-destructive"
      />
    )
  } else if (t.state === "in_progress") {
    from = meetingDay
    to = due || asOf
    mark = (
      <Span
        axis={axis}
        from={meetingDay}
        to={to}
        className={cn(
          "top-2.5 z-[1] h-4 border-2 border-black",
          t.task.stage ? STAGE_FILL[t.task.stage] : "bg-chart-3",
        )}
      />
    )
  } else if (due) {
    from = meetingDay
    to = due
    mark = (
      <Span
        axis={axis}
        from={meetingDay}
        to={due}
        className="top-3 z-[1] h-3 border-2 border-dashed border-muted-foreground"
      />
    )
  }
  return (
    <div className="relative h-full min-h-[52px]">
      <TodayLine axis={axis} asOf={asOf} />
      {mark}
      <TrackLabel axis={axis} from={from} to={to} className="top-[30px]">
        {taskTrackLabel(t, asOf)}
      </TrackLabel>
    </div>
  )
}

function MeetingRow({
  row,
  axis,
  asOf,
}: {
  row: RoadmapMeetingRow
  axis: RoadmapAxis
  asOf: string
}) {
  const m = row.meeting
  const label = (
    <>
      <span className="line-clamp-2 text-sm leading-snug font-bold">{m.title}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>
          {formatDay(row.date, asOf)} · {row.doneCount} of {plural(row.tasks.length, "task")} done
        </span>
        {row.overdueCount > 0 ? (
          <Chip className="bg-destructive px-1 py-0 text-[10px] text-black">
            {row.overdueCount} late
          </Chip>
        ) : null}
      </span>
    </>
  )
  const track = (
    <div className="relative h-full min-h-12">
      <TodayLine axis={axis} asOf={asOf} />
      <span
        className="absolute top-1/2 z-[1] size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-black bg-chart-2"
        style={{ left: `${pos(axis, row.date)}%` }}
        title={`${m.title}, ${formatDay(row.date, asOf)}`}
      />
    </div>
  )
  return (
    <RoadmapRowGroup
      label={label}
      track={track}
      toggleLabel={`${plural(row.tasks.length, "task")} from ${m.title}`}
      defaultOpen
      className="border-b border-border/40 bg-muted/20 dark:border-white/10"
    >
      {row.tasks.map((t) => (
        <div
          key={t.task.id}
          className={cn(ROADMAP_ROW_GRID, "border-b border-border/40 dark:border-white/5")}
        >
          <div className={cn(ROADMAP_LABEL_CELL, "items-center gap-2 py-2 pr-3 pl-9 md:pl-10")}>
            <PersonBadge name={t.task.owner || "?"} className="size-6 text-[9px]" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "line-clamp-2 text-[13px] leading-snug",
                  (t.state === "done" || t.state === "cancelled") && "text-muted-foreground",
                  t.state === "cancelled" && "line-through",
                )}
              >
                {t.task.title}
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
                <Chip className={cn("px-1 py-0 text-[10px]", TASK_STATE_CLASS[t.state])}>
                  {TASK_STATE_LABELS[t.state]}
                </Chip>
                {t.task.stage ? (
                  <StageChip
                    stage={t.task.stage}
                    className="hidden px-1 py-0 text-[10px] md:inline-flex"
                  />
                ) : null}
                {t.request ? (
                  <Link
                    href={requestHref(t.request.id)}
                    className="truncate font-medium text-foreground underline decoration-primary decoration-2 underline-offset-2 hover:decoration-foreground"
                  >
                    {t.request.title}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Meeting only</span>
                )}
              </span>
            </span>
          </div>
          <div className="relative" aria-hidden="true">
            <TaskTrack t={t} meetingDay={row.date} axis={axis} asOf={asOf} />
          </div>
        </div>
      ))}
    </RoadmapRowGroup>
  )
}

/* ------------------------------------------------------------------------ */
/* Text alternative                                                          */
/* ------------------------------------------------------------------------ */

function RoadmapTables({ model }: { model: RoadmapModel }) {
  const { asOf } = model
  const rows = [...model.open, ...model.shipped]
  return (
    <div className="sr-only">
      {rows.length > 0 ? (
        <table>
          <caption>Requests on the timeline</caption>
          <thead>
            <tr>
              <th scope="col">Request</th>
              <th scope="col">Status</th>
              <th scope="col">First activity</th>
              <th scope="col">Shipped or likely date</th>
              <th scope="col">Range</th>
              <th scope="col">Committed date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.request.id}>
                <th scope="row">{row.request.title}</th>
                <td>{row.request.status}</td>
                <td>{formatDay(row.start, asOf)}</td>
                <td>
                  {row.state === "shipped"
                    ? `In main ${formatDay(row.end, asOf)}`
                    : row.likely
                      ? `Likely ${formatDay(row.likely, asOf)}`
                      : "No date yet"}
                </td>
                <td>
                  {row.early && row.late
                    ? `${formatDay(row.early, asOf)} to ${formatDay(row.late, asOf)}`
                    : "None"}
                </td>
                <td>{row.committed ? formatDay(row.committed, asOf) : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {model.meetings.length > 0 ? (
        <table>
          <caption>Tasks from meetings</caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Meeting</th>
              <th scope="col">Owner</th>
              <th scope="col">Due</th>
              <th scope="col">Request</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {model.meetings.flatMap((m) =>
              m.tasks.map((t) => (
                <tr key={`${m.meeting.id}-${t.task.id}`}>
                  <th scope="row">{t.task.title}</th>
                  <td>{m.meeting.title}</td>
                  <td>{t.task.owner || "Nobody"}</td>
                  <td>{t.task.due ? formatDay(t.task.due, asOf) : "None"}</td>
                  <td>{t.request ? t.request.title : "Meeting only"}</td>
                  <td>{TASK_STATE_LABELS[t.state]}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Incoming                                                                  */
/* ------------------------------------------------------------------------ */

function IncomingRow({ request, asOf }: { request: RequestDetail; asOf: string }) {
  const askedBy = request.requestedBy.map((p) => p.name).filter(Boolean)
  const openQuestions = request.openQuestions.filter((q) => !q.checked).length
  const meta = [
    askedBy.length ? `Asked by ${askedBy.join(", ")}` : "",
    request.created ? `since ${formatDay(request.created, asOf)}` : "",
    openQuestions ? plural(openQuestions, "open question") : "",
  ].filter(Boolean)
  return (
    <li className="flex flex-col gap-1.5 border-b border-border/40 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-white/10">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <RequestStatusChip status={request.status} className="text-[10px]" />
          <Link
            href={requestHref(request.id)}
            className="text-sm font-bold hover:underline hover:underline-offset-2"
          >
            {request.title}
          </Link>
        </span>
        {request.goal ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">{request.goal}</span>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {meta.length ? meta.join(" · ") : "No tasks yet"}
      </span>
    </li>
  )
}

function IncomingPanel({ model }: { model: RoadmapModel }) {
  if (model.incoming.length === 0 && model.closedCount === 0) return null
  return (
    <Panel>
      <PanelHeader title="Incoming, not sized" hint={plural(model.incoming.length, "request")} />
      {model.incoming.length > 0 ? (
        <>
          <p className="px-4 pt-3 text-sm text-muted-foreground">
            No tasks yet, so no size and no date. They join the timeline once they are broken into
            tasks.
          </p>
          <ul className="mt-2 border-t-2 border-black">
            {model.incoming.map((r) => (
              <IncomingRow key={r.id} request={r} asOf={model.asOf} />
            ))}
          </ul>
        </>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">Every open request has tasks.</p>
      )}
      {model.closedCount > 0 ? (
        <p className="border-t-2 border-black px-4 py-2 text-xs text-muted-foreground">
          {plural(model.closedCount, "shelved or cancelled request")} left off the roadmap.
        </p>
      ) : null}
    </Panel>
  )
}
