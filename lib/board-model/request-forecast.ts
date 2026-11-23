import type {
  RequestBoardData,
  RequestDetail,
  RequestLeaf,
  RequestStatus,
} from "./request-types"

/**
 * Pace and forecast from what reached `main`.
 *
 * Only shipped work counts: a task done on a feature branch or waiting in
 * `quality` does not move the client's date. Weekly buckets start on Monday
 * (UTC). The pace is the median of the last {@link PACE_WEEKS} full weeks, and
 * the range uses the slower and faster quartiles of the same weeks, so one
 * big week does not pull the date in.
 */

export const PACE_WEEKS = 6
const DAY_MS = 86_400_000

export type WeekBucket = {
  /** Monday, YYYY-MM-DD (UTC) */
  week: string
  points: number
  items: number
}

export type Pace = {
  /** Median shipped points per week over the recent full weeks. */
  pointsPerWeek: number
  slowPointsPerWeek: number
  fastPointsPerWeek: number
  /** Full weeks the pace was read from. */
  weeks: WeekBucket[]
}

export type RequestForecast = {
  requestId: string
  remainingPoints: number
  /** Date set in the brief, if any. */
  committed: string
  /** Likely date (median pace), YYYY-MM-DD, or "" without a pace. */
  likely: string
  /** Late end of the range (slow pace). */
  late: string
  /** Early end of the range (fast pace). */
  early: string
  shipped: boolean
}

export function toDay(iso: string): string {
  return iso ? iso.slice(0, 10) : ""
}

export function mondayOf(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ""
  const offset = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - offset * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`)
  return new Date(d.getTime() + Math.round(days) * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / DAY_MS)
}

export function allLeaves(request: RequestDetail): RequestLeaf[] {
  return request.epics.flatMap((e) => [
    ...e.leaves,
    ...e.stories.flatMap((s) => s.leaves),
  ])
}

/** Day a leaf counts as shipped: when it reached main, else when it was done. */
export function shippedDay(leaf: RequestLeaf): string {
  if (leaf.stage !== "production") return ""
  return toDay(leaf.shippedAt || leaf.completedAt)
}

/** Shipped points per week, oldest first, with empty weeks filled in. */
export function weeklyShipped(
  data: RequestBoardData,
  opts: { from?: string; to?: string } = {}
): WeekBucket[] {
  const byWeek = new Map<string, WeekBucket>()
  let first = ""
  for (const request of data.requests) {
    for (const leaf of allLeaves(request)) {
      const day = shippedDay(leaf)
      if (!day) continue
      const week = mondayOf(day)
      if (!week) continue
      if (!first || week < first) first = week
      const bucket = byWeek.get(week) ?? { week, points: 0, items: 0 }
      bucket.points += leaf.points
      bucket.items += 1
      byWeek.set(week, bucket)
    }
  }
  const start = mondayOf(opts.from || first || data.asOf)
  const end = mondayOf(opts.to || data.asOf)
  const out: WeekBucket[] = []
  if (!start || !end) return out
  for (let w = start; w <= end; w = addDays(w, 7)) {
    out.push(byWeek.get(w) ?? { week: w, points: 0, items: 0 })
  }
  return out
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** Pace from the last full weeks before the current one. */
export function shippedPace(data: RequestBoardData, weeks = PACE_WEEKS): Pace {
  const currentWeek = mondayOf(data.asOf)
  const series = weeklyShipped(data, {
    from: addDays(currentWeek, -7 * weeks),
    to: addDays(currentWeek, -7),
  })
  const recent = series.slice(-weeks)
  const sorted = recent.map((w) => w.points).sort((a, b) => a - b)
  return {
    pointsPerWeek: quantile(sorted, 0.5),
    slowPointsPerWeek: quantile(sorted, 0.25),
    fastPointsPerWeek: quantile(sorted, 0.75),
    weeks: recent,
  }
}

const OPEN_STATUSES: ReadonlySet<RequestStatus> = new Set([
  "proposed",
  "ready",
  "building",
])

export function isOpenRequest(request: Pick<RequestDetail, "status">): boolean {
  return OPEN_STATUSES.has(request.status)
}

export function remainingPoints(request: RequestDetail): number {
  return allLeaves(request)
    .filter((l) => l.stage !== "production" && !isClosedStatus(l.status))
    .reduce((sum, l) => sum + l.points, 0)
}

function isClosedStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === "cancelled" || s === "shelved"
}

/**
 * Forecast each open request in queue order: building first, then ready,
 * then proposed; within each, by committed date (or, without one, by when the
 * request would land on its own). A request finishes when the pace has
 * covered its own remaining points plus everything queued before it.
 */
export function forecastRequests(
  data: RequestBoardData,
  pace: Pace = shippedPace(data)
): Map<string, RequestForecast> {
  const out = new Map<string, RequestForecast>()
  const order: RequestStatus[] = ["building", "ready", "proposed"]
  const at = (perWeek: number, points: number) =>
    perWeek > 0 ? addDays(data.asOf, (points / perWeek) * 7) : ""

  // Within a status, a request is queued by the date promised in its brief;
  // without one (e.g. maintenance), by when it would land on its own.
  const queueKey = (r: RequestDetail) =>
    r.forecast || at(pace.pointsPerWeek, remainingPoints(r)) || "9999"
  const queue = data.requests
    .filter(isOpenRequest)
    .sort((a, b) => {
      const byStatus = order.indexOf(a.status) - order.indexOf(b.status)
      if (byStatus !== 0) return byStatus
      return queueKey(a).localeCompare(queueKey(b)) || a.title.localeCompare(b.title)
    })

  let ahead = 0
  for (const request of queue) {
    const remaining = remainingPoints(request)
    // Proposed requests without tasks have no size yet: no date.
    const sized = request.leafCount > 0
    ahead += remaining
    out.set(request.id, {
      requestId: request.id,
      remainingPoints: remaining,
      committed: request.forecast,
      likely: sized ? at(pace.pointsPerWeek, ahead) : "",
      late: sized ? at(pace.slowPointsPerWeek, ahead) : "",
      early: sized ? at(pace.fastPointsPerWeek, ahead) : "",
      shipped: false,
    })
  }
  for (const request of data.requests) {
    if (out.has(request.id)) continue
    out.set(request.id, {
      requestId: request.id,
      remainingPoints: 0,
      committed: request.forecast,
      likely: "",
      late: "",
      early: "",
      shipped: request.status === "shipped",
    })
  }
  return out
}

/** Last day any leaf of the request reached main. */
export function lastShippedDay(request: RequestDetail): string {
  return allLeaves(request).map(shippedDay).filter(Boolean).sort().at(-1) ?? ""
}

/** First day any leaf of the request was started or shipped. */
export function firstActivityDay(request: RequestDetail): string {
  const days = allLeaves(request)
    .flatMap((l) => [toDay(l.startedAt), toDay(l.completedAt), shippedDay(l)])
    .filter(Boolean)
    .sort()
  return days[0] || toDay(request.created)
}
