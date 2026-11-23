import {
  addDays,
  allLeaves,
  daysBetween,
  forecastRequests,
  isOpenRequest,
  lastShippedDay,
  mondayOf,
  remainingPoints,
  shippedDay,
  shippedPace,
  type Pace,
  type RequestForecast,
} from "./request-forecast"
import type {
  RequestBoardData,
  RequestDetail,
  RequestStatus,
} from "./request-types"

/**
 * Numbers for the Client status screen. Everything here counts only what
 * reached `main`; work on feature branches or in `quality` shows up as "in
 * progress", never as shipped.
 */

export const STATUS_PERIODS = ["4w", "12w", "all"] as const
export type StatusPeriod = (typeof STATUS_PERIODS)[number]
export const DEFAULT_STATUS_PERIOD: StatusPeriod = "12w"

export const STATUS_PERIOD_LABELS: Record<StatusPeriod, string> = {
  "4w": "4 weeks",
  "12w": "12 weeks",
  all: "All time",
}

const PERIOD_WEEKS: Record<Exclude<StatusPeriod, "all">, number> = {
  "4w": 4,
  "12w": 12,
}

/** Furthest the burn-up looks ahead of today, in weeks. */
export const BURNUP_MAX_AHEAD_WEEKS = 52

export function parseStatusPeriod(value: string | null | undefined): StatusPeriod {
  const v = (value ?? "").trim().toLowerCase()
  return (STATUS_PERIODS as readonly string[]).includes(v)
    ? (v as StatusPeriod)
    : DEFAULT_STATUS_PERIOD
}

/** Requests that still count towards the scope (not cancelled or shelved). */
export function isCountedRequest(request: Pick<RequestDetail, "status">): boolean {
  return request.status !== "cancelled" && request.status !== "shelved"
}

function isClosedLeafStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === "cancelled" || s === "shelved"
}

/** First Monday of the period. For `all`, the week of the first shipped task. */
export function periodStart(data: RequestBoardData, period: StatusPeriod): string {
  const today = data.asOf.slice(0, 10)
  const currentWeek = mondayOf(today)
  if (period !== "all") return addDays(currentWeek, -7 * (PERIOD_WEEKS[period] - 1))
  let first = ""
  for (const request of data.requests) {
    if (!isCountedRequest(request)) continue
    for (const leaf of allLeaves(request)) {
      const day = shippedDay(leaf)
      if (day && (!first || day < first)) first = day
    }
  }
  return first ? mondayOf(first) : currentWeek
}

export type ShippedEntry =
  | {
      kind: "request"
      id: string
      title: string
      day: string
      shippedLeaves: number
      leafCount: number
      points: number
    }
  | {
      kind: "task"
      id: string
      title: string
      day: string
      points: number
      requestId: string
      requestTitle: string
    }

export type BuildingRequest = {
  request: RequestDetail
  forecast: RequestForecast | null
  /** Any log entry dated today (pushes, merges, releases). */
  activeToday: boolean
}

export type QueuedRequest = {
  request: RequestDetail
  forecast: RequestForecast | null
}

export type BurnupPoint = { day: string; points: number }

export type Burnup = {
  /** First day on the x axis (Monday). */
  start: string
  today: string
  /** Last day on the x axis. */
  end: string
  /** Cumulative shipped points on main, oldest first, ending today. */
  shipped: BurnupPoint[]
  /** Shipped points before the period began. */
  shippedBefore: number
  shippedTotal: number
  /** Current total scope; there is no scope history, so it is drawn flat. */
  scope: number
  remaining: number
  /** Dates the remaining scope lands at the fast, median and slow pace. */
  early: string
  likely: string
  late: string
}

export type ClientStatus = {
  period: StatusPeriod
  start: string
  today: string
  pace: Pace
  forecasts: Map<string, RequestForecast>
  shippedPoints: number
  shippedItems: number
  inDevelopment: number
  inTesting: number
  leftPoints: number
  leftItems: number
  openRequests: number
  /** Building request with the earliest likely date. */
  nextLanding: { request: RequestDetail; forecast: RequestForecast } | null
  burnup: Burnup
  now: BuildingRequest[]
  next: QueuedRequest[]
  shipped: ShippedEntry[]
  lastActivity: string
}

const QUEUE_ORDER: RequestStatus[] = ["building", "ready", "proposed"]

function byForecast(
  forecasts: Map<string, RequestForecast>
): (a: RequestDetail, b: RequestDetail) => number {
  return (a, b) => {
    const byStatus = QUEUE_ORDER.indexOf(a.status) - QUEUE_ORDER.indexOf(b.status)
    if (byStatus !== 0) return byStatus
    const da = forecasts.get(a.id)?.likely || a.forecast || "9999"
    const db = forecasts.get(b.id)?.likely || b.forecast || "9999"
    return da.localeCompare(db) || a.title.localeCompare(b.title)
  }
}

function paceDate(today: string, remaining: number, perWeek: number): string {
  if (remaining <= 0) return today
  return perWeek > 0 ? addDays(today, (remaining / perWeek) * 7) : ""
}

export function buildClientStatus(
  data: RequestBoardData,
  periodParam: string | null | undefined
): ClientStatus {
  const period = parseStatusPeriod(periodParam)
  const today = data.asOf.slice(0, 10)
  const start = periodStart(data, period)
  const pace = shippedPace(data)
  const forecasts = forecastRequests(data, pace)
  const counted = data.requests.filter(isCountedRequest)

  let shippedPoints = 0
  let shippedItems = 0
  let inDevelopment = 0
  let inTesting = 0
  let shippedTotal = 0
  let shippedBefore = 0
  let scopeRemaining = 0
  const byDay = new Map<string, number>()
  const shipped: ShippedEntry[] = []

  for (const request of counted) {
    scopeRemaining += remainingPoints(request)
    const requestShippedInPeriod =
      request.status === "shipped" && lastShippedDay(request) >= start
    for (const leaf of allLeaves(request)) {
      const day = shippedDay(leaf)
      if (day) {
        if (day > today) continue
        shippedTotal += leaf.points
        byDay.set(day, (byDay.get(day) ?? 0) + leaf.points)
        if (day < start) {
          shippedBefore += leaf.points
        } else {
          shippedPoints += leaf.points
          shippedItems += 1
          if (!requestShippedInPeriod) {
            shipped.push({
              kind: "task",
              id: leaf.id,
              title: leaf.title,
              day,
              points: leaf.points,
              requestId: request.id,
              requestTitle: request.title,
            })
          }
        }
        continue
      }
      if (isClosedLeafStatus(leaf.status)) continue
      if (leaf.stage === "development") inDevelopment += 1
      if (leaf.stage === "testing") inTesting += 1
    }
    if (requestShippedInPeriod) {
      shipped.push({
        kind: "request",
        id: request.id,
        title: request.title,
        day: lastShippedDay(request),
        shippedLeaves: request.shippedLeafCount,
        leafCount: request.leafCount,
        points: request.shippedPoints,
      })
    }
  }
  shipped.sort((a, b) => b.day.localeCompare(a.day) || a.title.localeCompare(b.title))

  const open = data.requests.filter(isOpenRequest)
  let leftPoints = 0
  let leftItems = 0
  for (const request of open) {
    for (const leaf of allLeaves(request)) {
      if (leaf.stage === "production" || isClosedLeafStatus(leaf.status)) continue
      leftPoints += leaf.points
      leftItems += 1
    }
  }

  const sort = byForecast(forecasts)
  const building = open.filter((r) => r.status === "building").sort(sort)
  const queued = open.filter((r) => r.status !== "building").sort(sort)

  let nextLanding: ClientStatus["nextLanding"] = null
  for (const request of building) {
    const forecast = forecasts.get(request.id)
    if (!forecast?.likely) continue
    if (!nextLanding || forecast.likely < nextLanding.forecast.likely) {
      nextLanding = { request, forecast }
    }
  }

  // Cumulative shipped points at the end of each week, then today.
  const series: BurnupPoint[] = [{ day: start, points: shippedBefore }]
  const days = [...byDay.keys()].filter((d) => d >= start).sort()
  let running = shippedBefore
  let cursor = 0
  for (let week = start; week <= today; week = addDays(week, 7)) {
    const weekEnd = addDays(week, 7)
    while (cursor < days.length && days[cursor] < weekEnd) {
      running += byDay.get(days[cursor]) ?? 0
      cursor += 1
    }
    const day = weekEnd > today ? today : weekEnd
    if (day !== series[series.length - 1].day) series.push({ day, points: running })
  }

  const remaining = scopeRemaining
  const early = paceDate(today, remaining, pace.fastPointsPerWeek)
  const likely = paceDate(today, remaining, pace.pointsPerWeek)
  const late = paceDate(today, remaining, pace.slowPointsPerWeek)
  const maxEnd = addDays(today, 7 * BURNUP_MAX_AHEAD_WEEKS)
  const target = late || (pace.pointsPerWeek > 0 ? maxEnd : today)
  let end = target > maxEnd ? maxEnd : target
  // Leave room after today so the forecast is visible.
  const minEnd = addDays(today, Math.max(14, Math.round(daysBetween(start, today) / 4)))
  if (end < minEnd) end = minEnd

  const lastActivity =
    data.requests
      .flatMap((r) => r.log.map((e) => e.at.slice(0, 10)))
      .filter((d) => d && d <= today)
      .sort()
      .at(-1) ?? ""

  return {
    period,
    start,
    today,
    pace,
    forecasts,
    shippedPoints,
    shippedItems,
    inDevelopment,
    inTesting,
    leftPoints,
    leftItems,
    openRequests: open.length,
    nextLanding,
    burnup: {
      start,
      today,
      end,
      shipped: series,
      shippedBefore,
      shippedTotal,
      scope: shippedTotal + scopeRemaining,
      remaining,
      early,
      likely,
      late,
    },
    now: building.map((request) => ({
      request,
      forecast: forecasts.get(request.id) ?? null,
      activeToday: request.log.some((e) => e.at.slice(0, 10) === today),
    })),
    next: queued.map((request) => ({
      request,
      forecast: forecasts.get(request.id) ?? null,
    })),
    shipped,
    lastActivity,
  }
}

/** Round up to a tidy axis step (1, 2, 2.5, 3, 4, 5, 6 or 8 times a power of ten). */
export function niceCeil(value: number): number {
  if (value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const base = 10 ** exp
  for (const step of [1, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (value <= step * base) return step * base
  }
  return 10 * base
}
