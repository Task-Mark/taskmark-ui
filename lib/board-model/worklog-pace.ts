import type { WorklogEntry } from "./worklog"

export const WORKLOG_PACE_LOOKBACK_DAYS = 10
export const WORKLOG_PACE_HISTORY_DAYS = 10
export const WORKLOG_PACE_ANNOYED_RATIO = 0.5
export const WORKLOG_PACE_HAPPY_RATIO = 0.7
export const WORKLOG_PACE_FLAME_RATIO = 0.8
export const WORKLOG_PACE_FLAME_HOUR = 17

export type WorklogPace = {
  today: number
  peak: number
  fill: number
}

export type WorklogPaceIcon = "zzz" | "smile" | "happy" | "annoyed" | "flame"

export type WorklogPaceDay = {
  day: string
  count: number
  icon: WorklogPaceIcon
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function startedDate(started: string): Date | null {
  const parsed = Date.parse(started)
  if (!Number.isFinite(parsed)) return null
  return new Date(parsed)
}

function localNoonDays(now: Date, lookbackDays: number): Date[] {
  const days: Date[] = []
  for (let offset = lookbackDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(now)
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - offset)
    days.push(day)
  }
  return days
}

function countByDay(
  entries: readonly Pick<WorklogEntry, "started">[],
  windowKeys?: Set<string>,
): Map<string, number> {
  const counts = new Map<string, number>()
  if (windowKeys) {
    for (const key of windowKeys) counts.set(key, 0)
  }
  for (const entry of entries) {
    const started = startedDate(entry.started)
    if (!started) continue
    const key = localDayKey(started)
    if (windowKeys && !windowKeys.has(key)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function peakOf(counts: Map<string, number>, keys?: Iterable<string>): number {
  let peak = 0
  const source = keys ?? counts.keys()
  for (const key of source) {
    const count = counts.get(key) ?? 0
    if (count > peak) peak = count
  }
  return peak
}

/** Busiest day on or before `dayKey`; used when the lookback window is idle. */
export function lastWorkedDayPeak(
  counts: Map<string, number>,
  dayKey: string,
): number {
  let latest = ""
  for (const key of counts.keys()) {
    if (key <= dayKey && key > latest) latest = key
  }
  return latest ? (counts.get(latest) ?? 0) : 0
}

function peakForWindow(
  allCounts: Map<string, number>,
  windowKeys: Iterable<string>,
  dayKey: string,
): number {
  const windowPeak = peakOf(allCounts, windowKeys)
  return windowPeak > 0 ? windowPeak : lastWorkedDayPeak(allCounts, dayKey)
}

export function dailyWorklogPace(
  entries: readonly Pick<WorklogEntry, "started">[],
  now: Date = new Date(),
  lookbackDays: number = WORKLOG_PACE_LOOKBACK_DAYS,
): WorklogPace {
  const todayKey = localDayKey(now)
  const days = localNoonDays(now, lookbackDays)
  const windowKeys = days.map(localDayKey)
  const allCounts = countByDay(entries)
  const today = allCounts.get(todayKey) ?? 0
  const peak = peakForWindow(allCounts, windowKeys, todayKey)
  const fill =
    peak > 0 ? Math.min(100, Math.max(0, (today / peak) * 100)) : 0
  return { today, peak, fill }
}

export function worklogPaceIcon(
  pace: Pick<WorklogPace, "today" | "peak">,
  now: Date = new Date(),
): WorklogPaceIcon {
  if (pace.peak <= 0) return "zzz"
  // A day with no work at all sleeps; annoyed is only for a day that fell
  // short of the peak, never for one that never started.
  if (pace.today <= 0) return "zzz"
  const ratio = pace.today / pace.peak
  const endOfDay = now.getHours() >= WORKLOG_PACE_FLAME_HOUR
  if (endOfDay && ratio >= WORKLOG_PACE_FLAME_RATIO) return "flame"
  if (endOfDay && ratio < WORKLOG_PACE_ANNOYED_RATIO) return "annoyed"
  if (ratio >= WORKLOG_PACE_HAPPY_RATIO) return "happy"
  return "smile"
}

/**
 * Oldest → newest, including today. Each day is scored against the peak known
 * on that day (its own trailing lookback window), never against later records.
 * Past days use end-of-day icon rules.
 */
export function dailyWorklogHistory(
  entries: readonly Pick<WorklogEntry, "started">[],
  now: Date = new Date(),
  historyDays: number = WORKLOG_PACE_HISTORY_DAYS,
  lookbackDays: number = WORKLOG_PACE_LOOKBACK_DAYS,
): WorklogPaceDay[] {
  const todayKey = localDayKey(now)
  const spanDays = localNoonDays(now, lookbackDays + historyDays - 1)
  const spanKeys = spanDays.map(localDayKey)
  const allCounts = countByDay(entries)
  const endOfDay = new Date(now)
  endOfDay.setHours(WORKLOG_PACE_FLAME_HOUR, 0, 0, 0)

  const historyStart = spanKeys.length - historyDays
  return spanKeys.slice(historyStart).map((key, index) => {
    const endIndex = historyStart + index
    const startIndex = Math.max(0, endIndex - lookbackDays + 1)
    const windowKeys = spanKeys.slice(startIndex, endIndex + 1)
    const peak = peakForWindow(allCounts, windowKeys, key)
    const count = allCounts.get(key) ?? 0
    const at = key === todayKey ? now : endOfDay
    return {
      day: key,
      count,
      icon: worklogPaceIcon({ today: count, peak }, at),
    }
  })
}
