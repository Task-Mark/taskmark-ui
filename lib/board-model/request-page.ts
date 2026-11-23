import {
  allLeaves,
  daysBetween,
  lastShippedDay,
  type RequestForecast,
} from "./request-forecast"
import type {
  MeetingSummary,
  RequestBoardData,
  RequestDetail,
  RequestLeaf,
  RequestStatus,
} from "./request-types"
import { emptyStageCounts, type StageCounts } from "./stage"

/**
 * Pure helpers for the Requests list and the Request page: finding a request
 * by any of its references, the meetings and requests around it, and small
 * rollups over its tree.
 */

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** True when `ref` is the request's id, one of its aliases or its slug. */
export function matchesRequestRef(
  request: Pick<RequestDetail, "id" | "slug" | "aliases">,
  ref: string
): boolean {
  const r = norm(ref)
  if (!r) return false
  if (norm(request.id) === r || norm(request.slug) === r) return true
  return request.aliases.some((a) => norm(a) === r)
}

export function findRequest(
  data: Pick<RequestBoardData, "requests">,
  ref: string
): RequestDetail | null {
  if (!ref.trim()) return null
  return data.requests.find((r) => matchesRequestRef(r, ref)) ?? null
}

export type RelatedMeeting = {
  meeting: MeetingSummary
  /** How the meeting relates (created, changed, discussed...), "" when only listed as a source. */
  relations: string[]
  /** The request was started from this meeting (`sourceMeetings`). */
  isSource: boolean
  decisions: string[]
  openTaskCount: number
  taskCount: number
}

/**
 * Meetings that reference the request in `requests`, decisions or tasks,
 * plus the ones listed in its `sourceMeetings`. Newest first.
 */
export function relatedMeetings(
  data: Pick<RequestBoardData, "meetings">,
  request: RequestDetail
): RelatedMeeting[] {
  const sources = new Set(request.sourceMeetings.map(norm))
  const out: RelatedMeeting[] = []
  for (const meeting of data.meetings) {
    const relations = meeting.requests
      .filter((l) => matchesRequestRef(request, l.request))
      .map((l) => l.relation)
      .filter(Boolean)
    const decisions = meeting.decisions
      .filter((d) => matchesRequestRef(request, d.request))
      .map((d) => d.text)
    const tasks = meeting.tasks.filter((t) => matchesRequestRef(request, t.request))
    const isSource = sources.has(norm(meeting.id))
    const linked =
      isSource ||
      relations.length > 0 ||
      decisions.length > 0 ||
      tasks.length > 0 ||
      meeting.requests.some((l) => matchesRequestRef(request, l.request))
    if (!linked) continue
    out.push({
      meeting,
      relations: Array.from(new Set(relations)),
      isSource,
      decisions,
      taskCount: tasks.length,
      openTaskCount: tasks.filter(
        (t) => t.status === "open" || t.status === "in_progress"
      ).length,
    })
  }
  return out.sort((a, b) => b.meeting.date.localeCompare(a.meeting.date))
}

/** Source meeting ids that do not match any meeting on the board. */
export function missingSourceMeetings(
  data: Pick<RequestBoardData, "meetings">,
  request: RequestDetail
): string[] {
  const known = new Set(data.meetings.map((m) => norm(m.id)))
  return request.sourceMeetings.filter((id) => !known.has(norm(id)))
}

export type LinkedRequest = {
  /** Relation as written on the side that declared it. */
  relation: string
  /** "out": this request declared the link; "in": the other one did. */
  direction: "out" | "in"
  /** Reference as written (shown when the request is not found). */
  ref: string
  request: RequestDetail | null
}

/** "Waits for X" and "Blocked by X" say the same thing. */
function sameMeaning(label: string): string {
  return label === "Waits for" ? "Blocked by" : label
}

/** Links declared by this request, then links other requests declare to it. */
export function linkedRequests(
  data: Pick<RequestBoardData, "requests">,
  request: RequestDetail
): LinkedRequest[] {
  const out: LinkedRequest[] = request.links.map((link) => ({
    relation: link.relation,
    direction: "out",
    ref: link.request,
    request: findRequest(data, link.request),
  }))
  // A pair often declares both sides (blocks / waits-for): keep one.
  const seen = new Set(
    out.map((l) => `${l.request?.id ?? norm(l.ref)}|${sameMeaning(relationLabel(l.relation, "out"))}`)
  )
  for (const other of data.requests) {
    if (other.id === request.id) continue
    for (const link of other.links) {
      if (!matchesRequestRef(request, link.request)) continue
      const key = `${other.id}|${sameMeaning(relationLabel(link.relation, "in"))}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ relation: link.relation, direction: "in", ref: other.id, request: other })
    }
  }
  return out
}

/** `waits-for` → `Waits for`; `blocks` read from the other side → `Blocked by`. */
export function relationLabel(relation: string, direction: "out" | "in"): string {
  const r = norm(relation).replace(/[_-]+/g, " ")
  if (direction === "in") {
    const inverse: Record<string, string> = {
      blocks: "blocked by",
      "waits for": "blocks",
      "split from": "split into",
      "relates to": "relates to",
      "depends on": "needed by",
    }
    const label = inverse[r] ?? `${r} (from the other side)`
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : "Linked"
}

export function stageCountsOf(leaves: RequestLeaf[]): StageCounts {
  const counts = emptyStageCounts()
  for (const leaf of leaves) counts[leaf.stage ?? "none"] += 1
  return counts
}

export function pointsOf(leaves: RequestLeaf[]): number {
  return leaves.reduce((sum, l) => sum + (Number.isFinite(l.points) ? l.points : 0), 0)
}

/** Distinct repositories named in the request log, most active first. */
export function requestRepos(request: RequestDetail): string[] {
  const counts = new Map<string, number>()
  for (const entry of request.log) {
    if (!entry.repo) continue
    counts.set(entry.repo, (counts.get(entry.repo) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([repo]) => repo)
}

/** Ids of every epic, story and leaf in the request tree. */
export function treeItemIds(request: RequestDetail): Set<string> {
  const ids = new Set<string>()
  for (const epic of request.epics) {
    ids.add(epic.id)
    for (const leaf of epic.leaves) ids.add(leaf.id)
    for (const story of epic.stories) {
      ids.add(story.id)
      for (const leaf of story.leaves) ids.add(leaf.id)
    }
  }
  return ids
}

/** Log entries, newest first. */
export function sortedLog(request: RequestDetail) {
  return [...request.log].sort((a, b) => b.at.localeCompare(a.at))
}

/** Latest log timestamp, or "" without a log. */
export function lastLogAt(request: RequestDetail): string {
  return sortedLog(request)[0]?.at ?? ""
}

export type ForecastRead =
  | { kind: "shipped"; day: string; committed: string; daysLate: number | null }
  | { kind: "closed" }
  | { kind: "unsized"; committed: string }
  | { kind: "no-pace"; committed: string; remaining: number }
  | { kind: "done-remaining"; committed: string }
  | {
      kind: "dated"
      committed: string
      likely: string
      early: string
      late: string
      remaining: number
      /** Likely date is after the committed one. */
      atRisk: boolean
      daysLate: number | null
    }

/** One reading of a request's dates, for the header and the list cards. */
export function readForecast(
  request: RequestDetail,
  forecast: RequestForecast | undefined
): ForecastRead {
  const committed = request.forecast
  if (request.status === "shipped") {
    const day = lastShippedDay(request)
    return {
      kind: "shipped",
      day,
      committed,
      daysLate: day && committed ? daysBetween(committed, day) : null,
    }
  }
  if (request.status === "shelved" || request.status === "cancelled") {
    return { kind: "closed" }
  }
  if (request.leafCount === 0 || allLeaves(request).length === 0) {
    return { kind: "unsized", committed }
  }
  const remaining = forecast?.remainingPoints ?? 0
  if (remaining === 0) return { kind: "done-remaining", committed }
  if (!forecast?.likely) return { kind: "no-pace", committed, remaining }
  const daysLate = committed ? daysBetween(committed, forecast.likely) : null
  return {
    kind: "dated",
    committed,
    likely: forecast.likely,
    early: forecast.early,
    late: forecast.late,
    remaining,
    atRisk: daysLate != null && daysLate > 0,
    daysLate,
  }
}

/** Groups on the Requests list, in display order. */
export const REQUEST_GROUPS: {
  key: string
  title: string
  statuses: RequestStatus[]
}[] = [
  { key: "building", title: "Being built", statuses: ["building"] },
  { key: "ready", title: "Backlog", statuses: ["ready"] },
  { key: "proposed", title: "Proposed", statuses: ["proposed"] },
  { key: "shipped", title: "Shipped", statuses: ["shipped"] },
  { key: "closed", title: "Shelved and cancelled", statuses: ["shelved", "cancelled"] },
]

export function openQuestionCount(request: Pick<RequestDetail, "openQuestions">): number {
  return request.openQuestions.filter((q) => !q.checked).length
}
