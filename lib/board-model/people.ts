import {
  addDays,
  allLeaves,
  mondayOf,
  shippedDay,
  toDay,
} from "./request-forecast"
import {
  isCountedRequest,
  parseStatusPeriod,
  periodStart,
  type StatusPeriod,
} from "./client-status"
import type { RequestBoardData, RequestLeaf } from "./request-types"

/**
 * Numbers for the People screen.
 *
 * Shipped points are the points of tasks that reached `main` in the period,
 * credited to the task's resolvers (split evenly when there are several).
 * Tasks without resolvers go to "Unassigned". Sessions and hours come from
 * the `## Work log` rows, matched to a person by the Actor name; commits from
 * the `## Commits` rows, matched by Author. Names match case-insensitively.
 */

/** Longest a single session may count for; longer rows are clipped. */
const MAX_SESSION_MINUTES = 24 * 60

export type PersonRequest = {
  id: string
  title: string
  /** Shipped points credited to the person in this request. */
  points: number
}

export type PersonStats = {
  /** Normalised name, used to match resolvers, actors and authors. */
  key: string
  name: string
  shippedPoints: number
  /** Shipped tasks the person resolved (a shared task counts once for each). */
  shippedTasks: number
  /** Share of all shipped points in the period, 0..1. */
  share: number
  inTesting: number
  inDevelopment: number
  sessions: number
  minutes: number
  commits: number
  requests: PersonRequest[]
  /** Shipped points per week, aligned with {@link PeopleSummary.weeks}. */
  weekly: number[]
}

export type UnassignedStats = {
  shippedPoints: number
  shippedTasks: number
  share: number
  weekly: number[]
}

export type AgentSessionStats = {
  sessions: number
  minutes: number
  avgMinutes: number
  /** Distinct tasks with at least one session in the period. */
  tasksTouched: number
}

export type PeopleSummary = {
  period: StatusPeriod
  /** First Monday of the period. */
  start: string
  today: string
  /** Mondays from `start` to the current week, oldest first. */
  weeks: string[]
  /** Everyone with shipped work, work in progress, sessions or commits. Most shipped first. */
  people: PersonStats[]
  /** Shipped work without resolvers, or null when there is none. */
  unassigned: UnassignedStats | null
  shippedPoints: number
  shippedTasks: number
  agent: AgentSessionStats
}

export function personKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase()
}

/** Some work logs have a timestamp in the Actor column; those are not people. */
function isPersonName(name: string): boolean {
  const n = name.trim()
  if (!n) return false
  if (/^\d{4}-\d{2}-\d{2}/.test(n)) return false
  return true
}

function minutesBetween(started: string, ended: string): number {
  const a = Date.parse(started)
  const b = Date.parse(ended)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
  return Math.min((b - a) / 60_000, MAX_SESSION_MINUTES)
}

function isClosedLeaf(leaf: RequestLeaf): boolean {
  const s = leaf.status.toLowerCase()
  return s === "cancelled" || s === "shelved"
}

type Acc = PersonStats & {
  requestPoints: Map<string, PersonRequest>
  sessionKeys: Set<string>
  commitKeys: Set<string>
}

export function buildPeople(
  data: RequestBoardData,
  periodParam: string | null | undefined
): PeopleSummary {
  const period = parseStatusPeriod(periodParam)
  const today = toDay(data.asOf)
  const start = period === "all" ? allTimeStart(data) : periodStart(data, period)
  const weeks: string[] = []
  const end = mondayOf(today)
  if (start && end) {
    for (let w = start; w <= end; w = addDays(w, 7)) weeks.push(w)
  }
  const weekIndex = new Map(weeks.map((w, i) => [w, i]))
  const inPeriod = (day: string) => Boolean(day) && day >= start && day <= today

  const people = new Map<string, Acc>()
  const person = (rawName: string): Acc | null => {
    if (!isPersonName(rawName)) return null
    const key = personKey(rawName)
    let acc = people.get(key)
    if (!acc) {
      acc = {
        key,
        name: rawName.trim().replace(/\s+/g, " "),
        shippedPoints: 0,
        shippedTasks: 0,
        share: 0,
        inTesting: 0,
        inDevelopment: 0,
        sessions: 0,
        minutes: 0,
        commits: 0,
        requests: [],
        weekly: weeks.map(() => 0),
        requestPoints: new Map(),
        sessionKeys: new Set(),
        commitKeys: new Set(),
      }
      people.set(key, acc)
    }
    return acc
  }
  const touchRequest = (acc: Acc, id: string, title: string, points = 0) => {
    const entry = acc.requestPoints.get(id) ?? { id, title, points: 0 }
    entry.points += points
    acc.requestPoints.set(id, entry)
  }

  const unassigned: UnassignedStats = {
    shippedPoints: 0,
    shippedTasks: 0,
    share: 0,
    weekly: weeks.map(() => 0),
  }
  let shippedPoints = 0
  let shippedTasks = 0

  const agentSessions = new Map<string, number>()
  const tasksTouched = new Set<string>()

  for (const request of data.requests) {
    if (!isCountedRequest(request)) continue
    for (const leaf of allLeaves(request)) {
      const resolvers = leaf.resolvers.filter((r) => isPersonName(r.name))

      // Shipped in the period: credit the resolvers.
      const day = shippedDay(leaf)
      if (inPeriod(day)) {
        const wi = weekIndex.get(mondayOf(day))
        shippedPoints += leaf.points
        shippedTasks += 1
        if (resolvers.length === 0) {
          unassigned.shippedPoints += leaf.points
          unassigned.shippedTasks += 1
          if (wi !== undefined) unassigned.weekly[wi] += leaf.points
        } else {
          const seen = new Set<string>()
          const unique = resolvers.filter((r) => {
            const k = personKey(r.name)
            if (seen.has(k)) return false
            seen.add(k)
            return true
          })
          const share = leaf.points / unique.length
          for (const r of unique) {
            const acc = person(r.name)
            if (!acc) continue
            acc.shippedPoints += share
            acc.shippedTasks += 1
            if (wi !== undefined) acc.weekly[wi] += share
            touchRequest(acc, request.id, request.title, share)
          }
        }
      }

      // In progress right now: on a branch, not yet on main.
      if (
        (leaf.stage === "testing" || leaf.stage === "development") &&
        !isClosedLeaf(leaf)
      ) {
        for (const r of resolvers) {
          const acc = person(r.name)
          if (!acc) continue
          if (leaf.stage === "testing") acc.inTesting += 1
          else acc.inDevelopment += 1
          touchRequest(acc, request.id, request.title)
        }
      }

      // Sessions: one row per session per task; a session can span tasks.
      for (const row of leaf.workLog) {
        const startedDay = toDay(row.started)
        if (Number.isNaN(Date.parse(row.started)) || !inPeriod(startedDay)) continue
        const minutes = minutesBetween(row.started, row.ended)
        const actor = isPersonName(row.actor) ? personKey(row.actor) : ""
        const sessionKey = `${actor}|${row.started}|${row.ended}`
        if (!agentSessions.has(sessionKey)) agentSessions.set(sessionKey, minutes)
        tasksTouched.add(leaf.id)
        const acc = person(row.actor)
        if (!acc) continue
        if (!acc.sessionKeys.has(sessionKey)) {
          acc.sessionKeys.add(sessionKey)
          acc.sessions += 1
          acc.minutes += minutes
        }
        touchRequest(acc, request.id, request.title)
      }

      // Commits: the same commit can be listed on several tasks.
      for (const commit of leaf.commits) {
        if (!inPeriod(toDay(commit.date))) continue
        const acc = person(commit.author)
        if (!acc) continue
        const commitKey = `${commit.repo}|${commit.sha}`
        if (!acc.commitKeys.has(commitKey)) {
          acc.commitKeys.add(commitKey)
          acc.commits += 1
        }
        touchRequest(acc, request.id, request.title)
      }
    }
  }

  // Prefer the spelling resolvers use (it comes from git config).
  for (const request of data.requests) {
    for (const leaf of allLeaves(request)) {
      for (const r of leaf.resolvers) {
        const acc = people.get(personKey(r.name))
        if (acc) acc.name = r.name.trim().replace(/\s+/g, " ")
      }
    }
  }

  const list: PersonStats[] = [...people.values()]
    .map((acc) => ({
      key: acc.key,
      name: acc.name,
      shippedPoints: acc.shippedPoints,
      shippedTasks: acc.shippedTasks,
      share: shippedPoints > 0 ? acc.shippedPoints / shippedPoints : 0,
      inTesting: acc.inTesting,
      inDevelopment: acc.inDevelopment,
      sessions: acc.sessions,
      minutes: acc.minutes,
      commits: acc.commits,
      weekly: acc.weekly,
      requests: [...acc.requestPoints.values()].sort(
        (a, b) => b.points - a.points || a.title.localeCompare(b.title)
      ),
    }))
    .sort(
      (a, b) =>
        b.shippedPoints - a.shippedPoints ||
        b.sessions - a.sessions ||
        a.name.localeCompare(b.name)
    )

  const sessionMinutes = [...agentSessions.values()]
  const totalMinutes = sessionMinutes.reduce((s, m) => s + m, 0)

  return {
    period,
    start,
    today,
    weeks,
    people: list,
    unassigned:
      unassigned.shippedTasks > 0
        ? { ...unassigned, share: shippedPoints > 0 ? unassigned.shippedPoints / shippedPoints : 0 }
        : null,
    shippedPoints,
    shippedTasks,
    agent: {
      sessions: sessionMinutes.length,
      minutes: totalMinutes,
      avgMinutes: sessionMinutes.length > 0 ? totalMinutes / sessionMinutes.length : 0,
      tasksTouched: tasksTouched.size,
    },
  }
}

/** For `all`: the week of the first shipped task, session or commit. */
function allTimeStart(data: RequestBoardData): string {
  let first = periodStart(data, "all")
  for (const request of data.requests) {
    if (!isCountedRequest(request)) continue
    for (const leaf of allLeaves(request)) {
      const days = [
        ...leaf.workLog.map((r) => (Number.isNaN(Date.parse(r.started)) ? "" : toDay(r.started))),
        ...leaf.commits.map((c) => (Number.isNaN(Date.parse(c.date)) ? "" : toDay(c.date))),
      ]
      for (const day of days) {
        if (day && day < first) first = mondayOf(day)
      }
    }
  }
  return first
}

/** `95` → `1h 35m`, `40` → `40m`, `600` → `10h`. */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`
}

/** Hours with one decimal under 10, whole hours above. */
export function formatHours(minutes: number): string {
  const h = minutes / 60
  return h < 10 ? String(Number(h.toFixed(1))) : String(Math.round(h))
}

export function formatPoints(points: number): string {
  return String(Number(points.toFixed(1)))
}
