import type { WorklogEntry } from "./worklog"

export type WorkActivityEvent = {
  /** Stable event identifier used to deduplicate repeated snapshots. */
  id: string
  actor: string
  itemId: string
  itemTitle: string
  path: string
  summary: string
  started: string
  ended: string
  /** ISO timestamp for when this client received the event. */
  receivedAt: string
}

export type WorkPresenceCard = {
  id: string
  actor: string
  summary: string
  /** Complete summary shown when the compact card is opened. */
  fullSummary?: string
  generatedAt: string
  sourceEventIds?: readonly string[]
  status?: "ready" | "generating"
}

export const WORK_ACTIVITY_MAX_VISIBLE = 3
export const WORK_PRESENCE_MAX_VISIBLE = 3

/** Map leaf work-log rows into floating feed events, oldest first. */
export function worklogEntriesToActivityEvents(
  entries: readonly WorklogEntry[],
): WorkActivityEvent[] {
  return [...entries]
    .slice()
    .reverse()
    .map((entry) => ({
      id: entry.key,
      actor: entry.actor,
      itemId: entry.itemId,
      itemTitle: entry.itemTitle,
      path: entry.filePath,
      summary: entry.summary,
      started: entry.started,
      ended: entry.ended,
      receivedAt: entry.ended || entry.started,
    }))
}
