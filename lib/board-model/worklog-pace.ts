import type { WorklogEntry } from "./worklog"

export const WORKLOG_PACE_LOOKBACK_DAYS = 30
export const WORKLOG_PACE_ANNOYED_RATIO = 0.5
export const WORKLOG_PACE_HAPPY_RATIO = 0.7
export const WORKLOG_PACE_FLAME_RATIO = 0.8
export const WORKLOG_PACE_FLAME_HOUR = 17

export type WorklogPace = {
  today: number
  peak: number
  fill: number
}

export type WorklogPaceIcon = "sing" | "smile" | "happy" | "annoyed" | "flame"

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

export function dailyWorklogPace(
  entries: readonly Pick<WorklogEntry, "started">[],
  now: Date = new Date(),
  lookbackDays: number = WORKLOG_PACE_LOOKBACK_DAYS,
): WorklogPace {
  const todayKey = localDayKey(now)
  const windowKeys = new Set<string>()
  for (let offset = 0; offset < lookbackDays; offset += 1) {
    const day = new Date(now)
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() - offset)
    windowKeys.add(localDayKey(day))
  }

  const counts = new Map<string, number>()
  for (const key of windowKeys) counts.set(key, 0)

  for (const entry of entries) {
    const started = startedDate(entry.started)
    if (!started) continue
    const key = localDayKey(started)
    if (!windowKeys.has(key)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const today = counts.get(todayKey) ?? 0
  let peak = 0
  for (const count of counts.values()) {
    if (count > peak) peak = count
  }

  const fill =
    peak > 0 ? Math.min(100, Math.max(0, (today / peak) * 100)) : 0

  return { today, peak, fill }
}

export function worklogPaceIcon(
  pace: WorklogPace,
  now: Date = new Date(),
): WorklogPaceIcon {
  const ratio = pace.peak > 0 ? pace.today / pace.peak : 0
  const endOfDay = now.getHours() >= WORKLOG_PACE_FLAME_HOUR
  if (endOfDay && ratio >= WORKLOG_PACE_FLAME_RATIO) return "flame"
  if (endOfDay && ratio < WORKLOG_PACE_ANNOYED_RATIO) return "annoyed"
  if (pace.today <= 0) return "sing"
  if (ratio >= WORKLOG_PACE_HAPPY_RATIO) return "happy"
  return "smile"
}
