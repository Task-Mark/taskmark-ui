import {
  allLeaves,
  isOpenRequest,
  lastShippedDay,
  type RequestForecast,
} from "./request-forecast"
import type {
  MeetingSummary,
  MeetingTask,
  RequestBoardData,
  RequestDetail,
  RequestLeaf,
  RequestStatus,
} from "./request-types"

/**
 * Pure helpers for the Work hub: list order, default selection, id lookup,
 * request dates and meeting task states.
 */

const STATUS_ORDER: RequestStatus[] = [
  "building",
  "ready",
  "proposed",
  "shipped",
  "shelved",
  "cancelled",
]

/** Open requests first (building, ready, proposed), then closed ones. */
export function orderRequestsForHub(
  requests: RequestDetail[],
  forecasts: Map<string, RequestForecast>
): RequestDetail[] {
  return [...requests].sort((a, b) => {
    const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    if (byStatus !== 0) return byStatus
    const da = forecasts.get(a.id)?.likely || a.forecast || "9999"
    const db = forecasts.get(b.id)?.likely || b.forecast || "9999"
    if (isOpenRequest(a)) return da.localeCompare(db) || a.title.localeCompare(b.title)
    // Closed: most recently shipped or updated first.
    const la = lastShippedDay(a) || a.updated
    const lb = lastShippedDay(b) || b.updated
    return lb.localeCompare(la) || a.title.localeCompare(b.title)
  })
}

/** Newest meeting first. */
export function orderMeetingsForHub(meetings: MeetingSummary[]): MeetingSummary[] {
  return [...meetings].sort(
    (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)
  )
}

/** Match a request reference (id, alias or slug) to a request on the board. */
export function findRequestIn(
  requests: RequestDetail[],
  ref: string
): RequestDetail | null {
  const key = ref.trim()
  if (!key) return null
  const lower = key.toLowerCase()
  return (
    requests.find((r) => r.id === key) ??
    requests.find((r) => r.aliases.includes(key)) ??
    requests.find((r) => r.slug === key) ??
    requests.find(
      (r) =>
        r.id.toLowerCase() === lower ||
        r.slug.toLowerCase() === lower ||
        r.aliases.some((a) => a.toLowerCase() === lower)
    ) ??
    null
  )
}

export function findMeeting(
  meetings: MeetingSummary[],
  ref: string
): MeetingSummary | null {
  const key = ref.trim()
  if (!key) return null
  const lower = key.toLowerCase()
  return (
    meetings.find((m) => m.id === key) ??
    meetings.find((m) => m.id.toLowerCase() === lower) ??
    null
  )
}

export type ResolvedSelection =
  | { kind: "request"; request: RequestDetail }
  | { kind: "meeting"; meeting: MeetingSummary }
  | { kind: "missing"; what: "request" | "meeting"; id: string }
  | { kind: "empty" }

/**
 * Turn the URL selection into a request or meeting. Without one, pick the
 * first open request in hub order (building first), else the first request,
 * else the newest meeting.
 */
export function resolveWorkSelection(
  data: RequestBoardData,
  orderedRequests: RequestDetail[],
  orderedMeetings: MeetingSummary[],
  selection: { kind: "request" | "meeting"; id: string } | null
): ResolvedSelection {
  if (selection) {
    if (selection.kind === "request") {
      const request = findRequestIn(data.requests, selection.id)
      return request
        ? { kind: "request", request }
        : { kind: "missing", what: "request", id: selection.id }
    }
    const meeting = findMeeting(data.meetings, selection.id)
    return meeting
      ? { kind: "meeting", meeting }
      : { kind: "missing", what: "meeting", id: selection.id }
  }
  const first = orderedRequests.find(isOpenRequest) ?? orderedRequests[0]
  if (first) return { kind: "request", request: first }
  if (orderedMeetings[0]) return { kind: "meeting", meeting: orderedMeetings[0] }
  return { kind: "empty" }
}

export type RequestDateLabel = { label: string; title: string } | null

/**
 * Date shown next to a request: the forecast's likely date, else the date in
 * the brief, else (for shipped work) the last day it reached main.
 */
export function requestDateLabel(
  request: RequestDetail,
  forecast: RequestForecast | undefined,
  format: (day: string) => string
): RequestDateLabel {
  if (forecast?.likely) {
    return {
      label: `likely ${format(forecast.likely)}`,
      title: "Forecast from the pace of work shipped to main",
    }
  }
  if (request.forecast) {
    return { label: `due ${format(request.forecast)}`, title: "Date set in the brief" }
  }
  if (request.status === "shipped") {
    const day = lastShippedDay(request)
    if (day) return { label: `shipped ${format(day)}`, title: "Last task reached main" }
  }
  return null
}

export type TreeCounts = { epics: number; stories: number; tasks: number }

export function requestTreeCounts(request: RequestDetail): TreeCounts {
  return {
    epics: request.epics.length,
    stories: request.epics.reduce((n, e) => n + e.stories.length, 0),
    tasks: allLeaves(request).length,
  }
}

export type LeafMark = "done" | "now" | "todo" | "dropped"

const DONE_STATUSES = new Set(["done", "completed", "closed", "resolved"])
const DROPPED_STATUSES = new Set(["cancelled", "canceled", "shelved", "wontfix"])
const NOW_STATUSES = new Set(["in_progress", "in-progress", "doing", "review", "in_review"])

/** Done, being worked on now, still to do, or dropped. */
export function leafMark(leaf: Pick<RequestLeaf, "status" | "stage">): LeafMark {
  const status = leaf.status.trim().toLowerCase()
  if (DROPPED_STATUSES.has(status)) return "dropped"
  if (DONE_STATUSES.has(status) || leaf.stage === "production") return "done"
  if (NOW_STATUSES.has(status) || leaf.stage) return "now"
  return "todo"
}

export function countDone(leaves: RequestLeaf[]): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const leaf of leaves) {
    const mark = leafMark(leaf)
    if (mark === "dropped") continue
    total += 1
    if (mark === "done") done += 1
  }
  return { done, total }
}

export type MeetingTaskState =
  | "production"
  | "done"
  | "testing"
  | "development"
  | "overdue"
  | "open"
  | "cancelled"

/** One state per meeting task, from its status, its board stage and its due date. */
export function meetingTaskState(task: MeetingTask, asOf: string): MeetingTaskState {
  if (task.status === "cancelled") return "cancelled"
  if (task.stage === "production") return "production"
  if (task.status === "done") return "done"
  if (task.stage === "testing") return "testing"
  if (task.status === "in_progress" || task.stage === "development") {
    return task.due && task.due.slice(0, 10) < asOf.slice(0, 10) ? "overdue" : "development"
  }
  if (task.due && task.due.slice(0, 10) < asOf.slice(0, 10)) return "overdue"
  return "open"
}

export function isMeetingTaskClosed(state: MeetingTaskState): boolean {
  return state === "done" || state === "production" || state === "cancelled"
}

export type MeetingTaskTally = Record<MeetingTaskState, number> & {
  /** Tasks that count (cancelled left out). */
  total: number
  /** Done or in production. */
  finished: number
}

export function tallyMeetingTasks(meeting: MeetingSummary, asOf: string): MeetingTaskTally {
  const tally: MeetingTaskTally = {
    production: 0,
    done: 0,
    testing: 0,
    development: 0,
    overdue: 0,
    open: 0,
    cancelled: 0,
    total: 0,
    finished: 0,
  }
  for (const task of meeting.tasks) {
    const state = meetingTaskState(task, asOf)
    tally[state] += 1
    if (state === "cancelled") continue
    tally.total += 1
    if (state === "done" || state === "production") tally.finished += 1
  }
  return tally
}

/** Relation a meeting has with a request, or "" when it does not touch it. */
export function meetingRelationTo(
  meeting: MeetingSummary,
  request: RequestDetail,
  requests: RequestDetail[]
): string {
  for (const link of meeting.requests) {
    if (findRequestIn(requests, link.request)?.id === request.id) return link.relation
  }
  const touches =
    meeting.decisions.some((d) => findRequestIn(requests, d.request)?.id === request.id) ||
    meeting.tasks.some((t) => findRequestIn(requests, t.request)?.id === request.id)
  return touches ? "discussed" : ""
}
