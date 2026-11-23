import { addDays, allLeaves } from "./request-forecast"
import type {
  RequestBoardData,
  RequestLogEntry,
  RequestLogKind,
} from "./request-types"
import { parseStatusPeriod, periodStart, type StatusPeriod } from "./client-status"
import type { Stage } from "./stage"

/**
 * Numbers and rows for the Activity screen. A session is one row of a task's
 * `## Work log` table (Session | Actor | Started | Ended | Summary). Rows that
 * share an actor and a start time are one session that touched several tasks
 * (agents log a batch that way), so they are merged.
 *
 * Every time is read and shown in UTC so server and client agree.
 */

/** Most day groups shown at once; older days are left out with a note. */
export const ACTIVITY_MAX_DAYS = 60

/** An open row counts as running only if it started this recently. */
const RUNNING_WINDOW_MS = 24 * 60 * 60 * 1000

/** Longer than this is a typo in the table, not a session. */
const MAX_SESSION_MS = 24 * 60 * 60 * 1000

/** Request log kinds shown between the sessions. */
export const ACTIVITY_LOG_KINDS = ["merge", "promote", "release", "decision"] as const
export type ActivityLogKind = (typeof ACTIVITY_LOG_KINDS)[number]

export type ActivitySessionTask = {
  id: string
  kind: "task" | "bug"
  title: string
  stage: Stage | null
  requestId: string
  requestTitle: string
  summary: string
}

export type ActivitySession = {
  type: "session"
  key: string
  /** Person who ran the session, or "" when the table does not say. */
  actor: string
  /** ISO timestamp (UTC). */
  started: string
  /** ISO timestamp (UTC), or "" when the row has no end. */
  ended: string
  /** YYYY-MM-DD (UTC) of the start. */
  day: string
  /** Length in minutes, or null when the end is missing or unusable. */
  minutes: number | null
  running: boolean
  tasks: ActivitySessionTask[]
}

export type ActivityEvent = {
  type: "event"
  key: string
  kind: ActivityLogKind
  /** ISO timestamp (UTC). */
  at: string
  day: string
  title: string
  summary: string
  person: string
  requestId: string
  requestTitle: string
  fromBranch: string
  toBranch: string
  targets: string[]
}

export type ActivityEntry = ActivitySession | ActivityEvent

export type ActivityDay = {
  day: string
  /** Newest first. */
  entries: ActivityEntry[]
}

export type ActivityFacet = { id: string; label: string; count: number }

export type ActivityStats = {
  sessions: number
  /** Minutes worked, with overlapping sessions of one person counted once. */
  minutes: number
  tasks: number
  commits: number
  people: number
  /** Sessions with no usable end, left out of the hours. */
  openSessions: number
}

export type Activity = {
  period: StatusPeriod
  /** First day counted (YYYY-MM-DD), or "" for all time. */
  start: string
  today: string
  stats: ActivityStats
  running: ActivitySession[]
  /** Newest first, at most `ACTIVITY_MAX_DAYS`. */
  days: ActivityDay[]
  /** Days with activity left out by the cap. */
  hiddenDays: number
  /** First day shown when days were left out. */
  oldestShownDay: string
  people: ActivityFacet[]
  requests: ActivityFacet[]
  /** The board has at least one work log row, in any period. */
  hasWorkLog: boolean
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/

/** True for strings like `2026-07-28T07:23:05Z` (used to drop shifted actors). */
export function looksLikeTimestamp(value: string): boolean {
  return ISO_RE.test(value.trim())
}

/** Milliseconds since epoch, or NaN when the cell is not a date. */
function parseTime(value: string): number {
  const v = value.trim()
  if (!looksLikeTimestamp(v)) return NaN
  const withZone = /[T ]\d{2}:\d{2}/.test(v) && !/(Z|[+-]\d{2}:?\d{2})$/.test(v) ? `${v}Z` : v
  return Date.parse(withZone.replace(" ", "T"))
}

function isoUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z")
}

/** Reference "now" for the board: `asOf` with its time, else the end of that day. */
function boardNow(asOf: string): number {
  const exact = /T\d{2}:\d{2}/.test(asOf) ? parseTime(asOf) : NaN
  if (!Number.isNaN(exact)) return exact
  const day = Date.parse(`${asOf.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(day) ? Date.now() : day + 24 * 60 * 60 * 1000 - 1
}

function cleanActor(actor: string): string {
  const a = actor.trim()
  if (!a || looksLikeTimestamp(a) || /^[-–—]+$/.test(a)) return ""
  return a
}

export function parseActivityPeriod(value: string | null | undefined): StatusPeriod {
  return parseStatusPeriod(value)
}

/** `95` → `1h 35m`, `40` → `40m`, `0` → `0m`. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Hours for a KPI: `1.5`, `12`, `0.3`. */
export function formatHours(minutes: number): string {
  const h = minutes / 60
  if (h >= 10) return String(Math.round(h))
  return String(Number(h.toFixed(1)))
}

/** `HH:MM` (UTC) of an ISO timestamp. */
export function timeOf(iso: string): string {
  return iso.length >= 16 ? iso.slice(11, 16) : ""
}

/** Total length of a set of intervals, overlaps counted once. */
function unionMs(intervals: [number, number][]): number {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  let total = 0
  let curStart = NaN
  let curEnd = NaN
  for (const [s, e] of sorted) {
    if (Number.isNaN(curStart) || s > curEnd) {
      if (!Number.isNaN(curStart)) total += curEnd - curStart
      curStart = s
      curEnd = e
    } else if (e > curEnd) {
      curEnd = e
    }
  }
  if (!Number.isNaN(curStart)) total += curEnd - curStart
  return total
}

function isActivityLogKind(kind: RequestLogKind): kind is ActivityLogKind {
  return (ACTIVITY_LOG_KINDS as readonly string[]).includes(kind)
}

function sortFacets(map: Map<string, ActivityFacet>): ActivityFacet[] {
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function bump(map: Map<string, ActivityFacet>, id: string, label: string): void {
  const f = map.get(id)
  if (f) f.count += 1
  else map.set(id, { id, label, count: 1 })
}

type RawSession = {
  key: string
  actor: string
  startMs: number
  endMs: number
  open: boolean
  tasks: ActivitySessionTask[]
}

export function buildActivity(data: RequestBoardData, periodParam: string | null): Activity {
  const period = parseActivityPeriod(periodParam)
  const today = data.asOf.slice(0, 10)
  const start = period === "all" ? "" : periodStart(data, period)
  const startMs = start ? Date.parse(`${start}T00:00:00Z`) : -Infinity
  const now = boardNow(data.asOf)

  const sessions = new Map<string, RawSession>()
  const commitShas = new Set<string>()
  const events: ActivityEvent[] = []
  let hasWorkLog = false

  for (const request of data.requests) {
    for (const leaf of allLeaves(request)) {
      for (const row of leaf.workLog) {
        hasWorkLog = true
        // Some tables have the start shifted into the Actor column.
        const rawStart = parseTime(row.started)
        const begin = Number.isNaN(rawStart) ? parseTime(row.actor) : rawStart
        if (Number.isNaN(begin) || begin < startMs) continue
        const actor = cleanActor(row.actor)
        const endRaw = parseTime(row.ended)
        const usableEnd = !Number.isNaN(endRaw) && endRaw >= begin && endRaw - begin <= MAX_SESSION_MS
        const key = `${actor}|${begin}`
        const task: ActivitySessionTask = {
          id: leaf.id,
          kind: leaf.kind,
          title: leaf.title,
          stage: leaf.stage,
          requestId: request.id,
          requestTitle: request.title,
          summary: row.summary.trim(),
        }
        const existing = sessions.get(key)
        if (existing) {
          if (!existing.tasks.some((t) => t.id === task.id && t.summary === task.summary)) {
            existing.tasks.push(task)
          }
          if (usableEnd && (existing.open || endRaw > existing.endMs)) {
            existing.endMs = endRaw
            existing.open = false
          }
        } else {
          sessions.set(key, {
            key,
            actor,
            startMs: begin,
            endMs: usableEnd ? endRaw : NaN,
            open: !usableEnd,
            tasks: [task],
          })
        }
      }
      for (const commit of leaf.commits) {
        const at = parseTime(commit.date)
        if (Number.isNaN(at) || at < startMs) continue
        commitShas.add(commit.sha || `${leaf.id}|${commit.date}|${commit.message}`)
      }
    }
    for (const entry of request.log) {
      const ev = toEvent(entry, request.title, startMs)
      if (ev) events.push(ev)
    }
  }

  const all: ActivitySession[] = []
  const running: ActivitySession[] = []
  const intervalsByActor = new Map<string, [number, number][]>()
  const taskIds = new Set<string>()
  const peopleMap = new Map<string, ActivityFacet>()
  const requestMap = new Map<string, ActivityFacet>()
  let openSessions = 0

  for (const raw of sessions.values()) {
    const isRunning = raw.open && raw.startMs <= now && now - raw.startMs <= RUNNING_WINDOW_MS
    const session: ActivitySession = {
      type: "session",
      key: raw.key,
      actor: raw.actor,
      started: isoUtc(raw.startMs),
      ended: raw.open ? "" : isoUtc(raw.endMs),
      day: isoUtc(raw.startMs).slice(0, 10),
      minutes: raw.open ? null : Math.round((raw.endMs - raw.startMs) / 60000),
      running: isRunning,
      tasks: raw.tasks,
    }
    all.push(session)
    if (isRunning) running.push(session)
    if (raw.open) openSessions += 1
    else {
      const list = intervalsByActor.get(raw.actor) ?? []
      list.push([raw.startMs, raw.endMs])
      intervalsByActor.set(raw.actor, list)
    }
    for (const t of raw.tasks) taskIds.add(t.id)
    if (raw.actor) bump(peopleMap, raw.actor, raw.actor)
    for (const requestId of new Set(raw.tasks.map((t) => t.requestId))) {
      const title = raw.tasks.find((t) => t.requestId === requestId)?.requestTitle ?? requestId
      bump(requestMap, requestId, title)
    }
  }

  let workedMs = 0
  for (const list of intervalsByActor.values()) workedMs += unionMs(list)

  const entries: ActivityEntry[] = [...all, ...events]
  entries.sort((a, b) => entryTime(b).localeCompare(entryTime(a)))
  const byDay = new Map<string, ActivityEntry[]>()
  for (const entry of entries) {
    const list = byDay.get(entry.day) ?? []
    list.push(entry)
    byDay.set(entry.day, list)
  }
  const allDays = [...byDay.entries()].map(([day, list]) => ({ day, entries: list }))
  const days = allDays.slice(0, ACTIVITY_MAX_DAYS)

  running.sort((a, b) => b.started.localeCompare(a.started))

  return {
    period,
    start,
    today,
    stats: {
      sessions: all.length,
      minutes: Math.round(workedMs / 60000),
      tasks: taskIds.size,
      commits: commitShas.size,
      people: peopleMap.size,
      openSessions,
    },
    running,
    days,
    hiddenDays: allDays.length - days.length,
    oldestShownDay: days.length > 0 ? days[days.length - 1].day : "",
    people: sortFacets(peopleMap),
    requests: sortFacets(requestMap),
    hasWorkLog,
  }
}

function entryTime(entry: ActivityEntry): string {
  return entry.type === "session" ? entry.started : entry.at
}

function toEvent(entry: RequestLogEntry, requestTitle: string, startMs: number): ActivityEvent | null {
  if (!isActivityLogKind(entry.kind)) return null
  const at = parseTime(entry.at)
  if (Number.isNaN(at) || at < startMs) return null
  const iso = isoUtc(at)
  return {
    type: "event",
    key: `event|${entry.requestId}|${entry.id}`,
    kind: entry.kind,
    at: iso,
    day: iso.slice(0, 10),
    title: entry.title.trim(),
    summary: entry.summary.trim(),
    person: entry.person?.name?.trim() ?? "",
    requestId: entry.requestId,
    requestTitle,
    fromBranch: entry.fromBranch,
    toBranch: entry.toBranch,
    targets: entry.targets,
  }
}

/** Day heading: `Today`, `Yesterday`, else the weekday and date. */
export function dayHeading(day: string, today: string): string {
  if (day === today) return "Today"
  if (day === addDays(today, -1)) return "Yesterday"
  const d = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return day
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    d.getUTCDay()
  ]
  return weekday
}

