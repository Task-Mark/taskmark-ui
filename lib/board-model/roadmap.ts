import {
  addDays,
  allLeaves,
  daysBetween,
  firstActivityDay,
  forecastRequests,
  isOpenRequest,
  lastShippedDay,
  shippedDay,
  shippedPace,
  toDay,
  type Pace,
} from "./request-forecast"
import type {
  MeetingSummary,
  MeetingTask,
  RequestBoardData,
  RequestDetail,
  RequestLeaf,
} from "./request-types"
import { emptyStageCounts, type Stage, type StageCounts } from "./stage"

/**
 * Roadmap model: one timeline row per request (first activity to shipped day,
 * or to the forecast for open requests), plus the tasks agreed in meetings.
 * Pure data, no React, so the screen and the static export read the same.
 */

/** Shipped requests older than this stay off the timeline (counted only). */
export const ROADMAP_SHIPPED_LOOKBACK_DAYS = 182
/** The axis never reaches further than this from `asOf`, either way. */
export const ROADMAP_MAX_REACH_DAYS = 365
const MIN_AXIS_DAYS = 56

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export type RoadmapSpan = { start: string; end: string }

export type RoadmapMonth = { day: string; label: string }

export type RoadmapAxis = {
  start: string
  end: string
  days: number
  months: RoadmapMonth[]
}

export type RoadmapWorkRow = {
  id: string
  kind: "epic" | "story"
  title: string
  stage: Stage | null
  leafCount: number
  shippedCount: number
  /** Leaves per stage (cancelled and shelved left out). */
  stageCounts: StageCounts
  /** null when no leaf has started yet. */
  span: RoadmapSpan | null
  /** Every leaf reached main: the span ends on the last shipped day. */
  shipped: boolean
  stories: RoadmapWorkRow[]
}

export type RoadmapRequestRow = {
  request: RequestDetail
  state: "open" | "shipped"
  /** First activity (start, done or shipped of any leaf, else created). */
  start: string
  /** Shipped: last day in main. Open: `asOf` (work so far). */
  end: string
  likely: string
  early: string
  late: string
  /** Date set in the brief, if any. */
  committed: string
  remainingPoints: number
  epics: RoadmapWorkRow[]
}

export type RoadmapTaskState = "done" | "cancelled" | "overdue" | "in_progress" | "open"

export type RoadmapMeetingTask = {
  task: MeetingTask
  state: RoadmapTaskState
  /** Linked request, resolved by id or alias. */
  request: RequestDetail | null
}

export type RoadmapMeetingRow = {
  meeting: MeetingSummary
  date: string
  tasks: RoadmapMeetingTask[]
  doneCount: number
  overdueCount: number
}

export type RoadmapModel = {
  asOf: string
  pace: Pace
  axis: RoadmapAxis
  /** Open requests with a size, in forecast order. */
  open: RoadmapRequestRow[]
  /** Shipped requests inside the lookback window, latest first. */
  shipped: RoadmapRequestRow[]
  /** Shipped before the lookback window. */
  shippedEarlierCount: number
  /** Open requests without tasks: no size, no date. */
  incoming: RequestDetail[]
  /** Shelved or cancelled, left off the timeline. */
  closedCount: number
  meetings: RoadmapMeetingRow[]
  taskCounts: Record<RoadmapTaskState, number> & { total: number }
}

export function leafSpan(leaves: RequestLeaf[], asOf: string): RoadmapSpan | null {
  const days = leaves
    .flatMap((l) => [toDay(l.startedAt), toDay(l.completedAt), shippedDay(l)])
    .filter(Boolean)
    .sort()
  if (days.length === 0) return null
  const live = leaves.filter((l) => !isClosedLeaf(l))
  const allShipped = live.length > 0 && live.every((l) => l.stage === "production")
  const lastShipped = live.map(shippedDay).filter(Boolean).sort().at(-1) ?? ""
  const end = allShipped && lastShipped ? lastShipped : maxDay(days.at(-1) ?? asOf, asOf)
  return { start: days[0], end }
}

function isClosedLeaf(leaf: RequestLeaf): boolean {
  const s = leaf.status.toLowerCase()
  return s === "cancelled" || s === "shelved"
}

function workRow(
  kind: "epic" | "story",
  item: { id: string; title: string; stage: Stage | null },
  leaves: RequestLeaf[],
  asOf: string,
  stories: RoadmapWorkRow[] = [],
): RoadmapWorkRow {
  const live = leaves.filter((l) => !isClosedLeaf(l))
  const shippedCount = live.filter((l) => l.stage === "production").length
  const stageCounts = emptyStageCounts()
  for (const l of live) stageCounts[l.stage ?? "none"] += 1
  return {
    id: item.id,
    kind,
    title: item.title,
    stage: item.stage,
    leafCount: live.length,
    shippedCount,
    stageCounts,
    span: leafSpan(leaves, asOf),
    shipped: live.length > 0 && shippedCount === live.length,
    stories,
  }
}

export function requestWorkRows(request: RequestDetail, asOf: string): RoadmapWorkRow[] {
  return request.epics.map((epic) => {
    const stories = epic.stories.map((s) => workRow("story", s, s.leaves, asOf))
    const leaves = [...epic.leaves, ...epic.stories.flatMap((s) => s.leaves)]
    return workRow("epic", epic, leaves, asOf, stories)
  })
}

export function meetingTaskState(task: MeetingTask, asOf: string): RoadmapTaskState {
  if (task.status === "done") return "done"
  if (task.status === "cancelled") return "cancelled"
  if (task.due && task.due.slice(0, 10) < asOf.slice(0, 10)) return "overdue"
  return task.status === "in_progress" ? "in_progress" : "open"
}

export function findRequest(data: RequestBoardData, id: string): RequestDetail | null {
  if (!id) return null
  return (
    data.requests.find((r) => r.id === id) ??
    data.requests.find((r) => r.slug === id || r.aliases.includes(id)) ??
    null
  )
}

function minDay(a: string, b: string): string {
  return a < b ? a : b
}

function maxDay(a: string, b: string): string {
  return a > b ? a : b
}

export function monthTicks(start: string, end: string): RoadmapMonth[] {
  const out: RoadmapMonth[] = []
  let y = Number(start.slice(0, 4))
  let m = Number(start.slice(5, 7))
  // First tick: the 1st of the month after `start` (or `start` if it is the 1st).
  if (start.slice(8, 10) !== "01") {
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  let first = true
  for (;;) {
    const day = `${y}-${String(m).padStart(2, "0")}-01`
    if (day > end) break
    const label = m === 1 || first ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1]
    out.push({ day, label })
    first = false
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/** Axis from the earliest day to the latest, padded, and capped around `asOf`. */
export function roadmapAxis(days: string[], asOf: string): RoadmapAxis {
  const today = toDay(asOf)
  const valid = days.map(toDay).filter(Boolean)
  let lo = valid.reduce(minDay, today)
  let hi = valid.reduce(maxDay, today)
  lo = maxDay(lo, addDays(today, -ROADMAP_MAX_REACH_DAYS))
  hi = minDay(hi, addDays(today, ROADMAP_MAX_REACH_DAYS))
  let start = addDays(lo, -7)
  let end = addDays(hi, 14)
  const short = MIN_AXIS_DAYS - daysBetween(start, end)
  if (short > 0) {
    start = addDays(start, -Math.floor(short / 2))
    end = addDays(end, Math.ceil(short / 2))
  }
  return {
    start,
    end,
    days: daysBetween(start, end),
    months: monthTicks(start, end),
  }
}

/** Position of a day on the axis, 0 to 100, clamped. */
export function axisPercent(axis: RoadmapAxis, day: string): number {
  if (!day || axis.days <= 0) return 0
  const pct = (daysBetween(axis.start, day) / axis.days) * 100
  return Math.min(100, Math.max(0, pct))
}

export function buildRoadmap(data: RequestBoardData): RoadmapModel {
  const asOf = toDay(data.asOf)
  const pace = shippedPace(data)
  const forecasts = forecastRequests(data, pace)

  const open: RoadmapRequestRow[] = []
  const shipped: RoadmapRequestRow[] = []
  const incoming: RequestDetail[] = []
  let shippedEarlierCount = 0
  let closedCount = 0
  const cutoff = addDays(asOf, -ROADMAP_SHIPPED_LOOKBACK_DAYS)

  for (const request of data.requests) {
    const f = forecasts.get(request.id)
    if (isOpenRequest(request)) {
      if (request.leafCount === 0) {
        incoming.push(request)
        continue
      }
      open.push({
        request,
        state: "open",
        start: minDay(firstActivityDay(request) || asOf, asOf),
        end: asOf,
        likely: f?.likely ?? "",
        early: f?.early ?? "",
        late: f?.late ?? "",
        committed: request.forecast,
        remainingPoints: f?.remainingPoints ?? 0,
        epics: requestWorkRows(request, asOf),
      })
      continue
    }
    if (request.status !== "shipped") {
      closedCount += 1
      continue
    }
    const last = lastShippedDay(request) || toDay(request.updated) || asOf
    if (last < cutoff) {
      shippedEarlierCount += 1
      continue
    }
    shipped.push({
      request,
      state: "shipped",
      start: minDay(firstActivityDay(request) || last, last),
      end: last,
      likely: "",
      early: "",
      late: "",
      committed: request.forecast,
      remainingPoints: 0,
      epics: requestWorkRows(request, asOf),
    })
  }

  open.sort(
    (a, b) =>
      (a.likely || "9999").localeCompare(b.likely || "9999") ||
      a.start.localeCompare(b.start) ||
      a.request.title.localeCompare(b.request.title),
  )
  shipped.sort(
    (a, b) => b.end.localeCompare(a.end) || a.request.title.localeCompare(b.request.title),
  )
  incoming.sort(
    (a, b) => toDay(a.created).localeCompare(toDay(b.created)) || a.title.localeCompare(b.title),
  )

  const taskCounts: RoadmapModel["taskCounts"] = {
    total: 0,
    done: 0,
    cancelled: 0,
    overdue: 0,
    in_progress: 0,
    open: 0,
  }
  const meetings: RoadmapMeetingRow[] = data.meetings
    .filter((m) => m.tasks.length > 0)
    .map((meeting) => {
      const tasks = meeting.tasks.map((task) => {
        const state = meetingTaskState(task, asOf)
        taskCounts[state] += 1
        taskCounts.total += 1
        return { task, state, request: findRequest(data, task.request) }
      })
      return {
        meeting,
        date: toDay(meeting.date),
        tasks,
        doneCount: tasks.filter((t) => t.state === "done").length,
        overdueCount: tasks.filter((t) => t.state === "overdue").length,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.meeting.title.localeCompare(b.meeting.title))

  const axisDays: string[] = []
  for (const row of [...open, ...shipped]) {
    axisDays.push(row.start, row.end, row.likely, row.early, row.late, row.committed)
  }
  for (const m of meetings) {
    axisDays.push(m.date, ...m.tasks.map((t) => t.task.due))
  }

  return {
    asOf,
    pace,
    axis: roadmapAxis(axisDays, asOf),
    open,
    shipped,
    shippedEarlierCount,
    incoming,
    closedCount,
    meetings,
    taskCounts,
  }
}

/** Points with at most one decimal, e.g. `7`, `7.5`. */
export function formatPoints(n: number): string {
  return String(Math.round(n * 10) / 10)
}

/** Leaves of a request that are still to do (for labels). */
export function openLeafCount(request: RequestDetail): number {
  return allLeaves(request).filter((l) => l.stage !== "production" && !isClosedLeaf(l)).length
}
